"use client";

import { useEffect, useState, useMemo, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { KeyRound, Fingerprint, Loader2, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Definimos la interfaz del objeto passkey según la respuesta de Supabase
interface Passkey {
  id: string;
  name: string;
  created_at?: string;
}

type AuthWithPasskey = {
  passkey: {
    list: () => Promise<{ data: Passkey[] | null; error: Error | null }>;
    delete: (args: { passkeyId: string }) => Promise<{ error: Error | null }>;
  };
  registerPasskey: () => Promise<{ data: unknown; error: Error | null }>;
};

export function PasskeySection() {
  const supabase = useMemo(() => createClient(), []);
  const passkeyAuth = supabase.auth as unknown as AuthWithPasskey;
  const webAuthnSupported = useSyncExternalStore(
    () => () => {},
    () => Boolean(window.PublicKeyCredential),
    () => false,
  );

  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(webAuthnSupported);
  const [registering, setRegistering] = useState(false);

  async function refreshPasskeys() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await passkeyAuth.passkey.list();
      if (error) throw error;

      if (data) {
        setPasskeys(data);
      }
    } catch (err) {
      console.error("Error cargando passkeys:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!webAuthnSupported) return;
    let active = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await (supabase.auth as unknown as AuthWithPasskey).passkey.list();
        if (error) throw error;
        if (active && data) {
          setPasskeys(data);
        }
      } catch (err) {
        console.error("Error cargando passkeys:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [supabase, webAuthnSupported]);

  async function handleRegister() {
    setRegistering(true);
    try {
      const { error } = await passkeyAuth.registerPasskey();
      if (error) {
        throw error;
      }

      toast.success("Passkey registrado con éxito");
      await refreshPasskeys();
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          toast.info("Registro cancelado");
          return;
        }
        if (err.name === "SecurityError") {
          toast.error("La autenticación biométrica requiere conexión segura (HTTPS)");
          return;
        }
        toast.error(err.message);
      } else {
        toast.error("Error al registrar passkey");
      }
    } finally {
      setRegistering(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await passkeyAuth.passkey.delete({ passkeyId: id });
      if (error) throw error;
      toast.success("Passkey eliminado");
      await refreshPasskeys();
    } catch {
      toast.error("Error al eliminar passkey");
    }
  }

  if (!webAuthnSupported) {
    // Fallback silencioso o mínimo
    return null; 
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-theme-400" />
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Biometría
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-[#1A1D24] p-4">
        <div className="flex items-start gap-3 mb-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-theme-500/10 text-theme-300 ring-1 ring-theme-500/20">
            <Fingerprint className="size-4" />
          </div>
          <div className="flex flex-1 flex-col">
            <span className="text-sm font-medium text-foreground">Passkeys</span>
            <span className="text-xs text-muted-foreground">
              Iniciá sesión usando tu huella, rostro o PIN del dispositivo.
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-5 animate-spin text-muted-foreground/50" />
          </div>
        ) : passkeys.length === 0 ? (
          <Button
            type="button"
            onClick={handleRegister}
            disabled={registering}
            className="w-full gap-2 border-theme-500/30 bg-theme-500/10 text-theme-300 hover:bg-theme-500/20"
            variant="outline"
          >
            {registering ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Registrar Passkey
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              {passkeys.map((pk) => (
                <div 
                  key={pk.id} 
                  className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#1F2229] px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <KeyRound className="size-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground/90">
                      {pk.name || "Passkey"}
                    </span>
                  </div>
                  {/* Botón eliminar (Placeholder / Deshabilitado por ahora hasta soporte del SDK) */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 hover:bg-rose-500/10 hover:text-rose-400"
                    onClick={() => handleDelete(pk.id)}
                    title="Función próxima"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            
            <Button
              type="button"
              onClick={handleRegister}
              disabled={registering}
              className="w-full gap-2 text-xs"
              variant="secondary"
              size="sm"
            >
              {registering ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Plus className="size-3" />
              )}
              Agregar otro Passkey
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
