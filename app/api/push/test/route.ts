import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import webpush from "web-push";

// Ensure VAPID details are set
const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const vapidPrivate = process.env.VAPID_PRIVATE_KEY || "";
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@fime.app";

if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!vapidPublic || !vapidPrivate) {
      return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
    }

    // Get all subscriptions for this user
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user.id);

    if (error || !subs || subs.length === 0) {
      return NextResponse.json({ error: "No subscriptions found" }, { status: 404 });
    }

    const payload = JSON.stringify({
      title: "FiMe Alerta",
      body: "¡Mañana vence tu tarjeta Visa!",
      url: "/config/tarjetas"
    });

    const sendPromises = subs.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        return true;
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription has expired or is no longer valid
          console.log("Subscription expired, removing from DB:", sub.id);
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("Failed to send notification:", err);
        }
        return false;
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter(Boolean).length;

    if (successCount === 0 && subs.length > 0) {
      return NextResponse.json({ error: "Las suscripciones expiraron o fallaron" }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: successCount });
  } catch (error) {
    console.error("Test push error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
