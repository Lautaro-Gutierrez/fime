"use client";

import { useEffect, useId, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { GoalStatus, GoalType, QuestType } from "@/types/database";

export type Goal = {
  id: string;
  user_id: string;
  name: string;
  goal_type: GoalType;
  quest_type: QuestType;
  target_amount: number;
  currency: "USD" | "ARS" | null;
  current_amount: number;
  source_type: string | null;
  source_ref: string | null;
  linked_asset_keys: string[];
  deadline: string | null;
  started_at: string;
  status: GoalStatus;
  priority: number;
  color: string | null;
  icon: string | null;
  note: string | null;
  metadata: Record<string, unknown>;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type GoalInsert = {
  name: string;
  goal_type: GoalType;
  quest_type?: QuestType;
  target_amount: number;
  currency?: "USD" | "ARS" | null;
  current_amount?: number;
  source_type?: string | null;
  source_ref?: string | null;
  linked_asset_keys?: string[];
  deadline?: string | null;
  started_at?: string;
  status?: GoalStatus;
  priority?: number;
  color?: string | null;
  icon?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown>;
  completed_at?: string | null;
};

export type GoalUpdate = Partial<GoalInsert>;

const GOALS_KEY = ["goals"] as const;

export function useGoals() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  // Sufijo único por mount (fix M3: evita colisión cuando varios componentes
  // montan el hook en simultáneo y registran el mismo nombre de canal).
  const channelId = useId();

  const query = useQuery<Goal[]>({
    queryKey: GOALS_KEY,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("goals")
        .select("*")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Goal[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`goals-changes-${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "goals" },
        () => {
          queryClient.invalidateQueries({ queryKey: GOALS_KEY });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, channelId]);

  return query;
}

export function useCreateGoal() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GoalInsert) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const { data, error } = await (supabase as any)
        .from("goals")
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GOALS_KEY });
    },
  });
}

export function useUpdateGoal() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: GoalUpdate }) => {
      const { data, error } = await (supabase as any)
        .from("goals")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GOALS_KEY });
    },
  });
}

export function useDeleteGoal() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("goals").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GOALS_KEY });
    },
  });
}
