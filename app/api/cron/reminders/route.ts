import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import webpush from "web-push";
import { clampDayToMonth, nextDueDate } from "@/lib/credit-cards";
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

    let sentCount = 0;

    for (const [userId, userSubs] of Object.entries(subsByUser)) {
      const payloadsToSend: { title: string; body: string; url: string }[] = [];

      // 1. Verificar vencimientos de Tarjetas (en los próximos 3 días)
      const { data: cards } = await supabase
        .from("credit_cards")
        .select("*")
        .eq("user_id", userId)
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
        .eq("user_id", userId)
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
              title: "Vencimiento Próximo",
              body: bodyText,
              url: "/gastos",
            });
          }
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
