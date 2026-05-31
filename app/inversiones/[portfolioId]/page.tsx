import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/server";
import PortfolioClient from "./portfolio-client";
import { redirect } from "next/navigation";

export default async function PortfolioPage(props: {
  params: Promise<{ portfolioId: string }>;
}) {
  const params = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Verificar que el portfolio existe y le pertenece al usuario
  if (params.portfolioId !== "all") {
    const { data: portfolio } = await supabase
      .from("portfolios")
      .select("id")
      .eq("id", params.portfolioId)
      .eq("user_id", user.id)
      .single();
    
    if (!portfolio) {
      redirect("/inversiones/all");
    }
  }

  const queryClient = new QueryClient();

  // No hacemos prefetch del RPC de portfolio porque depende de la lógica interna de React Query, 
  // pero podemos prefetch de "investments" y "portfolios" que son requeridos.
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["portfolios", user.id],
      queryFn: async () => {
        const { data } = await supabase
          .from("portfolios")
          .select("*")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });
        return data || [];
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["investments", user.id],
      queryFn: async () => {
        const { data } = await supabase
          .from("investments")
          .select("*")
          .order("date", { ascending: false })
          .order("created_at", { ascending: false });
        return data || [];
      },
    })
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PortfolioClient params={props.params} />
    </HydrationBoundary>
  );
}
