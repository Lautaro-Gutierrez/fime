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
import { useUserId } from "@/components/providers/user-provider";

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
  is_subscription: boolean;
  tags?: string[];
  assigned_to?: string | null;
};

export type ExpenseInsert = {
  amount: number;
  category: ExpenseCategory;
  type: ExpenseType;
  date: string;
  note?: string | null;
  card_id?: string | null;
  is_subscription?: boolean;
  tags?: string[];
  assigned_to?: string | null;
};

export type ExpenseUpdate = Partial<ExpenseInsert>;

function expensesKey(userId: string, month: Date) {
  return ["expenses", userId, monthKey(month)] as const;
}

export function useExpenses(month: Date) {
  const supabase = useMemo(() => createClient(), []);
  const userId = useUserId();
  const queryClient = useQueryClient();
  // ID único por instancia del hook — evita colisiones de canales Realtime
  // cuando varios componentes suscriben a la misma tabla simultáneamente.
  const channelId = useId();
  const key = expensesKey(userId, month);

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
          queryClient.invalidateQueries({ queryKey: ["expenses", userId] });
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
  const userId = useUserId();

  return useMutation({
    mutationFn: async (input: ExpenseInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      
      const payload: any = { ...input, user_id: user.id };
      
      try {
        const { data, error } = await supabase
          .from("expenses")
          .insert(payload)
          .select()
          .single();
          
        if (error) {
          if (error.message.includes('column') || error.code === '42703' || error.message.includes('schema cache')) {
            console.warn("Database schema does not support 'tags' or 'assigned_to'. Retrying insert without them.");
            const fallbackPayload = { ...input, user_id: user.id } as any;
            delete fallbackPayload.tags;
            delete fallbackPayload.assigned_to;
            const { data: fbData, error: fbError } = await supabase
              .from("expenses")
              .insert(fallbackPayload)
              .select()
              .single();
            if (fbError) throw fbError;
            return fbData as Expense;
          }
          throw error;
        }
        return data as Expense;
      } catch (err: any) {
        if (err.message && (err.message.includes('column') || err.message.includes('schema cache'))) {
          const fallbackPayload = { ...input, user_id: user.id } as any;
          delete fallbackPayload.tags;
          delete fallbackPayload.assigned_to;
          const { data: fbData, error: fbError } = await supabase
            .from("expenses")
            .insert(fallbackPayload)
            .select()
            .single();
          if (fbError) throw fbError;
          return fbData as Expense;
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", userId] });
    },
  });
}

export function useUpdateExpense() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: ExpenseUpdate;
    }) => {
      try {
        const { data, error } = await supabase
          .from("expenses")
          .update(patch)
          .eq("id", id)
          .select()
          .single();
          
        if (error) {
          if (error.message.includes('column') || error.code === '42703' || error.message.includes('schema cache')) {
            console.warn("Database schema does not support 'tags' or 'assigned_to'. Retrying update without them.");
            const fallbackPatch = { ...patch } as any;
            delete fallbackPatch.tags;
            delete fallbackPatch.assigned_to;
            const { data: fbData, error: fbError } = await supabase
              .from("expenses")
              .update(fallbackPatch)
              .eq("id", id)
              .select()
              .single();
            if (fbError) throw fbError;
            return fbData as Expense;
          }
          throw error;
        }
        return data as Expense;
      } catch (err: any) {
        if (err.message && (err.message.includes('column') || err.message.includes('schema cache'))) {
          const fallbackPatch = { ...patch } as any;
          delete fallbackPatch.tags;
          delete fallbackPatch.assigned_to;
          const { data: fbData, error: fbError } = await supabase
            .from("expenses")
            .update(fallbackPatch)
            .eq("id", id)
            .select()
            .single();
          if (fbError) throw fbError;
          return fbData as Expense;
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", userId] });
    },
  });
}

export function useDeleteExpense() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("expenses").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", userId] });
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
