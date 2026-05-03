import { useMemo } from "react";
import type { Goal } from "@/hooks/use-goals";
import type { Expense } from "@/hooks/use-expenses";
import type { ValuedHolding } from "@/lib/portfolio/holdings";

export type AlertLevel = "critical" | "warning" | "info";

export type DashboardAlert = {
  id: string;
  type: string;
  level: AlertLevel;
  title: string;
  description: string;
  href: string; // deep link al modulo
};

type UseAlertsProps = {
  goals: Goal[];
  expenses: Expense[];
  holdings: ValuedHolding[];
};

export function useDashboardAlerts({ goals, expenses, holdings }: UseAlertsProps) {
  return useMemo(() => {
    const alerts: DashboardAlert[] = [];

    // 1. & 2. Metas (Goals)
    const now = new Date();
    for (const goal of goals) {
      if (goal.status !== "active") continue;
      
      const pct = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
      
      if (goal.deadline) {
        const deadlineDate = new Date(goal.deadline);
        const diffTime = deadlineDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Meta próxima a vencer (<30 días y <80%)
        if (diffDays > 0 && diffDays <= 30 && pct < 80) {
          alerts.push({
            id: `goal-deadline-${goal.id}`,
            type: "goal_deadline",
            level: "warning",
            title: "Meta próxima a vencer",
            description: `La meta "${goal.name}" vence en ${diffDays} días y está al ${pct.toFixed(0)}%.`,
            href: "/metas",
          });
        }
        
        // Pacing negativo (muy atrasado para el tiempo transcurrido)
        const startDate = new Date(goal.started_at);
        const totalDuration = deadlineDate.getTime() - startDate.getTime();
        const elapsed = now.getTime() - startDate.getTime();
        const timePct = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;
        
        if (timePct > pct + 20) { // 20% por detrás del tiempo ideal
          alerts.push({
            id: `goal-pacing-${goal.id}`,
            type: "goal_pacing",
            level: "info",
            title: "Meta atrasada",
            description: `Vas un poco atrasado con "${goal.name}".`,
            href: "/metas",
          });
        }
      }
    }

    // 3. Gastos excedidos (Simplificado: una categoría representa más del 50% del gasto total del mes)
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const expensesByCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);

    for (const [category, amount] of Object.entries(expensesByCategory)) {
      if (totalExpenses > 0 && amount > totalExpenses * 0.5) {
        alerts.push({
          id: `expense-high-${category}`,
          type: "expense_high",
          level: "warning",
          title: "Gasto concentrado",
          description: `La categoría ${category} representa el ${((amount/totalExpenses)*100).toFixed(0)}% de tus gastos.`,
          href: "/gastos",
        });
      }
    }

    // 4. Portfolio concentrado (>30% en un activo)
    for (const holding of holdings) {
      if (holding.weight_pct > 30 && holding.asset_type !== "usd_cash" && (holding.asset_type as string) !== "ars_cash") {
        alerts.push({
          id: `portfolio-concentration-${holding.key}`,
          type: "portfolio_concentration",
          level: "info",
          title: "Portfolio concentrado",
          description: `Tenés el ${holding.weight_pct.toFixed(1)}% de tu portfolio en ${holding.ticker || holding.label}.`,
          href: "/portfolio",
        });
      }
    }

    // Sort by priority (critical > warning > info)
    const priorityMap = { critical: 3, warning: 2, info: 1 };
    alerts.sort((a, b) => priorityMap[b.level] - priorityMap[a.level]);

    return alerts;
  }, [goals, expenses, holdings]);
}
