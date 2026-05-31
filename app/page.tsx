import { Suspense } from "react";
import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./dashboard-client";
import { firstOfMonth, toISODate, lastOfMonth, monthKey } from "@/lib/format";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const queryClient = new QueryClient();
  
  // Constantes de fechas necesarias para expenses e incomes
  const currentMonth = new Date();
  const from = toISODate(firstOfMonth(currentMonth));
  const to = toISODate(lastOfMonth(currentMonth));
  const mKey = monthKey(currentMonth);

  // Prefetch de las consultas principales para evitar waterfalls en el cliente
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
    queryClient.prefetchQuery({
      queryKey: ["investments", user.id],
      queryFn: async () => {
        const { data } = await supabase
          .from("investments")
          .select("*")
          .order("created_at", { ascending: false });
        return data || [];
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["goals", user.id],
      queryFn: async () => {
        const { data } = await supabase
          .from("goals")
          .select("*, goal_contributions(*)")
          .order("created_at", { ascending: false });
        return data || [];
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["portfolios", user.id],
      queryFn: async () => {
        const { data } = await supabase
          .from("portfolios")
          .select("*")
          .order("created_at", { ascending: false });
        return data || [];
      },
    })
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient />
    </HydrationBoundary>
  );
}
