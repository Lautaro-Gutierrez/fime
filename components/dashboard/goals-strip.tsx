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
    return <div className="rounded-3xl border border-white/5 bg-card/60 backdrop-blur p-6 h-48 animate-pulse" />;
  }

  if (activeQuests.length === 0) {
    return null; // Ocultar si no hay quests activas
  }

  return (
    <div className="rounded-3xl border border-white/5 bg-card/60 backdrop-blur p-6 relative overflow-hidden group hover:border-white/10 transition-colors">
      <Link href="/metas" className="absolute inset-0 z-10">
        <span className="sr-only">Go to Metas</span>
      </Link>

      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-amber-500" />
        <h3 className="text-lg font-medium text-foreground/80">Misiones Activas</h3>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x relative z-20 pointer-events-auto">
        {activeQuests.map(goal => {
          const progress = computeGoalProgress(goal, progressCtx);
          const rawPct = progress.rawPct;
          const pct = progress.pct;
          const color = goal.color || "#F59E0B"; // amber-500 fallback
          const isInverted = progress.isInverted;

          return (
            <div key={goal.id} className="snap-start shrink-0 flex flex-col items-center gap-3">
              <ProgressRing 
                pct={pct} 
                rawPct={rawPct} 
                size={120} 
                strokeWidth={8} 
                color={color}
                isInverted={isInverted}
                label={
                  <div className="flex flex-col items-center gap-0.5 mt-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-widest">{goal.icon || "🎯"}</span>
                    <span className="text-lg font-semibold tabular-nums leading-none">
                      {isStealthMode ? "***" : `${Math.round(pct)}%`}
                    </span>
                  </div>
                }
              />
              <div className="text-center max-w-[120px]">
                <div className="text-sm font-medium truncate">{goal.name}</div>
                <div className="text-xs text-muted-foreground">
                  {isStealthMode ? "******" : `${formatUSD(progress.current, false)} / ${formatUSD(progress.target, false)}`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
