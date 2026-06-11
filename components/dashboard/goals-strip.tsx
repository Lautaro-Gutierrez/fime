"use client";

import { useMemo } from "react";
import { useGoals } from "@/hooks/use-goals";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useIncomes } from "@/hooks/use-incomes";
import { useExpenses } from "@/hooks/use-expenses";
import { usePrefsContext } from "@/components/providers/preferences-provider";
import { formatUSD } from "@/lib/format";
import { ProgressRing } from "@/components/metas/progress-ring";
import { Target } from "lucide-react";
import Link from "next/link";
import { computeGoalProgress } from "@/lib/goals/progress";

export function GoalsStrip() {
  const { stealthMode: isStealthMode } = usePrefsContext();
  const goalsQ = useGoals();
  const portfolio = usePortfolio();
  
  const currentMonth = useMemo(() => new Date(), []);
  const incomesQ = useIncomes(currentMonth);
  const expensesQ = useExpenses(currentMonth);

  const goals = goalsQ.data ?? [];
  const activeQuests = goals.filter(g => g.status === "active");

  const progressCtx = useMemo(() => {
    const expenses = expensesQ.data ?? [];
    const byCategory: Record<string, number> = {};
    let totalExp = 0;
    for (const e of expenses) {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + Number(e.amount);
      totalExp += Number(e.amount);
    }
    const incomesArs = (incomesQ.data ?? []).reduce(
      (s, i) => s + Number(i.amount_ars),
      0,
    );
    return {
      portfolioTotalUsd: portfolio.totals.total_usd,
      valuedHoldings: portfolio.holdings,
      expensesCurrentMonth: { byCategory, total: totalExp },
      incomesCurrentMonthArs: incomesArs,
    };
  }, [portfolio.totals.total_usd, portfolio.holdings, expensesQ.data, incomesQ.data]);

  if (goalsQ.isLoading || portfolio.isLoading) {
    return <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-6 h-48 animate-pulse" />;
  }

  if (activeQuests.length === 0) {
    return null; // Ocultar si no hay quests activas
  }

  return (
    <div 
      id="dashboard-goals-strip" 
      className="rounded-2xl p-5 border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] flex flex-col justify-between relative group" 
      style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)", height: "100%" }}
    >
      <Link href="/metas" className="absolute inset-0 z-10">
        <span className="sr-only">Go to Metas</span>
      </Link>

      <div className="w-full">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-white/60">
            <Target className="size-4" />
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white">Metas Principales</h3>
          </div>
          <span className="text-[10px] bg-violet-500/15 text-violet-400 px-2 py-0.5 rounded-full font-bold">
            {activeQuests.length} Activa{activeQuests.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {activeQuests.slice(0, 2).map(goal => {
            const progress = computeGoalProgress(goal, progressCtx);
            const pct = progress.pct;
            const color = goal.color || "#F59E0B";
            const isInverted = progress.isInverted;

            const remainingFormatted = isStealthMode
              ? "•••••• restantes"
              : progress.remaining > 0
                ? `${formatUSD(progress.remaining, false)} restantes`
                : "¡Meta alcanzada!";

            return (
              <div 
                key={goal.id} 
                className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 flex flex-col items-center text-center transition-all duration-300 hover:bg-white/[0.04]"
              >
                <div className="relative w-20 h-20 mb-3">
                  <ProgressRing 
                    pct={pct} 
                    rawPct={progress.rawPct} 
                    size={80} 
                    strokeWidth={6} 
                    color={color}
                    isInverted={isInverted}
                    label={null}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-white [font-feature-settings:'tnum']">
                      {isStealthMode ? "**" : `${Math.round(pct)}%`}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-white font-semibold leading-tight truncate w-full">{goal.name}</p>
                <p className="text-[10px] text-slate-500 mt-1 [font-feature-settings:'tnum'] truncate w-full">
                  {isStealthMode ? "••••••" : `${formatUSD(progress.current, false)} / ${formatUSD(progress.target, false)}`}
                </p>
                <p className="text-[10px] text-amber-400 font-medium [font-feature-settings:'tnum'] mt-0.5 truncate w-full">
                  {remainingFormatted}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
