import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          endpoint: endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );

    if (error) {
      console.error("DB Error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
