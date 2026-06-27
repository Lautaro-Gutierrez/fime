"use client";

import { useEffect, useId, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { IncomeCategory, IncomeDistribution } from "@/types/database";
import {
  firstOfMonth,
  lastOfMonth,
  monthKey,
  toISODate,
} from "@/lib/format";
import { useUserId } from "@/components/providers/user-provider";
import { toast } from "sonner";

export type Income = {
  id: string;
  user_id: string;
  amount: number;
  currency: "ARS" | "USD";
  fx_rate: number | null;
  amount_ars: number;
  category: IncomeCategory;
  source: string | null;
  date: string;
  note: string | null;
  distribution: IncomeDistribution | null;
  created_at: string;
  updated_at: string;
};

export type IncomeInsert = {
  amount: number;
  currency: "ARS" | "USD";
  fx_rate: number | null;
  category: IncomeCategory;
  source?: string | null;
  date: string;
  note?: string | null;
  distribution?: IncomeDistribution | null;
};

export type IncomeUpdate = Partial<IncomeInsert>;

function incomesKey(userId: string, month: Date) {
  return ["incomes", userId, monthKey(month)] as const;
}

export function useIncomes(month: Date) {
  const supabase = useMemo(() => createClient(), []);
  const userId = useUserId();
  const queryClient = useQueryClient();
  const key = incomesKey(userId, month);
  const channelId = useId();

  const query = useQuery<Income[]>({
    queryKey: key,
    queryFn: async () => {
      const from = toISODate(firstOfMonth(month));
      const to = toISODate(lastOfMonth(month));
      const { data, error } = await supabase
        .from("incomes")
        .select("*")
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Income[];
    },
  });

  // Realtime: cualquier cambio invalida la query del mes activo.
  useEffect(() => {
    const channel = supabase
      .channel(`incomes-changes-${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incomes" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["incomes", userId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, channelId]);

  return query;
}

// Busca el último ingreso de una categoría dada (global, no solo del mes).
// Se usa para pre-rellenar el monto cuando el user clickea un template one-click.
export function useLastIncomeByCategory(category: IncomeCategory) {
  const supabase = useMemo(() => createClient(), []);
  const userId = useUserId();

  return useQuery<Income | null>({
    queryKey: ["incomes-last", userId, category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incomes")
        .select("*")
        .eq("category", category)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as Income | null) ?? null;
    },
    staleTime: 60_000,
  });
}

export function useCreateIncome() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: async (input: IncomeInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const { data, error } = await supabase
        .from("incomes")
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Income;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incomes", userId] });
      queryClient.invalidateQueries({ queryKey: ["incomes-last", userId] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Error al crear el ingreso");
    },
  });
}

export function useUpdateIncome() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: IncomeUpdate;
    }) => {
      const { data, error } = await supabase
        .from("incomes")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Income;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incomes", userId] });
      queryClient.invalidateQueries({ queryKey: ["incomes-last", userId] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Error al actualizar el ingreso");
    },
  });
}

export function useDeleteIncome() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("incomes").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incomes", userId] });
      queryClient.invalidateQueries({ queryKey: ["incomes-last", userId] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Error al eliminar el ingreso");
    },
  });
}
