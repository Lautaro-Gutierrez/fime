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
          title: "Control de Gastos Diarios",
          message: `El promedio de gasto actual es significativamente superior al del mes anterior. Se recomienda moderar los consumos no esenciales para evitar comprometer la liquidez antes de la finalización del periodo.`,
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
          title: "Control de Gastos Diarios",
          message: `El promedio de gasto actual es superior al del mes anterior. Es recomendable revisar las categorías de mayor consumo para mantener el equilibrio financiero del mes.`,
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
            title: `Aumento de Gastos en ${catName}`,
            message: `Se registra un incremento del ${increasePct}% en la categoría de ${catName} en comparación con el mes anterior ($${Math.round(amount).toLocaleString("es-AR")} frente a $${Math.round(prevAmount).toLocaleString("es-AR")}). Se aconseja evaluar si este comportamiento corresponde a una necesidad puntual o requiere corrección.`,
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
          title: "Revisión de Gastos Fijos",
          message: `Los gastos fijos representan el ${Math.round(ratio)}% de los ingresos de este mes, superando la recomendación general del 60%. Reducir suscripciones o servicios no esenciales ayuda a liberar capacidad de ahorro.`,
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
          title: "Optimización de Suscripciones",
          message: `El gasto acumulado en suscripciones activas alcanza los $${Math.round(subExpense).toLocaleString("es-AR")}. Revisar y dar de baja aquellos servicios de poco uso liberará dinero disponible cada mes.`,
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
          title: "Revisión de Gastos Fijos",
          message: `Los gastos fijos han superado lo planificado para el mes en $${Math.round(diff).toLocaleString("es-AR")}. Reducir suscripciones o servicios no esenciales ayuda a liberar capacidad de ahorro.`,
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
          title: "Control de Gastos Variables",
          message: `Los gastos de carácter variable superan la asignación definida en $${Math.round(diff).toLocaleString("es-AR")}. Se sugiere adecuar los consumos eventuales para mantener el equilibrio del mes.`,
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
            title: "Concentración de Consumo",
            message: `La categoría "${catName}" representa el ${Math.round(pct)}% de los egresos acumulados del mes. Monitorear este rubro central permitirá identificar oportunidades eficientes de ahorro estructural.`,
            dismissible: true,
            createdAt: new Date().toISOString(),
          };
        }
      }

      return null;
    },
  },
  // 7. gastos-savings-progress
  {
    id: "gastos-savings-progress",
    module: "gastos",
    evaluate: (ctx): SmartInsight | null => {
      const totalIncome = ctx.incomes.reduce((acc, i) => acc + i.amount_ars, 0);
      const totalExpense = ctx.expenses.reduce((acc, e) => acc + e.amount, 0);
      if (totalIncome <= 0) return null;

      const expensePct = (totalExpense / totalIncome) * 100;
      if (expensePct < 40 && ctx.dayOfMonth >= 15) {
        return {
          id: `gastos-savings-progress-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "gastos-savings-progress",
          module: "gastos",
          category: "achievement",
          priority: "medium",
          title: "Control de Gastos",
          message: "El nivel de egresos actual se mantiene significativamente por debajo del volumen de ingresos. Mantener este margen financiero consolidará el patrimonio mensual para futuras inversiones.",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 8. gastos-favorable-trend
  {
    id: "gastos-favorable-trend",
    module: "gastos",
    evaluate: (ctx): SmartInsight | null => {
      const totalExpense = ctx.expenses.reduce((acc, e) => acc + e.amount, 0);
      const totalPrevExpense = ctx.expensesPrevMonth.reduce((acc, e) => acc + e.amount, 0);
      const daysInPrevMonth = getDaysInMonth(subMonths(ctx.currentMonth, 1));
      
      const dailyPace = ctx.dayOfMonth > 0 ? totalExpense / ctx.dayOfMonth : 0;
      const prevDailyPace = totalPrevExpense / daysInPrevMonth;

      if (prevDailyPace <= 0 || dailyPace <= 0) return null;

      const ratio = dailyPace / prevDailyPace;
      if (ratio < 0.9 && ctx.dayOfMonth >= 10) {
        return {
          id: `gastos-favorable-trend-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "gastos-favorable-trend",
          module: "gastos",
          category: "achievement",
          priority: "medium",
          title: "Tendencia Favorable de Gasto",
          message: "El promedio de gasto diario actual registra una disminución respecto al mes anterior. Mantener esta constancia en tus consumos facilitará un cierre de mes con mayor saldo a favor.",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 9. gastos-variable-efficiency
  {
    id: "gastos-variable-efficiency",
    module: "gastos",
    evaluate: (ctx): SmartInsight | null => {
      const dist = ctx.compositeDistribution;
      if (!dist) return null;

      const totalIncome = ctx.incomes.reduce((acc, i) => acc + i.amount_ars, 0);
      if (totalIncome <= 0) return null;

      const variableExpense = ctx.expenses
        .filter((e) => e.type === "variable")
        .reduce((acc, e) => acc + e.amount, 0);

      const variableBudget = totalIncome * (dist.variable_pct / 100);
      if (variableBudget <= 0) return null;

      const variablePct = (variableExpense / variableBudget) * 100;
      if (variablePct < 30 && ctx.dayOfMonth >= 15) {
        return {
          id: `gastos-var-efficiency-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "gastos-variable-efficiency",
          module: "gastos",
          category: "tip",
          priority: "low",
          title: "Gestión Eficiente de Gastos Variables",
          message: "Se observa una asignación muy conservadora en los gastos variables a esta altura del mes. Este control riguroso de consumos eventuales contribuye a fortalecer el fondo de reserva.",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
];
