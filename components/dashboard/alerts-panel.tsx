"use client";

import { useMemo } from "react";
import { useGoals } from "@/hooks/use-goals";
import { useExpenses } from "@/hooks/use-expenses";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useDashboardAlerts } from "@/lib/dashboard/alerts";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import Link from "next/link";
import { usePrefsContext } from "@/components/providers/preferences-provider";

export function AlertsPanel() {
  const currentMonth = useMemo(() => new Date(), []);
  const goalsQ = useGoals();
  const expensesQ = useExpenses(currentMonth);
  const portfolio = usePortfolio();
  const { stealthMode: isStealthMode } = usePrefsContext();

  const alerts = useDashboardAlerts({
    goals: goalsQ.data ?? [],
    expenses: expensesQ.data ?? [],
    holdings: portfolio.holdings ?? [],
  });

  const isLoading = goalsQ.isLoading || expensesQ.isLoading || portfolio.isLoading;

  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-hidden h-12 w-full animate-pulse opacity-50">
        <div className="h-8 w-48 bg-white/10 rounded-full" />
        <div className="h-8 w-64 bg-white/10 rounded-full" />
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="flex gap-2 items-center text-sm text-muted-foreground bg-white/5 border border-white/[0.08] rounded-full px-4 py-2 w-max">
        <Info className="w-4 h-4" />
        No hay alertas activas. Todo en orden.
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
      {alerts.map((alert) => {
        const isCritical = alert.level === "critical";
        const isWarning = alert.level === "warning";
        
        const Icon = isCritical ? AlertCircle : isWarning ? AlertTriangle : Info;
        
        // Colors
        const baseColorClass = isCritical 
          ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20" 
          : isWarning 
            ? "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20" 
            : "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20";

        return (
          <Link 
            key={alert.id}
            href={alert.href}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm border transition-colors whitespace-nowrap snap-start shrink-0 ${baseColorClass}`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="font-medium">{alert.title}</span>
            <span className="text-current/70 border-l border-current/20 pl-2">
              {isStealthMode ? "Información oculta" : alert.description}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
