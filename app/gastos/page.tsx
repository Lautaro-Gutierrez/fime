import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/server";
import GastosClient from "./gastos-client";
import { firstOfMonth, toISODate, lastOfMonth, monthKey } from "@/lib/format";

export default async function GastosPage() {
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

  // Prefetching expenses and credit cards for the current month
  await Promise.all([
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
      queryKey: ["credit_cards"],
      queryFn: async () => {
        const { data } = await supabase
          .from("credit_cards")
          .select("*")
          .order("name", { ascending: true });
        return data || [];
      }
    })
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <GastosClient />
    </HydrationBoundary>
  );
}
