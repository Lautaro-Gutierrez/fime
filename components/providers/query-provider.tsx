"use client";

import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

// Crear un persister asíncrono para IndexedDB
const idbValidKey = (key: string) => key;

function createIDBPersister() {
  if (typeof window === "undefined") return undefined;

  return createAsyncStoragePersister({
    storage: {
      getItem: async (key) => {
        return await get(idbValidKey(key));
      },
      setItem: async (key, value) => {
        await set(idbValidKey(key), value);
      },
      removeItem: async (key) => {
        await del(idbValidKey(key));
      },
    },
  });
}

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
          networkMode: "offlineFirst", // Permite leer la cache estando offline
        },
        mutations: {
          networkMode: "offlineFirst", // Permite encolar mutaciones estando offline
        },
      },
    });
  });

  const [persister] = useState(() => createIDBPersister());

  if (!persister) {
    return <>{children}</>;
  }

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{ persister }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
