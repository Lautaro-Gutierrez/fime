import type { InsightRule, SmartInsight } from "../types";
import { getDaysInMonth, subMonths } from "date-fns";
import { CATEGORIES_BY_ID } from "@/lib/categories";

export const gastosRules: InsightRule[] = [
  // 1. gastos-daily-pace
  {
    id: "gastos-daily-pace",
    module: "gastos",
    evaluate: (ctx): SmartInsight | null => {
      const totalExpense = ctx.expenses.reduce((acc, e) => acc + e.amount, 0);
      const totalPrevExpense = ctx.expensesPrevMonth.reduce((acc, e) => acc + e.amount, 0);

      const daysInPrevMonth = getDaysInMonth(subMonths(ctx.currentMonth, 1));
      
      const dailyPace = ctx.dayOfMonth > 0 ? totalExpense / ctx.dayOfMonth : 0;
      const prevDailyPace = totalPrevExpense / daysInPrevMonth;

      if (prevDailyPace <= 0 || dailyPace <= 0) return null;

      const ratio = dailyPace / prevDailyPace;

      if (ratio > 1.3) {
        return {
          id: `gastos-daily-pace-crit-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "gastos-daily-pace",
          module: "gastos",
          category: "warning",
          priority: "critical",
          title: "Ritmo de gasto crítico",
          message: `Tu promedio diario de gasto ($${Math.round(dailyPace).toLocaleString("es-AR")}) está un ${Math.round((ratio - 1) * 100)}% por encima del mes pasado.`,
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }

      if (ratio > 1.1) {
        return {
          id: `gastos-daily-pace-warn-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "gastos-daily-pace",
          module: "gastos",
          category: "warning",
          priority: "high",
          title: "Gasto diario acelerado",
          message: `Tu ritmo diario es un ${Math.round((ratio - 1) * 100)}% mayor al promedio diario del mes anterior.`,
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }

      return null;
    },
  },
  // 2. gastos-category-spike
  {
    id: "gastos-category-spike",
    module: "gastos",
    evaluate: (ctx): SmartInsight | null => {
      const expensesByCategory = ctx.expenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
      }, {} as Record<string, number>);

      const prevExpensesByCategory = ctx.expensesPrevMonth.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
      }, {} as Record<string, number>);

      for (const [cat, amount] of Object.entries(expensesByCategory)) {
        const prevAmount = prevExpensesByCategory[cat] || 0;
        // Solo disparar si el gasto es significativo (> 10000) y aumentó > 50%
        if (amount > 10000 && prevAmount > 0 && amount > prevAmount * 1.5) {
          const catConfig = CATEGORIES_BY_ID[cat as keyof typeof CATEGORIES_BY_ID];
          const catName = catConfig ? catConfig.label : cat;
          const increasePct = Math.round(((amount / prevAmount) - 1) * 100);

          return {
            id: `gastos-cat-spike-${cat}-${ctx.currentMonth.toISOString().slice(0, 7)}`,
            ruleId: "gastos-category-spike",
            module: "gastos",
            category: "warning",
            priority: "medium",
            title: `Aumento en ${catName}`,
            message: `Gastaste un ${increasePct}% más en ${catName} respecto al mes pasado ($${Math.round(amount).toLocaleString("es-AR")} vs $${Math.round(prevAmount).toLocaleString("es-AR")}).`,
            dismissible: true,
            createdAt: new Date().toISOString(),
          };
        }
      }

      return null;
    },
  },
  // 3. gastos-fixed-ratio
  {
    id: "gastos-fixed-ratio",
    module: "gastos",
    evaluate: (ctx): SmartInsight | null => {
      const totalIncome = ctx.incomes.reduce((acc, i) => acc + i.amount_ars, 0);
      if (totalIncome <= 0) return null;

      const fixedExpense = ctx.expenses
        .filter((e) => e.type === "fixed")
        .reduce((acc, e) => acc + e.amount, 0);

      const ratio = (fixedExpense / totalIncome) * 100;
      // Límite del plan aprobado: 60%
      if (ratio > 60) {
        return {
          id: `gastos-fixed-ratio-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "gastos-fixed-ratio",
          module: "gastos",
          category: "warning",
          priority: "high",
          title: "Gastos fijos elevados",
          message: `Tus gastos fijos representan el ${Math.round(ratio)}% de tus ingresos, superando el límite del 60% recomendado.`,
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }

      return null;
    },
  },
  // 4. gastos-subscription-review
  {
    id: "gastos-subscription-review",
    module: "gastos",
    evaluate: (ctx): SmartInsight | null => {
      // Sumar los gastos que son suscripciones
      const subExpense = ctx.expenses
        .filter((e) => e.is_subscription)
        .reduce((acc, e) => acc + e.amount, 0);

      // Si gasta más de $15,000 ARS en suscripciones
      if (subExpense > 15000) {
        return {
          id: `gastos-sub-review-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "gastos-subscription-review",
          module: "gastos",
          category: "tip",
          priority: "low",
          title: "Revisá tus suscripciones",
          message: `Tenés $${Math.round(subExpense).toLocaleString("es-AR")} acumulados en suscripciones. Evaluá dar de baja las que no uses.`,
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }

      return null;
    },
  },
  // 5. gastos-budget-exceeded
  {
    id: "gastos-budget-exceeded",
    module: "gastos",
    evaluate: (ctx): SmartInsight | null => {
      const dist = ctx.compositeDistribution;
      if (!dist) return null;

      const totalIncome = ctx.incomes.reduce((acc, i) => acc + i.amount_ars, 0);
      if (totalIncome <= 0) return null;

      const fixedExpense = ctx.expenses
        .filter((e) => e.type === "fixed")
        .reduce((acc, e) => acc + e.amount, 0);

      const variableExpense = ctx.expenses
        .filter((e) => e.type === "variable")
        .reduce((acc, e) => acc + e.amount, 0);

      const fixedBudget = totalIncome * (dist.fixed_pct / 100);
      const variableBudget = totalIncome * (dist.variable_pct / 100);

      if (fixedExpense > fixedBudget + 5000) {
        const diff = fixedExpense - fixedBudget;
        return {
          id: `gastos-budget-exceed-fixed-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "gastos-budget-exceeded",
          module: "gastos",
          category: "warning",
          priority: "high",
          title: "Presupuesto fijos superado",
          message: `Excediste tu presupuesto teórico de gastos fijos por $${Math.round(diff).toLocaleString("es-AR")} ($${Math.round(fixedExpense).toLocaleString("es-AR")} vs $${Math.round(fixedBudget).toLocaleString("es-AR")}).`,
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }

      if (variableExpense > variableBudget + 5000) {
        const diff = variableExpense - variableBudget;
        return {
          id: `gastos-budget-exceed-var-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "gastos-budget-exceeded",
          module: "gastos",
          category: "warning",
          priority: "medium",
          title: "Presupuesto variables superado",
          message: `Excediste tu presupuesto de gastos variables por $${Math.round(diff).toLocaleString("es-AR")} ($${Math.round(variableExpense).toLocaleString("es-AR")} vs $${Math.round(variableBudget).toLocaleString("es-AR")}).`,
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }

      return null;
    },
  },
  // 6. gastos-category-concentration
  {
    id: "gastos-category-concentration",
    module: "gastos",
    evaluate: (ctx): SmartInsight | null => {
      const totalExpense = ctx.expenses.reduce((acc, e) => acc + e.amount, 0);
      if (totalExpense <= 0) return null;

      const expensesByCategory = ctx.expenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
      }, {} as Record<string, number>);

      for (const [cat, amount] of Object.entries(expensesByCategory)) {
        const pct = (amount / totalExpense) * 100;
        if (pct > 40) {
          const catConfig = CATEGORIES_BY_ID[cat as keyof typeof CATEGORIES_BY_ID];
          const catName = catConfig ? catConfig.label : cat;

          return {
            id: `gastos-concentration-${cat}-${ctx.currentMonth.toISOString().slice(0, 7)}`,
            ruleId: "gastos-category-concentration",
            module: "gastos",
            category: "tip",
            priority: "medium",
            title: "Concentración de gastos",
            message: `La categoría "${catName}" concentra el ${Math.round(pct)}% de todos tus gastos del mes.`,
            dismissible: true,
            createdAt: new Date().toISOString(),
          };
        }
      }

      return null;
    },
  },
];
