"use client";

import { useEffect, useId, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Theme, Density, AccentColor } from "@/types/database";

export type UserPreferences = {
  user_id: string;
  theme: Theme;
  density: Density;
  stealth_mode: boolean;
  accent_color: AccentColor;
  avatar_url: string | null;
  display_name: string | null;
  onboarding_completed: boolean;
  completed_tours: string[];
  custom_tags: string[];
  investor_profile: "conservador" | "moderado" | "agresivo" | null;
  investor_profile_completed_at: string | null;
  updated_at: string;
};

export type PreferencesUpdate = {
  theme?: Theme;
  density?: Density;
  stealth_mode?: boolean;
  accent_color?: AccentColor;
  avatar_url?: string | null;
  display_name?: string | null;
  onboarding_completed?: boolean;
  completed_tours?: string[];
  custom_tags?: string[];
  investor_profile?: "conservador" | "moderado" | "agresivo" | null;
  investor_profile_completed_at?: string | null;
};

function getLocalCustomTags(): string[] {
  if (typeof window === "undefined") return ["Facultad", "Mascotas", "Vacaciones"];
  const local = localStorage.getItem("fime_local_custom_tags");
  return local ? JSON.parse(local) : ["Facultad", "Mascotas", "Vacaciones"];
}

function saveLocalCustomTags(tags: string[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem("fime_local_custom_tags", JSON.stringify(tags));
  }
}

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
      
      const prefs = data as UserPreferences | null;
      if (prefs) {
        if (!prefs.custom_tags) {
          prefs.custom_tags = getLocalCustomTags();
        }
      }
      return prefs;
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

      try {
        // Lazy upsert: try update first, if no rows affected, insert
        const { data: updated, error: updateError } = await supabase
          .from("user_preferences")
          .update(patch)
          .eq("user_id", user.id)
          .select()
          .maybeSingle();

        if (updateError) {
          if (updateError.message.includes("custom_tags") || updateError.message.includes("column") || updateError.message.includes("schema cache")) {
            if (patch.custom_tags) saveLocalCustomTags(patch.custom_tags);
            const fallbackPatch = { ...patch } as any;
            delete fallbackPatch.custom_tags;
            const { data: fbUpdated, error: fbUpdateError } = await supabase
              .from("user_preferences")
              .update(fallbackPatch)
              .eq("user_id", user.id)
              .select()
              .maybeSingle();
            if (fbUpdateError) throw fbUpdateError;
            
            const result = fbUpdated as UserPreferences;
            if (result) {
              result.custom_tags = getLocalCustomTags();
            }
            return result;
          }
          throw updateError;
        }

        if (updated) {
          const result = updated as UserPreferences;
          if (result && !result.custom_tags) {
            result.custom_tags = getLocalCustomTags();
          }
          return result;
        }

        // No row existed — create with defaults + patch
        const { data: inserted, error: insertError } = await supabase
          .from("user_preferences")
          .insert({ user_id: user.id, ...patch })
          .select()
          .single();

        if (insertError) throw insertError;
        
        const result = inserted as UserPreferences;
        if (result && !result.custom_tags) {
          result.custom_tags = getLocalCustomTags();
        }
        return result;
      } catch (err: any) {
        if (err.message && (err.message.includes("custom_tags") || err.message.includes("column") || err.message.includes("schema cache"))) {
          if (patch.custom_tags) saveLocalCustomTags(patch.custom_tags);
          const fallbackPatch = { ...patch } as any;
          delete fallbackPatch.custom_tags;
          
          const { data: fbData, error: fbError } = await supabase
            .from("user_preferences")
            .update(fallbackPatch)
            .eq("user_id", user.id)
            .select()
            .maybeSingle();
          if (fbError) throw fbError;
          
          if (fbData) {
            const result = fbData as UserPreferences;
            result.custom_tags = getLocalCustomTags();
            return result;
          }
          
          const { data: fbInserted, error: fbInsertError } = await supabase
            .from("user_preferences")
            .insert({ user_id: user.id, ...fallbackPatch })
            .select()
            .single();
          if (fbInsertError) throw fbInsertError;
          
          const result = fbInserted as UserPreferences;
          result.custom_tags = getLocalCustomTags();
          return result;
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PREFS_KEY });
    },
  });
}
