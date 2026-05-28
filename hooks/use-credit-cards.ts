"use client";

import { useEffect, useId, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type CreditCard = {
  id: string;
  user_id: string;
  name: string;
  closing_day: number;
  due_day: number;
  brand: string | null;
  last_four: string | null;
  color: string | null;
  currency: "ARS" | "USD";
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreditCardInsert = {
  name: string;
  closing_day: number;
  due_day: number;
  brand?: string | null;
  last_four?: string | null;
  color?: string | null;
  currency?: "ARS" | "USD";
};

export type CreditCardUpdate = Partial<CreditCardInsert> & {
  archived_at?: string | null;
};

const CREDIT_CARDS_KEY = ["credit_cards"] as const;

/** Lista solo tarjetas activas (no archivadas). */
export function useCreditCards() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const channelId = useId();

  const query = useQuery<CreditCard[]>({
    queryKey: CREDIT_CARDS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_cards")
        .select("*")
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as CreditCard[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`credit-cards-changes-${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "credit_cards" },
        () => {
          queryClient.invalidateQueries({ queryKey: CREDIT_CARDS_KEY });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, channelId]);

  return query;
}

export function useCreateCreditCard() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreditCardInsert) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const { data, error } = await supabase
        .from("credit_cards")
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as CreditCard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREDIT_CARDS_KEY });
    },
  });
}

export function useUpdateCreditCard() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: CreditCardUpdate }) => {
      const { data, error } = await supabase
        .from("credit_cards")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as CreditCard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREDIT_CARDS_KEY });
    },
  });
}

/**
 * Soft delete: setea archived_at = now(). La tarjeta desaparece del listado
 * pero mantiene los gastos linkeados intactos (card_id sigue apuntando).
 */
export function useArchiveCreditCard() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("credit_cards")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREDIT_CARDS_KEY });
    },
  });
}
