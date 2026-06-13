"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function PushNotificationTile({ className }: { className?: string }) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
      
      navigator.serviceWorker?.getRegistration().then(reg => {
        if (reg) {
          reg.pushManager.getSubscription().then(sub => {
            setSubscribed(!!sub);
          });
        }
      });
    }
  }, []);

  async function handleToggle() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      toast.error("Tu navegador no soporta notificaciones push.");
      return;
    }

    setLoading(true);
    try {
      if (subscribed) {
        // Unsubscribe logic (local only for now, DB cleanup happens on send failure)
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
        setSubscribed(false);
        toast.success("Notificaciones desactivadas localmente");
        setLoading(false);
        return;
      }

      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        toast.error("Permiso denegado para notificaciones");
        setLoading(false);
        return;
      }

      // Register SW
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // VAPID public key — safe to expose (it's the public part of the keypair).
      // Fallback hardcoded for environments where the env var isn't injected into the client bundle.
      const vapidPublicKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        "BN_GburDTrFQLFL5wVGzJcfQBoL578Y0ZbPmkVcb6YeRUJpOBMfNR4w6u9skOHwu7E17vxILc2LM2B6GnN8VcUk";
      if (!vapidPublicKey) {
        throw new Error("Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY en .env");
      }

      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      if (!res.ok) throw new Error("Error guardando suscripción");

      setSubscribed(true);
      toast.success("¡Notificaciones activadas!");
    } catch (err) {
      // Usar console.warn en lugar de console.error para evitar el overlay de error en Next.js
      console.warn("Error de suscripción push:", err);
      
      if (err instanceof DOMException && err.name === "AbortError" && err.message.includes("push service error")) {
        toast.error("Servicio de notificaciones bloqueado por el navegador (ej. Brave). Habilítalo en la configuración de privacidad.");
      } else {
        toast.error(err instanceof Error ? err.message : "Error al configurar notificaciones");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleTest() {
    toast.promise(
      fetch("/api/push/test", { method: "POST" }).then(async res => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Error del servidor (${res.status})`);
        }
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Error procesando notificación");
      }),
      {
        loading: "Enviando prueba...",
        success: "Notificación enviada",
        error: (err) => err?.message || "Error enviando notificación",
      }
    );
  }

  const Icon = subscribed ? BellRing : Bell;

  return (
    <div className={cn("group relative flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[#1F2229] p-5", className)}>

      <div className="relative flex items-start justify-between">
        <div className={cn(
          "flex size-10 items-center justify-center rounded-2xl ring-1 transition-all",
          subscribed
            ? "bg-fuchsia-500/20 text-fuchsia-400 ring-fuchsia-500/40"
            : "bg-white/[0.04] text-slate-400 ring-white/[0.06]",
        )}>
          {loading ? <Loader2 className="size-5 animate-spin" /> : <Icon className="size-5" />}
        </div>
        
        {subscribed && (
          <button 
            onClick={handleTest}
            className="text-[10px] text-fuchsia-400 font-semibold uppercase tracking-widest hover:text-fuchsia-300 hover:underline"
          >
            Probar
          </button>
        )}
      </div>

      <div className="relative mt-auto flex flex-col gap-1.5 pt-6">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-fuchsia-400/70">
          Reminders
        </span>
        <h3 className="font-heading text-lg font-semibold text-foreground">
          Notificaciones
        </h3>
        <p className="text-sm text-muted-foreground">
          Recibe alertas de vencimientos de tarjetas y topes de gastos.
        </p>

        <button
          type="button"
          onClick={handleToggle}
          disabled={loading}
          className="mt-3 inline-flex w-fit items-center gap-2"
        >
          <div
            className={cn(
              "relative h-6 w-11 rounded-full border transition-all duration-200",
              subscribed
                ? "border-fuchsia-500/40 bg-fuchsia-500/20"
                : "border-white/[0.08] bg-[#1A1D24]",
            )}
          >
            <motion.div
              animate={{ x: subscribed ? 20 : 2 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={cn(
                "absolute top-0.5 size-5 rounded-full shadow-sm transition-colors",
                subscribed
                  ? "bg-fuchsia-400 shadow-fuchsia-500/30"
                  : "bg-muted-foreground/40",
              )}
            />
          </div>
          <span className={cn(
            "text-xs font-medium transition-colors",
            subscribed ? "text-fuchsia-300" : "text-muted-foreground/60",
          )}>
            {permission === "denied" ? "bloqueado" : subscribed ? "activado" : "desactivado"}
          </span>
        </button>
      </div>
    </div>
  );
}

// Utility to convert Base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
