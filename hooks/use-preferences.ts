"use client";

import { useEffect, useId, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Theme, Density } from "@/types/database";

export type UserPreferences = {
  user_id: string;
  theme: Theme;
  density: Density;
  stealth_mode: boolean;
  avatar_url: string | null;
  display_name: string | null;
  updated_at: string;
};

export type PreferencesUpdate = {
  theme?: Theme;
  density?: Density;
  stealth_mode?: boolean;
  avatar_url?: string | null;
  display_name?: string | null;
};

const PREFS_KEY = ["user_preferences"] as const;

export function usePreferences() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const channelId = useId();

  const query = useQuery<UserPreferences | null>({
    queryKey: PREFS_KEY,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as UserPreferences | null;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`prefs-changes-${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_preferences" },
        () => {
          queryClient.invalidateQueries({ queryKey: PREFS_KEY });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, channelId]);

  return query;
}

export function useUpdatePreferences() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: PreferencesUpdate) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // Lazy upsert: try update first, if no rows affected, insert
      const { data: updated, error: updateError } = await supabase
        .from("user_preferences")
        .update(patch)
        .eq("user_id", user.id)
        .select()
        .maybeSingle();

      if (updateError) throw updateError;

      if (updated) return updated as UserPreferences;

      // No row existed — create with defaults + patch
      const { data: inserted, error: insertError } = await supabase
        .from("user_preferences")
        .insert({ user_id: user.id, ...patch })
        .select()
        .single();

      if (insertError) throw insertError;
      return inserted as UserPreferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PREFS_KEY });
    },
  });
}
