import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import webpush from "web-push";
import { clampDayToMonth } from "@/lib/credit-cards";
import { toISODate } from "@/lib/format";
import { CATEGORIES_BY_ID } from "@/lib/categories";
import type { ExpenseCategory } from "@/types/database";

export async function GET(req: Request) {
  try {
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY || "";
    const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@fime.app";

    if (!vapidPublic || !vapidPrivate) {
      return NextResponse.json({ error: "VAPID keys not configured en el servidor" }, { status: 500 });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    // Autenticación simple mediante cabecera Authorization o parámetro secreto si se pasa
    const authHeader = req.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    // Exigir que exista CRON_SECRET y que se pase en la cabecera (formato Bearer)
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Obtener todas las suscripciones push activas
    const { data: subs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (subsError || !subs || subs.length === 0) {
      return NextResponse.json({ message: "No subscriptions found" });
    }

    // Agrupar suscripciones por usuario
    const subsByUser = subs.reduce((acc, sub) => {
      if (!acc[sub.user_id]) acc[sub.user_id] = [];
      acc[sub.user_id].push(sub);
      return acc;
    }, {} as Record<string, typeof subs>);

    const today = new Date();
    const todayISO = toISODate(today);
    const todayDay = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    let sentCount = 0;

    for (const [userId, userSubs] of Object.entries(subsByUser)) {
      const payloadsToSend: { title: string; body: string; url: string }[] = [];

      // 1. Verificar vencimientos de Tarjetas
      const { data: cards } = await supabase
        .from("credit_cards")
        .select("*")
        .eq("user_id", userId)
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
        .eq("user_id", userId)
        .eq("date", todayISO);

      if (expenses) {
        for (const exp of expenses) {
          // Normalizar el nombre en caso de typos viejos en BD y obtener la etiqueta limpia
          const normalizedName = exp.category === ("tarjeta_credit" as any) ? "tarjeta_credito" : exp.category;
          const categoryLabel = CATEGORIES_BY_ID[normalizedName as ExpenseCategory]?.label || normalizedName;

          payloadsToSend.push({
            title: "Gasto Programado",
            body: `Hoy tenés un gasto programado de ${categoryLabel} por $${exp.amount}.`,
            url: "/gastos",
          });
        }
      }

      // Enviar las notificaciones acumuladas a todas las suscripciones del usuario
      for (const payload of payloadsToSend) {
        for (const sub of userSubs) {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };

          try {
            await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
            sentCount++;
          } catch (err: any) {
            if (err.statusCode === 404 || err.statusCode === 410) {
              // Suscripción inválida/expirada, borrar de la BD
              await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            } else {
              console.error(`Failed to send notification to user ${userId}:`, err);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, notificationsSent: sentCount });
  } catch (error: any) {
    console.error("Cron reminders error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
