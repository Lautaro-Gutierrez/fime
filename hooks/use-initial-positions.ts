"use client";

import { useEffect, useId, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { AssetType } from "@/types/database";

export type InitialPosition = {
  id: string;
  user_id: string;
  asset_type: AssetType;
  ticker: string | null;
  quantity: number;
  avg_cost_usd: number;
  as_of_date: string;
  note: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type InitialPositionInsert = {
  asset_type: AssetType;
  ticker?: string | null;
  quantity: number;
  avg_cost_usd: number;
  as_of_date: string;
  note?: string | null;
  metadata?: Record<string, unknown>;
};

export type InitialPositionUpdate = Partial<InitialPositionInsert>;

const KEY = ["initial_positions"] as const;

export function useInitialPositions() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  // useId garantiza un canal único por mount del hook (evita colisión si hay
  // múltiples instancias activas en simultáneo, ej. usePortfolio + dialog).
  const channelId = useId();

  const query = useQuery<InitialPosition[]>({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("initial_positions")
        .select("*")
        .order("as_of_date", { ascending: false });
      if (error) throw error;
      return data as InitialPosition[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`initial-positions-${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "initial_positions" },
        () => {
          queryClient.invalidateQueries({ queryKey: KEY });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, channelId]);

  return query;
}

export function useCreateInitialPosition() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: InitialPositionInsert) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const { data, error } = await supabase
        .from("initial_positions")
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as InitialPosition;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useUpdateInitialPosition() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: InitialPositionUpdate;
    }) => {
      const { data, error } = await supabase
        .from("initial_positions")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as InitialPosition;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useDeleteInitialPosition() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("initial_positions")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}
