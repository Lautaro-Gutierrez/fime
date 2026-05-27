"use client";

import { useEffect, useId, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

export type Portfolio = Database["public"]["Tables"]["portfolios"]["Row"];
export type PortfolioInsert = Database["public"]["Tables"]["portfolios"]["Insert"];
export type PortfolioUpdate = Database["public"]["Tables"]["portfolios"]["Update"];

const PORTFOLIOS_KEY = ["portfolios"] as const;

export function usePortfolios() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const channelId = useId();

  const query = useQuery<Portfolio[]>({
    queryKey: PORTFOLIOS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolios")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Portfolio[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`portfolios-changes-${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "portfolios" },
        () => {
          queryClient.invalidateQueries({ queryKey: PORTFOLIOS_KEY });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, channelId]);

  return query;
}

export function useCreatePortfolio() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<PortfolioInsert, "user_id">) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const { data, error } = await supabase
        .from("portfolios")
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Portfolio;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PORTFOLIOS_KEY });
    },
  });
}

export function useUpdatePortfolio() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: PortfolioUpdate }) => {
      const { data, error } = await supabase
        .from("portfolios")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Portfolio;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PORTFOLIOS_KEY });
    },
  });
}

export function useDeletePortfolio() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("portfolios")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PORTFOLIOS_KEY });
    },
  });
}
