"use client";

import { useState } from "react";
import { usePrefsContext } from "@/components/providers/preferences-provider";
import { PROFILE_RESULTS } from "@/lib/investor-profile";
import { InvestorProfileTest } from "./investor-profile-test";
import { Button } from "@/components/ui/button";
import { TrendingUp, Sparkles, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function InvestorProfileCard() {
  const { investorProfile, investorProfileCompletedAt } = usePrefsContext();
  const [modalOpen, setModalOpen] = useState(false);

  const hasProfile = investorProfile !== null;
  const resultDetails = hasProfile ? PROFILE_RESULTS[investorProfile] : null;

  const formattedDate = investorProfileCompletedAt
    ? new Date(investorProfileCompletedAt).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

  return (
    <>
      <div className="rounded-xl border border-white/[0.06] bg-[#1A1D24]/30 p-4 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="size-3.5 text-fuchsia-400" />
              Perfil de Inversor
            </span>
            <p className="text-[11px] text-slate-500 max-w-md mt-0.5">
              Definí tu tolerancia al riesgo para que el motor de Smart Insights adapte sus recomendaciones a tu perfil financiero (Estilo ALyC Argentina).
            </p>
          </div>

          {hasProfile && resultDetails && (
            <div
              className={cn(
                "px-3 py-1 rounded-full border text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 shrink-0",
                resultDetails.color
              )}
            >
              <span>{resultDetails.emoji}</span>
              <span>{resultDetails.name}</span>
            </div>
          )}
        </div>

        {hasProfile && resultDetails ? (
          <div className="rounded-lg bg-[#1A1D24]/60 border border-white/[0.04] p-3 flex flex-col gap-2">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {resultDetails.description}
            </p>
            {formattedDate && (
              <span className="text-[9px] text-slate-600 font-semibold uppercase tracking-wider">
                Completado el {formattedDate}
              </span>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-cyan-950/10 border border-cyan-500/10 p-3 flex items-start gap-2.5">
            <AlertCircle className="size-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-cyan-200">Test no realizado</span>
              <span className="text-[10px] text-cyan-400/80 leading-relaxed">
                Aún no has definido tu perfil. Los Smart Insights de inversiones usarán el perfil Moderado por defecto.
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => setModalOpen(true)}
            className={cn(
              "h-9 text-xs font-semibold px-4 rounded-xl transition-all flex items-center gap-1.5",
              hasProfile
                ? "bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] text-slate-300"
                : "bg-gradient-to-r from-[#d946ef] to-[#06b6d4] hover:opacity-90 text-white shadow-md shadow-fuchsia-500/10 border-0"
            )}
          >
            {!hasProfile && <Sparkles className="size-3.5" />}
            {hasProfile ? "Rehacer Test" : "Hacer el Test"}
          </Button>
        </div>
      </div>

      <InvestorProfileTest open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
