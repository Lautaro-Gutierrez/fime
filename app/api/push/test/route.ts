import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import webpush from "web-push";
import { clampDayToMonth } from "@/lib/credit-cards";
import { toISODate } from "@/lib/format";
import { CATEGORIES_BY_ID } from "@/lib/categories";
import type { ExpenseCategory } from "@/types/database";

export async function POST(req: Request) {
  try {
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY || "";
    const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@fime.app";

    if (!vapidPublic || !vapidPrivate) {
      return NextResponse.json({ error: "VAPID keys not configured en el servidor" }, { status: 500 });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all subscriptions for this user
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user.id);

    if (error || !subs || subs.length === 0) {
      return NextResponse.json({ error: "No subscriptions found" }, { status: 404 });
    }

    const payloadsToSend: { title: string; body: string; url: string }[] = [];
    const today = new Date();
    const todayISO = toISODate(today);
    const todayDay = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    // 1. Verificar vencimientos de Tarjetas
    const { data: cards } = await supabase
      .from("credit_cards")
      .select("*")
      .eq("user_id", user.id)
      .is("archived_at", null);

    if (cards) {
      for (const card of cards) {
        const expectedDueDay = clampDayToMonth(todayYear, todayMonth, card.due_day);
        if (expectedDueDay === todayDay) {
          payloadsToSend.push({
            title: "Vencimiento de Tarjeta",
            body: `¡Atención! Hoy vence tu tarjeta ${card.name}.`,
            url: "/config", // Redirigir a config (donde están las tarjetas) o dashboard
          });
        }
      }
    }

    // 2. Verificar Gastos Programados (donde la fecha == hoy)
    const { data: expenses } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", todayISO);

    if (expenses) {
      for (const exp of expenses) {
        // Normalizar el nombre en caso de typos viejos en BD y obtener la etiqueta limpia
        const normalizedName = exp.category === ("tarjeta_credit" as any) ? "tarjeta_credito" : exp.category;
        const categoryLabel = CATEGORIES_BY_ID[normalizedName as ExpenseCategory]?.label || exp.note || normalizedName;

        payloadsToSend.push({
          title: "Gasto Programado",
          body: `Hoy vence: ${exp.note ? exp.note : categoryLabel} por $${exp.amount}.`,
          url: "/gastos",
        });
      }
    }

    // Fallback si no hay notificaciones para hoy
    if (payloadsToSend.length === 0) {
      payloadsToSend.push({
        title: "Test Exitoso",
        body: "¡Las notificaciones funcionan! No tenés vencimientos programados para el día de hoy.",
        url: "/",
      });
    }

    let successCount = 0;

    for (const payload of payloadsToSend) {
      const payloadString = JSON.stringify(payload);
      
      const sendPromises = subs.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, payloadString);
          return true;
        } catch (err: any) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            console.log("Subscription expired, removing from DB:", sub.id);
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          } else {
            console.error("Failed to send notification:", err);
          }
          return false;
        }
      });

      const results = await Promise.all(sendPromises);
      const payloadSuccessCount = results.filter(Boolean).length;
      if (payloadSuccessCount > 0) successCount++;
    }

    if (successCount === 0 && subs.length > 0 && payloadsToSend.length > 0) {
      return NextResponse.json({ error: "Las suscripciones expiraron o fallaron" }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: successCount });
  } catch (error) {
    console.error("Test push error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
