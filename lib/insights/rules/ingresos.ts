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
          title: "Desviación del Plan de Distribución",
          message: `Los egresos actuales registran desvíos respecto a la planificación original (Gastos fijos: ${Math.round(realFixedPct)}% vs. planificado: ${dist.fixed_pct}%; Gastos variables: ${Math.round(realVariablePct)}% vs. planificado: ${dist.variable_pct}%). Se aconseja revisar las asignaciones.`,
          href: "/ingresos",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }

      return null;
    },
  },
  // 2. ing-no-distribution-set
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
          title: "Planificación de Ingresos",
          message: "Se han registrado ingresos en el periodo sin una distribución planificada. Asignar proporciones de destino para gastos fijos, consumos variables y ahorro facilita la organización financiera.",
          href: "/ingresos",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }

      return null;
    },
  },
  // 3. ing-invest-ratio-low
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
          title: "Asignación de Capital para Inversión",
          message: `La proporción destinada a inversión se sitúa en el ${dist.invest_pct}% de los ingresos planificados. Incrementar paulatinamente este porcentaje contribuye a acelerar la consolidación de su patrimonio de largo plazo.`,
          href: "/ingresos",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }

      return null;
    },
  },
  // 4. ing-free-flow (NEW: surplus management)
  {
    id: "ing-free-flow",
    module: "ingresos",
    evaluate: (ctx): SmartInsight | null => {
      const totalIncome = ctx.incomes.reduce((acc, i) => acc + i.amount_ars, 0);
      const totalExpense = ctx.expenses.reduce((acc, e) => acc + e.amount, 0);
      const surplus = totalIncome - totalExpense;

      if (totalIncome > 0 && surplus > totalIncome * 0.1 && ctx.dayOfMonth >= 10) {
        return {
          id: `ing-free-flow-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "ing-free-flow",
          module: "ingresos",
          category: "opportunity",
          priority: "medium",
          title: "Gestión de Excedentes",
          message: "Tus ingresos superan a tus gastos actuales. Considera destinar este excedente para fortalecer tu fondo de emergencia o aprovechar nuevas oportunidades de inversión.",
          href: "/inversiones",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 5. ing-expense-ratio (NEW: expense-to-income ratio)
  {
    id: "ing-expense-ratio",
    module: "ingresos",
    evaluate: (ctx): SmartInsight | null => {
      const totalIncome = ctx.incomes.reduce((acc, i) => acc + i.amount_ars, 0);
      const totalExpense = ctx.expenses.reduce((acc, e) => acc + e.amount, 0);
      if (totalIncome <= 0) return null;

      const pct = Math.round((totalExpense / totalIncome) * 100);
      if (pct > 0) {
        return {
          id: `ing-expense-ratio-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "ing-expense-ratio",
          module: "ingresos",
          category: "tip",
          priority: "medium",
          title: "Proporción de Gastos vs. Ingresos",
          message: `Tus gastos representan el ${pct}% de tus ingresos de este mes. Mantener este porcentaje bajo control es la clave principal para construir un patrimonio sólido.`,
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 6. ing-savings-target (NEW: savings target check)
  {
    id: "ing-savings-target",
    module: "ingresos",
    evaluate: (ctx): SmartInsight | null => {
      const totalIncome = ctx.incomes.reduce((acc, i) => acc + i.amount_ars, 0);
      const totalExpense = ctx.expenses.reduce((acc, e) => acc + e.amount, 0);
      if (totalIncome <= 0) return null;

      const savingsRate = ((totalIncome - totalExpense) / totalIncome) * 100;
      if (savingsRate > 20 && ctx.dayOfMonth >= 15) {
        return {
          id: `ing-savings-target-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "ing-savings-target",
          module: "ingresos",
          category: "achievement",
          priority: "medium",
          title: "Capacidad de Ahorro Mensual",
          message: `La proporción de ingresos no consumidos es superior al 20% (${Math.round(savingsRate)}%). Destinar estos recursos al ahorro sistemático consolida la estabilidad financiera a largo plazo.`,
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 7. ing-diversified-sources (NEW: multiple income entries)
  {
    id: "ing-diversified-sources",
    module: "ingresos",
    evaluate: (ctx): SmartInsight | null => {
      if (ctx.incomes.length >= 2) {
        return {
          id: `ing-diversified-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "ing-diversified-sources",
          module: "ingresos",
          category: "achievement",
          priority: "low",
          title: "Diversificación de Ingresos",
          message: "Se registran múltiples fuentes de ingresos durante el periodo. Disponer de flujos complementarios reduce la dependencia de un único empleador o cliente.",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
];
