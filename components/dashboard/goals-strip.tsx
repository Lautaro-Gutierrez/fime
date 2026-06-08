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
    <div id="dashboard-goals-strip" className="rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-6 relative overflow-hidden group hover:border-white/10 transition-colors">
      <Link href="/metas" className="absolute inset-0 z-10">
        <span className="sr-only">Go to Metas</span>
      </Link>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-white/60">
          <Target className="size-4" />
          <h3 className="text-xs font-medium uppercase tracking-widest">Metas Principales</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-4">
        {activeQuests.slice(0, 4).map(goal => {
          const progress = computeGoalProgress(goal, progressCtx);
          const pct = progress.pct;
          const color = goal.color || "#F59E0B";
          const isInverted = progress.isInverted;

          return (
            <div key={goal.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] transition-colors relative group/goal">
              <Link href="/metas" className="absolute inset-0 z-10"><span className="sr-only">Go</span></Link>
              <div className="shrink-0 relative">
                <ProgressRing 
                  pct={pct} 
                  rawPct={progress.rawPct} 
                  size={42} 
                  strokeWidth={4} 
                  color={color}
                  isInverted={isInverted}
                  label={null}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[8px] font-bold">{isStealthMode ? "**" : `${Math.round(pct)}%`}</span>
                </div>
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <div className="text-xs font-semibold text-white/90 truncate">{goal.name}</div>
                <div className="text-[10px] text-white/40 truncate">
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
