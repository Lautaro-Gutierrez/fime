"use client";

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function QueryProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [client] = useState(() => {
    const handleGlobalError = (error: unknown) => {
      const err = error as any;
      // Verificar si es un error de autenticación/token expirado
      if (
        err?.status === 401 ||
        err?.status === 403 ||
        err?.code === "PGRST301" || // Código JWT expirado en PostgREST
        err?.message?.toLowerCase().includes("jwt expired") ||
        err?.message?.toLowerCase().includes("invalid refresh token") ||
        err?.message?.toLowerCase().includes("not authorized")
      ) {
        toast.error("Tu sesión ha expirado. Iniciá sesión nuevamente.");
        const supabase = createClient();
        supabase.auth.signOut().then(() => {
          router.push("/login");
        });
      }
    };

    return new QueryClient({
      queryCache: new QueryCache({
        onError: handleGlobalError,
      }),
      mutationCache: new MutationCache({
        onError: handleGlobalError,
      }),
      defaultOptions: {
        queries: {
          staleTime: 1000 * 30, // 30s — el realtime invalida igual cuando hay cambios
          refetchOnWindowFocus: false,
        },
      },
    });
  });

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
