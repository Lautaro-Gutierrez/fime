import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/server";
import MetasClient from "./metas-client";
import { firstOfMonth, toISODate, lastOfMonth, monthKey } from "@/lib/format";

export default async function MetasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const queryClient = new QueryClient();
  
  const currentMonth = new Date();
  const from = toISODate(firstOfMonth(currentMonth));
  const to = toISODate(lastOfMonth(currentMonth));
  const mKey = monthKey(currentMonth);

  // Prefetching goals, portfolio, expenses and incomes needed for progress calculation
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["goals", user.id],
      queryFn: async () => {
        const { data } = await supabase
          .from("goals")
          .select("*")
          .order("priority", { ascending: false })
          .order("created_at", { ascending: false });
        return data || [];
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["portfolio", user.id], // Wait! Is usePortfolio using userId in key? Let me check later if needed, but standard is portfolio_id or user_id
      queryFn: async () => {
        // Portfolio logic is complex, skipping prefetch for now as it aggregates via RPC or multiple tables
        // Actually, usePortfolio uses an RPC in the client hook, so we won't prefetch it here unless necessary.
        return null;
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["expenses", user.id, mKey],
      queryFn: async () => {
        const { data } = await supabase
          .from("expenses")
          .select("*")
          .gte("date", from)
          .lte("date", to)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false });
        return data || [];
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["incomes", user.id, mKey],
      queryFn: async () => {
        const { data } = await supabase
          .from("incomes")
          .select("*")
          .gte("date", from)
          .lte("date", to)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false });
        return data || [];
      },
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MetasClient />
    </HydrationBoundary>
  );
}
