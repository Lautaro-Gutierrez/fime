"use client";

import { useEffect, useMemo, useId } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { AssetType, TxType } from "@/types/database";

export type Investment = {
  id: string;
  user_id: string;
  portfolio_id: string | null;
  asset_type: AssetType;
  ticker: string | null;
  tx_type: TxType;
  quantity: number;
  price_usd: number | null;
  fx_rate: number | null;
  fees_usd: number;
  broker: string | null;
  date: string;
  note: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type InvestmentInsert = {
  portfolio_id?: string | null;
  asset_type: AssetType;
  ticker?: string | null;
  tx_type: TxType;
  quantity: number;
  price_usd?: number | null;
  fx_rate?: number | null;
  fees_usd?: number;
  broker?: string | null;
  date: string;
  note?: string | null;
  metadata?: Record<string, unknown>;
};

export type InvestmentUpdate = Partial<InvestmentInsert>;

const INVESTMENTS_KEY = ["investments"] as const;

export function useInvestments() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const channelId = useId();

  const query = useQuery<Investment[]>({
    queryKey: INVESTMENTS_KEY,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("investments")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Investment[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`investments-changes-${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "investments" },
        () => {
          queryClient.invalidateQueries({ queryKey: INVESTMENTS_KEY });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, channelId]);

  return query;
}

export function useCreateInvestment() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: InvestmentInsert) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const { data, error } = await (supabase as any)
        .from("investments")
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Investment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVESTMENTS_KEY });
    },
  });
}

export function useUpdateInvestment() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: InvestmentUpdate;
    }) => {
      const { data, error } = await (supabase as any)
        .from("investments")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Investment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVESTMENTS_KEY });
    },
  });
}

export function useDeleteInvestment() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("investments")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVESTMENTS_KEY });
    },
  });
}
