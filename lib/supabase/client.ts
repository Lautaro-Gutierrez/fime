import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          experimental: {
            passkey: true,
          },
        },
      } as any,
    );
  }
  return client;
}

export const supabase = typeof window !== "undefined" ? createClient() : ({} as ReturnType<typeof createBrowserClient<Database>>);
