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
  // 10. gastos-month-improvement
  {
    id: "gastos-month-improvement",
    module: "gastos",
    evaluate: (ctx): SmartInsight | null => {
      if (ctx.dayOfMonth < 10) return null;
      if (ctx.expensesPrevMonth.length === 0) return null;

      const totalExpense = ctx.expenses.reduce((acc, e) => acc + e.amount, 0);
      const prevProrated = ctx.expensesPrevMonth.reduce((acc, e) => acc + e.amount, 0)
        * (ctx.dayOfMonth / getDaysInMonth(subMonths(ctx.currentMonth, 1)));

      if (prevProrated > 0 && totalExpense < prevProrated * 0.9) {
        return {
          id: `gastos-month-improvement-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "gastos-month-improvement",
          module: "gastos",
          category: "achievement",
          priority: "medium",
          title: "Gastás menos que el mes pasado",
          message: `A esta altura del mes, tu gasto total es menor al del mes anterior. Excelente señal de que estás administrando mejor tu dinero.`,
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 11. gastos-unexpected-spike
  {
    id: "gastos-unexpected-spike",
    module: "gastos",
    evaluate: (ctx): SmartInsight | null => {
      const unexpected = ctx.expenses
        .filter((e) => e.category === "imprevistos")
        .reduce((acc, e) => acc + e.amount, 0);

      if (unexpected > 20000) {
        return {
          id: `gastos-unexpected-spike-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "gastos-unexpected-spike",
          module: "gastos",
          category: "warning",
          priority: "medium",
          title: "Tuviste un gasto no esperado",
          message: `Este mes registraste $${Math.round(unexpected).toLocaleString("es-AR")} en gastos no previstos. Si esto se repite con frecuencia, puede ser útil reservar una pequeña suma mensual para cubrir este tipo de situaciones.`,
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 12. gastos-credit-card-heavy
  {
    id: "gastos-credit-card-heavy",
    module: "gastos",
    evaluate: (ctx): SmartInsight | null => {
      const total = ctx.expenses.reduce((acc, e) => acc + e.amount, 0);
      if (total <= 0) return null;

      const cardExpenses = ctx.expenses
        .filter((e) => e.card_id !== null)
        .reduce((acc, e) => acc + e.amount, 0);

      const pct = Math.round((cardExpenses / total) * 100);
      if (pct > 50) {
        return {
          id: `gastos-cc-heavy-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "gastos-credit-card-heavy",
          module: "gastos",
          category: "tip",
          priority: "low",
          title: "Más de la mitad de tus gastos son con tarjeta",
          message: `El ${pct}% de tus gastos de este mes se realizaron con tarjeta de crédito. Recordá pagar el resumen a tiempo para evitar intereses.`,
          href: "/gastos",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 13. gastos-no-variable-expenses
  {
    id: "gastos-no-variable-expenses",
    module: "gastos",
    evaluate: (ctx): SmartInsight | null => {
      if (ctx.dayOfMonth <= 5) return null;
      const hasVariable = ctx.expenses.some((e) => e.type === "variable");
      if (!hasVariable && ctx.expenses.length > 0) {
        return {
          id: `gastos-no-variable-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "gastos-no-variable-expenses",
          module: "gastos",
          category: "reminder",
          priority: "low",
          title: "Sin gastos del día a día registrados",
          message: "No registraste ningún gasto variable este mes (salidas, compras, delivery, etc.). Anotarlos te ayuda a ver exactamente adónde va tu dinero.",
          href: "/gastos",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 14. gastos-variable-good-month
  {
    id: "gastos-variable-good-month",
    module: "gastos",
    evaluate: (ctx): SmartInsight | null => {
      if (ctx.dayOfMonth < 15) return null;
      const dist = ctx.compositeDistribution;
      if (!dist) return null;

      const totalIncome = ctx.incomes.reduce((acc, i) => acc + i.amount_ars, 0);
      if (totalIncome <= 0) return null;

      const variableExpense = ctx.expenses
        .filter((e) => e.type === "variable")
        .reduce((acc, e) => acc + e.amount, 0);
      const variableBudget = totalIncome * (dist.variable_pct / 100);
      if (variableBudget <= 0) return null;

      const pct = Math.round((variableExpense / variableBudget) * 100);
      if (pct < 60 && variableExpense > 0) {
        return {
          id: `gastos-var-good-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "gastos-variable-good-month",
          module: "gastos",
          category: "achievement",
          priority: "medium",
          title: "Controlaste muy bien los gastos del día a día",
          message: `Llevás solo el ${pct}% de lo planificado para gastos variables. Mantener este control te deja más dinero disponible para ahorrar o invertir.`,
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 15. gastos-food-high
  {
    id: "gastos-food-high",
    module: "gastos",
    evaluate: (ctx): SmartInsight | null => {
      const total = ctx.expenses.reduce((acc, e) => acc + e.amount, 0);
      if (total <= 0) return null;

      const foodExpense = ctx.expenses
        .filter((e) => e.category === "comida")
        .reduce((acc, e) => acc + e.amount, 0);

      const pct = Math.round((foodExpense / total) * 100);
      if (foodExpense > 30000 && pct > 30) {
        return {
          id: `gastos-food-high-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "gastos-food-high",
          module: "gastos",
          category: "tip",
          priority: "low",
          title: "Gran parte de tus gastos van a comida",
          message: `La comida representa el ${pct}% de todo lo que gastás este mes ($${Math.round(foodExpense).toLocaleString("es-AR")}). Planificar las compras o cocinar en casa puede generar un ahorro significativo.`,
          href: "/gastos",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 16. gastos-end-of-month-tight
  {
    id: "gastos-end-of-month-tight",
    module: "gastos",
    evaluate: (ctx): SmartInsight | null => {
      const daysLeft = ctx.daysInMonth - ctx.dayOfMonth;
      if (daysLeft > 5) return null;

      const totalIncome = ctx.incomes.reduce((acc, i) => acc + i.amount_ars, 0);
      const totalExpense = ctx.expenses.reduce((acc, e) => acc + e.amount, 0);
      if (totalIncome <= 0) return null;

      const pct = Math.round((totalExpense / totalIncome) * 100);
      if (pct > 90) {
        return {
          id: `gastos-eom-tight-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "gastos-end-of-month-tight",
          module: "gastos",
          category: "warning",
          priority: "high",
          title: "Queda poco mes y el dinero está ajustado",
          message: `Llevás gastado el ${pct}% de tus ingresos y todavía quedan ${daysLeft} día${daysLeft !== 1 ? "s" : ""}. Intentá moderar los consumos para cerrar el mes sin quedar en rojo.`,
          href: "/gastos",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 17. gastos-first-week-pace
  {
    id: "gastos-first-week-pace",
    module: "gastos",
    evaluate: (ctx): SmartInsight | null => {
      if (ctx.dayOfMonth < 3 || ctx.dayOfMonth > 7) return null;
      if (ctx.expensesPrevMonth.length === 0) return null;

      const totalExpense = ctx.expenses.reduce((acc, e) => acc + e.amount, 0);
      const daysInPrevMonth = getDaysInMonth(subMonths(ctx.currentMonth, 1));
      const prevMonthTotal = ctx.expensesPrevMonth.reduce((acc, e) => acc + e.amount, 0);
      const prevDailyAvg = prevMonthTotal / daysInPrevMonth;
      const currentDailyAvg = ctx.dayOfMonth > 0 ? totalExpense / ctx.dayOfMonth : 0;

      if (prevDailyAvg > 0 && currentDailyAvg < prevDailyAvg * 0.8) {
        return {
          id: `gastos-first-week-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "gastos-first-week-pace",
          module: "gastos",
          category: "tip",
          priority: "low",
          title: "Buen inicio de mes",
          message: "Tu ritmo de gasto en los primeros días del mes es moderado. Si continuás así, cerrarás el mes con un buen saldo disponible.",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 18. gastos-fixed-healthy
  {
    id: "gastos-fixed-healthy",
    module: "gastos",
    evaluate: (ctx): SmartInsight | null => {
      const totalIncome = ctx.incomes.reduce((acc, i) => acc + i.amount_ars, 0);
      if (totalIncome <= 0) return null;

      const fixedExpense = ctx.expenses
        .filter((e) => e.type === "fixed")
        .reduce((acc, e) => acc + e.amount, 0);

      const pct = Math.round((fixedExpense / totalIncome) * 100);
      if (fixedExpense > 0 && pct < 45) {
        return {
          id: `gastos-fixed-healthy-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "gastos-fixed-healthy",
          module: "gastos",
          category: "achievement",
          priority: "low",
          title: "Tus gastos fijos están bien organizados",
          message: `Tus gastos fijos representan el ${pct}% de tus ingresos, muy por debajo del límite del 60%. Eso te da más margen para ahorrar o darte un gusto.`,
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 19. gastos-category-drop
  {
    id: "gastos-category-drop",
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

      for (const [cat, prevAmount] of Object.entries(prevExpensesByCategory)) {
        const currentAmount = expensesByCategory[cat] || 0;
        if (prevAmount > 15000 && currentAmount > 0 && currentAmount < prevAmount * 0.7) {
          const catConfig = CATEGORIES_BY_ID[cat as keyof typeof CATEGORIES_BY_ID];
          const catName = catConfig ? catConfig.label : cat;
          const dropPct = Math.round((1 - currentAmount / prevAmount) * 100);

          return {
            id: `gastos-cat-drop-${cat}-${ctx.currentMonth.toISOString().slice(0, 7)}`,
            ruleId: "gastos-category-drop",
            module: "gastos",
            category: "achievement",
            priority: "medium",
            title: `Bajaste el gasto en ${catName}`,
            message: `El gasto en ${catName} bajó un ${dropPct}% respecto al mes anterior ($${Math.round(currentAmount).toLocaleString("es-AR")} este mes vs $${Math.round(prevAmount).toLocaleString("es-AR")} el anterior). Un ahorro que suma.`,
            href: "/gastos",
            dismissible: true,
            createdAt: new Date().toISOString(),
          };
        }
      }
      return null;
    },
  },
];

