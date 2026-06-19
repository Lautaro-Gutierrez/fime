import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import webpush from "web-push";
import { clampDayToMonth, nextDueDate } from "@/lib/credit-cards";
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
    // Generar ventana de 4 días (hoy + próximos 3 días) en local
    const dates: { iso: string; label: string; diff: number }[] = [];
    for (let i = 0; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = toISODate(d);
      let label = "";
      if (i === 0) label = "hoy";
      else if (i === 1) label = "mañana";
      else if (i === 2) label = "en 2 días";
      else label = "en 3 días";
      dates.push({ iso, label, diff: i });
    }

    // 1. Verificar vencimientos de Tarjetas (en los próximos 3 días)
    const { data: cards } = await supabase
      .from("credit_cards")
      .select("*")
      .eq("user_id", user.id)
      .is("archived_at", null);

    if (cards) {
      for (const card of cards) {
        const nextDue = nextDueDate(card.closing_day, card.due_day, today);
        const nextDueISO = toISODate(nextDue);
        const dateMatch = dates.find((d) => d.iso === nextDueISO);
        
        if (dateMatch) {
          let bodyText = "";
          if (dateMatch.diff === 0) {
            bodyText = `¡Atención! Hoy vence tu tarjeta ${card.name}.`;
          } else if (dateMatch.diff === 1) {
            bodyText = `¡Atención! Mañana vence tu tarjeta ${card.name}.`;
          } else {
            bodyText = `¡Atención! Tu tarjeta ${card.name} vence ${dateMatch.label}.`;
          }

          payloadsToSend.push({
            title: "Vencimiento de Tarjeta",
            body: bodyText,
            url: "/config",
          });
        }
      }
    }

    // 2. Verificar Gastos Programados (en los próximos 3 días)
    const { data: expenses } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", dates[0].iso)
      .lte("date", dates[3].iso);

    if (expenses) {
      for (const exp of expenses) {
        const dateMatch = dates.find((d) => d.iso === exp.date);
        if (dateMatch) {
          // Normalizar el nombre en caso de typos viejos en BD y obtener la etiqueta limpia
          const normalizedName = exp.category === ("tarjeta_credit" as any) ? "tarjeta_credito" : exp.category;
          const categoryLabel = CATEGORIES_BY_ID[normalizedName as ExpenseCategory]?.label || exp.note || normalizedName;

          let bodyText = "";
          if (dateMatch.diff === 0) {
            bodyText = `Hoy vence: ${exp.note ? exp.note : categoryLabel} por $${exp.amount}.`;
          } else if (dateMatch.diff === 1) {
            bodyText = `Mañana vence: ${exp.note ? exp.note : categoryLabel} por $${exp.amount}.`;
          } else {
            bodyText = `Vence ${dateMatch.label}: ${exp.note ? exp.note : categoryLabel} por $${exp.amount}.`;
          }

          payloadsToSend.push({
            title: "Gasto Programado",
            body: bodyText,
            url: "/gastos",
          });
        }
      }
    }

    // Fallback si no hay notificaciones para hoy o los próximos 3 días
    if (payloadsToSend.length === 0) {
      payloadsToSend.push({
        title: "Test Exitoso",
        body: "¡Las notificaciones funcionan! No tenés vencimientos programados para los próximos 3 días.",
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
