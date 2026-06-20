"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { InvestorProfileType } from "@/lib/investor-profile";

export interface InvestorProfileTestRecord {
  id: string;
  user_id: string;
  answers: Record<string, number>;
  total_score: number;
  result: InvestorProfileType;
  created_at: string;
}

const PROFILE_TESTS_KEY = ["investor_profile_tests"] as const;

export function useInvestorProfileHistory() {
  const supabase = useMemo(() => createClient(), []);

  return useQuery<InvestorProfileTestRecord[]>({
    queryKey: PROFILE_TESTS_KEY,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("investor_profile_tests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useSaveInvestorProfile() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      answers: Record<string, number>;
      total_score: number;
      result: InvestorProfileType;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // 1. Insert history record
      const { error: historyError } = await supabase
        .from("investor_profile_tests")
        .insert({
          user_id: user.id,
          answers: payload.answers,
          total_score: payload.total_score,
          result: payload.result,
        });

      if (historyError) throw historyError;

      // 2. Update user preferences with the active profile
      const completedAt = new Date().toISOString();
      const { error: prefsError } = await supabase
        .from("user_preferences")
        .update({
          investor_profile: payload.result,
          investor_profile_completed_at: completedAt,
        })
        .eq("user_id", user.id);

      if (prefsError) {
        // Fallback lazy insert if user preferences record doesn't exist yet
        const { error: insertError } = await supabase
          .from("user_preferences")
          .insert({
            user_id: user.id,
            investor_profile: payload.result,
            investor_profile_completed_at: completedAt,
          });
        if (insertError) throw insertError;
      }

      return { result: payload.result, completedAt };
    },
    onSuccess: () => {
      // Invalidate both user preferences and history
      queryClient.invalidateQueries({ queryKey: ["user_preferences"] });
      queryClient.invalidateQueries({ queryKey: PROFILE_TESTS_KEY });
      toast.success("Perfil de inversor actualizado correctamente");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Error al guardar el perfil de inversor");
    },
  });
}
