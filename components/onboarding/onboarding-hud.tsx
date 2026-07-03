"use client";

import { useEffect, useState } from "react";
import { useOnboarding } from "./onboarding-provider";
import { getTourSteps, type OnboardingStep } from "./tours";
import { useRouter, usePathname } from "next/navigation";
import { Settings, Play, RefreshCw, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TOURS = [
  { id: "dashboard", name: "Dashboard (Inicio)", route: "/" },
  { id: "gastos", name: "Gastos", route: "/gastos" },
  { id: "inversiones", name: "Inversiones", route: "/inversiones" },
  { id: "ingresos", name: "Ingresos", route: "/ingresos" },
  { id: "metas", name: "Metas", route: "/metas" },
  { id: "configuracion", name: "Configuración", route: "/config" },
];

export function OnboardingHUD() {
  // Solo renderizar en desarrollo
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const { startTour, restartAll } = useOnboarding();
  const router = useRouter();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedTourId, setSelectedTourId] = useState("dashboard");
  const [domStatus, setDomStatus] = useState<Record<string, boolean>>({});

  // Obtener los pasos del tour seleccionado
  const steps = getTourSteps(selectedTourId, false); // usar desktop para diagnóstico general

  // Chequear periódicamente la existencia de los selectores en el DOM
  useEffect(() => {
    const checkDom = () => {
      const status: Record<string, boolean> = {};
      steps.forEach((step) => {
        if (step.type === "spotlight" && step.targetSelector) {
          const el = document.querySelector(step.targetSelector);
          status[step.id] = !!el;
        }
      });
      setDomStatus(status);
    };

    checkDom();
    const interval = setInterval(checkDom, 800);
    return () => clearInterval(interval);
  }, [selectedTourId, steps]);

  const handleTeleport = (tourId: string, stepIndex: number, targetRoute: string) => {
    if (pathname !== targetRoute) {
      router.push(targetRoute);
      // Esperar a que la página cargue antes de iniciar el tour
      setTimeout(() => {
        startTour(tourId, stepIndex);
      }, 500);
    } else {
      startTour(tourId, stepIndex);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-[999] flex size-10 items-center justify-center rounded-full border border-yellow-500/30 bg-yellow-950/80 text-yellow-400 shadow-lg shadow-black/50 transition-all hover:bg-yellow-900/90 hover:scale-105"
        title="Diagnóstico de Onboarding"
      >
        <Settings className="size-5 animate-spin-slow" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[999] flex w-80 flex-col rounded-xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl shadow-black/80 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-1.5 text-yellow-400">
          <AlertTriangle className="size-4" />
          <span className="text-xs font-bold uppercase tracking-wider">HUD de Tours</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded-lg p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Select Tour */}
      <div className="mt-3">
        <label className="text-[10px] font-semibold uppercase text-muted-foreground">Módulo</label>
        <select
          value={selectedTourId}
          onChange={(e) => setSelectedTourId(e.target.value)}
          className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-foreground outline-none"
        >
          {TOURS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Steps List */}
      <div className="mt-3 flex flex-col gap-2 max-h-48 overflow-y-auto">
        <label className="text-[10px] font-semibold uppercase text-muted-foreground">Pasos del Tour</label>
        {steps.length === 0 ? (
          <span className="text-xxs text-muted-foreground">No hay pasos definidos.</span>
        ) : (
          steps.map((step, idx) => {
            const tour = TOURS.find((t) => t.id === selectedTourId);
            const isModal = step.type === "modal";
            const exists = domStatus[step.id];

            return (
              <div
                key={step.id}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-2 text-xxs transition-all hover:bg-white/[0.04]"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-foreground">
                    {idx + 1}. {step.title}
                  </span>
                  <span className="text-xxs font-mono text-muted-foreground">
                    {isModal ? "Modo Central" : step.targetSelector}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 pl-2 shrink-0">
                  {isModal ? (
                    <span className="text-[9px] rounded-md bg-white/10 px-1 py-0.5 text-white/70">
                      Modal
                    </span>
                  ) : exists ? (
                    <span title="Elemento en DOM">
                      <CheckCircle2 className="size-3.5 text-green-500" />
                    </span>
                  ) : (
                    <span title="FALTA ELEMENTO">
                      <AlertTriangle className="size-3.5 text-red-500" />
                    </span>
                  )}

                  <button
                    onClick={() => tour && handleTeleport(selectedTourId, idx, tour.route)}
                    className="flex size-6 items-center justify-center rounded bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                    title="Teletransportarse e iniciar aquí"
                  >
                    <Play className="size-3 fill-current" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Global Actions */}
      <div className="mt-3 flex gap-2 border-t border-white/10 pt-3">
        <button
          onClick={restartAll}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-1.5 text-xxs font-medium text-foreground hover:bg-white/10"
        >
          <RefreshCw className="size-3" />
          Resetear Todos
        </button>
      </div>
    </div>
  );
}
