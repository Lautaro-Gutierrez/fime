"use client";

import { useMemo } from "react";
import { useSmartInsights } from "@/hooks/use-smart-insights";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";

export function HealthGauge() {
  // We can reuse the queries from useSmartInsights as it loads all we need
  const { rawCtx, isLoading } = useSmartInsights();

  const score = useMemo(() => {
    if (isLoading || !rawCtx) return 0;

    const totalIncome = rawCtx.incomes.reduce((acc, i) => acc + i.amount_ars, 0);
    const totalExpense = rawCtx.expenses.reduce((acc, e) => acc + e.amount, 0);
    const fixedExpense = rawCtx.expenses.filter(e => e.type === "fixed").reduce((acc, e) => acc + e.amount, 0);

    // 1. Tasa de Ahorro (25%)
    let savingsRateScore = 20; // < 10%
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
    if (savingsRate > 20) savingsRateScore = 100;
    else if (savingsRate >= 15) savingsRateScore = 80;
    else if (savingsRate >= 10) savingsRateScore = 50;

    // 2. Diversificación Portfolio HHI (20%)
    let hhiScore = 10; // > 0.40 or empty
    const portfolioTotal = rawCtx.portfolioTotals.total_usd;
    if (portfolioTotal > 0) {
      let hhi = 0;
      for (const h of rawCtx.holdings) {
        const share = h.current_value_usd / portfolioTotal;
        hhi += share * share;
      }
      if (hhi < 0.15) hhiScore = 100;
      else if (hhi <= 0.25) hhiScore = 70;
      else if (hhi <= 0.40) hhiScore = 40;
    }

    // 3. Gastos Fijos / Ingreso (20%)
    let fixedRatioScore = 10; // > 60%
    if (totalIncome > 0) {
      const fixedRatio = (fixedExpense / totalIncome) * 100;
      if (fixedRatio < 40) fixedRatioScore = 100;
      else if (fixedRatio <= 50) fixedRatioScore = 70;
      else if (fixedRatio <= 60) fixedRatioScore = 40;
    } else if (fixedExpense === 0) {
      fixedRatioScore = 100; // No income, no fixed expenses
    }

    // 4. Progreso de Metas (20%)
    let metasScore = 50; // Neutral if no goals
    let activeGoalsCount = 0;
    let sumMetasPct = 0;
    for (const goal of rawCtx.goals) {
      if (goal.status === "active") {
        const p = rawCtx.goalProgresses.get(goal.id);
        if (p) sumMetasPct += p.pct;
        activeGoalsCount++;
      }
    }
    if (activeGoalsCount > 0) {
      metasScore = sumMetasPct / activeGoalsCount;
    }

    // 5. Consistencia de Registro (15%)
    const uniqueExpenseDays = new Set(rawCtx.expenses.map(e => e.date)).size;
    // Expected days: roughly 1 expense per day? Or just the proportion of days we logged something vs passed days.
    // If it's the start of the month (e.g. day 1 or 2), we shouldn't penalize too much.
    // Let's cap dayOfMonth to max 1 for division.
    const daysPassed = Math.max(1, rawCtx.dayOfMonth);
    // Realistically you don't log expenses EVERY day, maybe logging 1/3 of the days is good enough?
    // Let's use the proportion directly but cap it. If they logged on half the days, they get 100%.
    const consistencyScore = Math.min(100, (uniqueExpenseDays / (daysPassed * 0.5)) * 100);

    // Final weighted score
    const finalScore = 
      (savingsRateScore * 0.25) +
      (hhiScore * 0.20) +
      (fixedRatioScore * 0.20) +
      (metasScore * 0.20) +
      (consistencyScore * 0.15);

    return Math.round(finalScore);
  }, [isLoading, rawCtx]);

  if (isLoading) {
    return (
      <div className="h-full min-h-[200px] rounded-xl border border-white/5 bg-card/60 animate-pulse" />
    );
  }

  // Calculate rotation for the gauge needle/arc
  // Score is 0-100. We map it to -90 to 90 degrees for a semi-circle
  const rotation = -90 + (score / 100) * 180;

  let colorClass = "text-emerald-500";
  let label = "Excelente";
  if (score < 40) {
    colorClass = "text-rose-500";
    label = "Bajo";
  } else if (score < 65) {
    colorClass = "text-amber-500";
    label = "Medio";
  } else if (score < 80) {
    colorClass = "text-lime-500";
    label = "Bueno";
  }

  return (
    <div 
      className="flex h-full flex-col justify-between rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] p-5"
      style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center gap-2 text-white/60">
        <Activity className="size-4 animate-pulse" style={{ color: "#D0005F" }} />
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white">Salud Financiera</h3>
      </div>
      
      <div className="relative mt-6 flex aspect-[2/1] w-full flex-col items-center justify-end overflow-hidden">
        {/* SVG Semi-circle gauge */}
        <svg viewBox="0 0 200 100" className="absolute bottom-0 w-full">
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d946ef" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          {/* Background Arc */}
          <path
            d="M 10 100 A 90 90 0 0 1 190 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="16"
            strokeLinecap="round"
            className="text-white/10"
          />
          {/* Progress Arc */}
          <path
            d="M 10 100 A 90 90 0 0 1 190 100"
            fill="none"
            stroke="url(#gaugeGrad)"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray="283"
            strokeDashoffset={283 - (283 * score) / 100}
            className="transition-all duration-1000 ease-out"
            style={{ filter: "drop-shadow(0 0 4px rgba(139, 92, 246, 0.4))" }}
          />
        </svg>
        
        <div className="relative flex flex-col items-center pb-2">
          <span className="text-3xl font-bold tracking-tight text-white">{score}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/5 mt-1" style={{ color: score < 40 ? "#d946ef" : score < 70 ? "#8b5cf6" : "#06b6d4" }}>
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}
