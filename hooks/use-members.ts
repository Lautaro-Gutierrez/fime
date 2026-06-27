"use client";

import { useEffect, useId, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export type Member = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type MemberInsert = {
  name: string;
};

const MEMBERS_KEY = ["members"] as const;

function getLocalMembers(): Member[] {
  if (typeof window === "undefined") return [];
  const local = localStorage.getItem("fime_local_members");
  if (!local) return [];
  try {
    return JSON.parse(local) || [];
  } catch (err) {
    console.error("Failed to parse local members", err);
    return [];
  }
}

function saveLocalMembers(members: Member[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem("fime_local_members", JSON.stringify(members));
  }
}

export function useMembers() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const channelId = useId();

  const query = useQuery<Member[]>({
    queryKey: MEMBERS_KEY,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("members")
          .select("*")
          .order("created_at", { ascending: true });
        
        if (error) {
          if (error.code === '42P01' || error.message.includes('schema cache') || error.message.includes('does not exist')) {
            console.warn("Table 'members' not found in database. Using LocalStorage fallback.");
            return getLocalMembers();
          }
          throw error;
        }
        return data as unknown as Member[];
      } catch (err) {
        console.warn("Failed to fetch members from Supabase, falling back to LocalStorage.", err);
        return getLocalMembers();
      }
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`members-changes-${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "members" },
        () => {
          queryClient.invalidateQueries({ queryKey: MEMBERS_KEY });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, channelId]);

  return query;
}

export function useCreateMember() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MemberInsert) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      
      try {
        const { data, error } = await supabase
          .from("members")
          .insert({ name: input.name, user_id: user.id })
          .select()
          .single();
          
        if (error) {
          if (error.code === '42P01' || error.message.includes('schema cache') || error.message.includes('does not exist')) {
            const newMember: Member = {
              id: crypto.randomUUID(),
              user_id: user.id,
              name: input.name,
              created_at: new Date().toISOString()
            };
            const current = getLocalMembers();
            saveLocalMembers([...current, newMember]);
            return newMember;
          }
          throw error;
        }
        return data as unknown as Member;
      } catch (err) {
        const newMember: Member = {
          id: crypto.randomUUID(),
          user_id: user.id,
          name: input.name,
          created_at: new Date().toISOString()
        };
        const current = getLocalMembers();
        saveLocalMembers([...current, newMember]);
        return newMember;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBERS_KEY });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Error al crear el miembro");
    },
  });
}

export function useDeleteMember() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        const { error } = await supabase
          .from("members")
          .delete()
          .eq("id", id);
          
        if (error) {
          if (error.code === '42P01' || error.message.includes('schema cache') || error.message.includes('does not exist')) {
            const current = getLocalMembers();
            saveLocalMembers(current.filter(m => m.id !== id));
            return id;
          }
          throw error;
        }
        // Clean up from local storage just in case
        const current = getLocalMembers();
        saveLocalMembers(current.filter(m => m.id !== id));
        return id;
      } catch (err) {
        const current = getLocalMembers();
        saveLocalMembers(current.filter(m => m.id !== id));
        return id;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBERS_KEY });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Error al eliminar el miembro");
    },
  });
}
