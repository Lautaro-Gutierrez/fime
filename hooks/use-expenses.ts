"use client";

import { useEffect, useId, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ExpenseCategory, ExpenseType } from "@/types/database";
import {
  firstOfMonth,
  lastOfMonth,
  monthKey,
  toISODate,
} from "@/lib/format";

export type Expense = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  type: ExpenseType;
  date: string;
  note: string | null;
  card_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ExpenseInsert = {
  amount: number;
  category: ExpenseCategory;
  type: ExpenseType;
  date: string;
  note?: string | null;
  card_id?: string | null;
};

export type ExpenseUpdate = Partial<ExpenseInsert>;

function expensesKey(month: Date) {
  return ["expenses", monthKey(month)] as const;
}

export function useExpenses(month: Date) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  // ID único por instancia del hook — evita colisiones de canales Realtime
  // cuando varios componentes suscriben a la misma tabla simultáneamente.
  const channelId = useId();
  const key = expensesKey(month);

  const query = useQuery<Expense[]>({
    queryKey: key,
    queryFn: async () => {
      const from = toISODate(firstOfMonth(month));
      const to = toISODate(lastOfMonth(month));
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Expense[];
    },
  });

  // Realtime: cualquier cambio en la tabla invalida la query del mes activo.
  useEffect(() => {
    const channel = supabase
      .channel(`expenses-changes-${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, channelId]);

  return query;
}

export function useCreateExpense() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ExpenseInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const { data, error } = await supabase
        .from("expenses")
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

export function useUpdateExpense() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: ExpenseUpdate;
    }) => {
      const { data, error } = await supabase
        .from("expenses")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

export function useDeleteExpense() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

// Helper: suma los gastos de un array por `type`. Se usa en Sankey e Ingresos
// para derivar los buckets "Gastos fijos" y "Gastos variables" de datos reales.
export function sumExpensesByType(expenses: Expense[]): {
  fixed: number;
  variable: number;
  total: number;
} {
  let fixed = 0;
  let variable = 0;
  for (const e of expenses) {
    const amount = Number(e.amount);
    if (e.type === "fixed") fixed += amount;
    else variable += amount;
  }
  return { fixed, variable, total: fixed + variable };
}
