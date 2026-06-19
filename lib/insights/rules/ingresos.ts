import type { InsightRule, SmartInsight } from "../types";

export const ingresosRules: InsightRule[] = [
  // 1. ing-distribution-drift
  {
    id: "ing-distribution-drift",
    module: "ingresos",
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

      const realFixedPct = (fixedExpense / totalIncome) * 100;
      const realVariablePct = (variableExpense / totalIncome) * 100;

      const diffFixed = Math.abs(realFixedPct - dist.fixed_pct);
      const diffVariable = Math.abs(realVariablePct - dist.variable_pct);

      if (diffFixed > 15 || diffVariable > 15) {
        return {
          id: `ing-drift-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "ing-distribution-drift",
          module: "ingresos",
          category: "warning",
          priority: "medium",
          title: "Presupuesto desviado",
          message: `Tus gastos reales en el mes se desvían de tu distribución ideal planificada (Fijos: ${Math.round(realFixedPct)}% vs plan: ${dist.fixed_pct}%, Variables: ${Math.round(realVariablePct)}% vs plan: ${dist.variable_pct}%).`,
          href: "/ingresos",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }

      return null;
    },
  },
  // 2. ing-income-drop
  {
    id: "ing-income-drop",
    module: "ingresos",
    evaluate: (ctx): SmartInsight | null => {
      if (ctx.incomesPrevMonth.length === 0) return null;

      const totalIncome = ctx.incomes.reduce((acc, i) => acc + i.amount_ars, 0);
      const totalPrevIncome = ctx.incomesPrevMonth.reduce((acc, i) => acc + i.amount_ars, 0);

      if (totalPrevIncome > 0 && totalIncome < totalPrevIncome * 0.8) {
        const dropPct = Math.round((1 - totalIncome / totalPrevIncome) * 100);
        return {
          id: `ing-drop-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "ing-income-drop",
          module: "ingresos",
          category: "warning",
          priority: "high",
          title: "Caída de ingresos",
          message: `Tus ingresos totales este mes bajaron un ${dropPct}% en comparación con el mes pasado ($${Math.round(totalIncome).toLocaleString("es-AR")} vs $${Math.round(totalPrevIncome).toLocaleString("es-AR")}).`,
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }

      return null;
    },
  },
  // 3. ing-income-growth
  {
    id: "ing-income-growth",
    module: "ingresos",
    evaluate: (ctx): SmartInsight | null => {
      if (ctx.incomesPrevMonth.length === 0) return null;

      const totalIncome = ctx.incomes.reduce((acc, i) => acc + i.amount_ars, 0);
      const totalPrevIncome = ctx.incomesPrevMonth.reduce((acc, i) => acc + i.amount_ars, 0);

      if (totalPrevIncome > 0 && totalIncome > totalPrevIncome * 1.1) {
        const growthPct = Math.round((totalIncome / totalPrevIncome - 1) * 100);
        return {
          id: `ing-growth-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "ing-income-growth",
          module: "ingresos",
          category: "achievement",
          priority: "medium",
          title: "¡Ingresos en aumento!",
          message: `Tus ingresos aumentaron un ${growthPct}% respecto al mes anterior. ¡Excelente!`,
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }

      return null;
    },
  },
  // 4. ing-no-distribution-set
  {
    id: "ing-no-distribution-set",
    module: "ingresos",
    evaluate: (ctx): SmartInsight | null => {
      if (ctx.incomes.length === 0) return null;

      const allNull = ctx.incomes.every((i) => i.distribution === null);
      if (allNull) {
        return {
          id: `ing-no-dist-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "ing-no-distribution-set",
          module: "ingresos",
          category: "reminder",
          priority: "medium",
          title: "Ingresos sin distribuir",
          message: "Registraste ingresos este mes pero ninguno cuenta con distribución activa. Te sugerimos configurarlos para tus metas.",
          href: "/ingresos",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }

      return null;
    },
  },
  // 5. ing-invest-ratio-low
  {
    id: "ing-invest-ratio-low",
    module: "ingresos",
    evaluate: (ctx): SmartInsight | null => {
      const dist = ctx.compositeDistribution;
      if (!dist) return null;

      if (dist.invest_pct < 10) {
        return {
          id: `ing-low-invest-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "ing-invest-ratio-low",
          module: "ingresos",
          category: "tip",
          priority: "low",
          title: "Inversión recomendada baja",
          message: `Destinás solo un ${dist.invest_pct}% de tu presupuesto ideal a inversiones. Considerá aumentarlo para potenciar tus metas financieras.`,
          href: "/ingresos",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }

      return null;
    },
  },
];
