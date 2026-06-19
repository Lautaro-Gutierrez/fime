import type { InsightRule, SmartInsight } from "../types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const dashboardRules: InsightRule[] = [
  // 1. dash-savings-rate-low
  {
    id: "dash-savings-rate-low",
    module: "dashboard",
    evaluate: (ctx): SmartInsight | null => {
      const totalIncome = ctx.incomes.reduce((acc, i) => acc + i.amount_ars, 0);
      const totalExpense = ctx.expenses.reduce((acc, e) => acc + e.amount, 0);
      if (totalIncome <= 0) return null;

      const savingsRate = ((totalIncome - totalExpense) / totalIncome) * 100;
      if (savingsRate >= 10 || savingsRate < 0) return null; // If negative, maybe there's a surplus/deficit alert instead

      return {
        id: `dash-savings-rate-low-${ctx.currentMonth.toISOString().slice(0, 7)}`,
        ruleId: "dash-savings-rate-low",
        module: "dashboard",
        category: "warning",
        priority: "high",
        title: "Tasa de ahorro baja",
        message: `Tu tasa de ahorro este mes es del ${savingsRate.toFixed(
          1
        )}%. Intentá superar el 15% para mantener tu colchón.`,
        dismissible: true,
        createdAt: new Date().toISOString(),
      };
    },
  },
  // 2. dash-expense-spike
  {
    id: "dash-expense-spike",
    module: "dashboard",
    evaluate: (ctx): SmartInsight | null => {
      if (ctx.expensesPrevMonth.length === 0) return null;
      const totalExpense = ctx.expenses.reduce((acc, e) => acc + e.amount, 0);
      const totalPrevExpense = ctx.expensesPrevMonth.reduce(
        (acc, e) => acc + e.amount,
        0
      );

      if (totalPrevExpense > 0 && totalExpense > totalPrevExpense * 1.2) {
        const excessPct = ((totalExpense / totalPrevExpense - 1) * 100).toFixed(0);
        return {
          id: `dash-expense-spike-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "dash-expense-spike",
          module: "dashboard",
          category: "warning",
          priority: "high",
          title: "Pico de gastos",
          message: `Gastaste un ${excessPct}% más que el mes pasado a esta altura. Revisá tus gastos variables.`,
          href: "/gastos",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 3. dash-card-due-soon
  {
    id: "dash-card-due-soon",
    module: "dashboard",
    evaluate: (ctx): SmartInsight | null => {
      // Find cards due in <= 5 days
      for (const card of ctx.creditCards) {
        // Simple logic for due days: if dayOfMonth is close to due_day
        // Real logic is more complex with closing_day, but we'll approximate:
        let daysToDue = card.due_day - ctx.dayOfMonth;
        if (daysToDue < 0) daysToDue += ctx.daysInMonth; // It's next month

        if (daysToDue >= 0 && daysToDue <= 5) {
          // See if there's an expense with this card id in the current billing cycle
          // We can just alert on the date proximity for now
          return {
            id: `dash-card-due-${card.id}-${ctx.currentMonth.toISOString().slice(0, 7)}`,
            ruleId: "dash-card-due-soon",
            module: "dashboard",
            category: "reminder",
            priority: "high",
            title: "Vencimiento de tarjeta",
            message: `Tu tarjeta ${card.brand || card.name} vence en ${daysToDue} día${
              daysToDue !== 1 ? "s" : ""
            }.`,
            href: "/gastos",
            dismissible: true,
            createdAt: new Date().toISOString(),
          };
        }
      }
      return null;
    },
  },
  // 4. dash-no-expenses-logged
  {
    id: "dash-no-expenses-logged",
    module: "dashboard",
    evaluate: (ctx): SmartInsight | null => {
      // If we are past day 3 and no expenses logged yet in the last 3 days
      if (ctx.expenses.length === 0 && ctx.dayOfMonth > 3) {
        return {
          id: `dash-no-expenses-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "dash-no-expenses-logged",
          module: "dashboard",
          category: "reminder",
          priority: "medium",
          title: "Días sin registros",
          message: `Hace unos días que no registrás gastos. ¿Querés cargar los pendientes?`,
          href: "/gastos",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 5. dash-surplus-invest
  {
    id: "dash-surplus-invest",
    module: "dashboard",
    evaluate: (ctx): SmartInsight | null => {
      const totalIncome = ctx.incomes.reduce((acc, i) => acc + i.amount_ars, 0);
      const totalExpense = ctx.expenses.reduce((acc, e) => acc + e.amount, 0);
      const surplus = totalIncome - totalExpense;

      if (totalIncome > 0 && surplus > totalIncome * 0.3) {
        return {
          id: `dash-surplus-invest-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "dash-surplus-invest",
          module: "dashboard",
          category: "opportunity",
          priority: "medium",
          title: "Flujo libre alto",
          message: `Tenés un excedente de $${surplus.toLocaleString(
            "es-AR"
          )}. ¿Consideraste invertir una parte?`,
          href: "/inversiones",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 6. dash-goal-achievable
  {
    id: "dash-goal-achievable",
    module: "dashboard",
    evaluate: (ctx): SmartInsight | null => {
      const totalIncome = ctx.incomes.reduce((acc, i) => acc + i.amount_ars, 0);
      const totalExpense = ctx.expenses.reduce((acc, e) => acc + e.amount, 0);
      const surplus = totalIncome - totalExpense;

      if (surplus > 0) {
        // Find a goal that is not achieved, and the remaining amount is <= surplus
        for (const goal of ctx.goals) {
          if (goal.status !== "active") continue;
          // Note: goals amounts might be in USD. We simplify by checking if it's ARS or if we had a quick conversion.
          // For now, if remaining is strictly > 0 and < surplus
          const progress = ctx.goalProgresses.get(goal.id);
          if (progress && progress.remaining > 0 && progress.remaining <= surplus) {
            return {
              id: `dash-goal-achievable-${goal.id}-${ctx.currentMonth.toISOString().slice(0, 7)}`,
              ruleId: "dash-goal-achievable",
              module: "dashboard",
              category: "opportunity",
              priority: "low",
              title: "Meta completable",
              message: `La meta "${goal.name}" necesita ${progress.remaining.toLocaleString(
                "es-AR"
              )} más. ¡Tu flujo libre del mes lo cubre!`,
              href: "/metas",
              dismissible: true,
              createdAt: new Date().toISOString(),
            };
          }
        }
      }
      return null;
    },
  },
  // 7. dash-month-closing
  {
    id: "dash-month-closing",
    module: "dashboard",
    evaluate: (ctx): SmartInsight | null => {
      const daysLeft = ctx.daysInMonth - ctx.dayOfMonth;
      if (daysLeft >= 0 && daysLeft <= 3) {
        return {
          id: `dash-month-closing-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "dash-month-closing",
          module: "dashboard",
          category: "reminder",
          priority: "low",
          title: "Cierre de mes",
          message: `Quedan ${daysLeft} días para cerrar el mes. Revisá que no falten gastos por cargar.`,
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 8. dash-no-investments
  {
    id: "dash-no-investments",
    module: "dashboard",
    evaluate: (ctx): SmartInsight | null => {
      if (ctx.investments.length === 0 && ctx.holdings.length === 0) {
        return {
          id: "dash-no-investments",
          ruleId: "dash-no-investments",
          module: "dashboard",
          category: "tip",
          priority: "low",
          title: "Primeros pasos",
          message: `¿Sabías que invertir regularmente puede multiplicar tus ahorros? Empezá a registrar tus activos.`,
          href: "/inversiones",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 9. dash-goal-pacing-behind (migrated from legacy alerts)
  {
    id: "dash-goal-pacing-behind",
    module: "dashboard",
    evaluate: (ctx): SmartInsight | null => {
      const now = ctx.today;
      for (const goal of ctx.goals) {
        if (goal.status !== "active") continue;
        const pct = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;

        if (goal.deadline) {
          const deadlineDate = new Date(goal.deadline);
          const startDate = new Date(goal.started_at);
          const totalDuration = deadlineDate.getTime() - startDate.getTime();
          const elapsed = now.getTime() - startDate.getTime();
          const timePct = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;

          if (timePct > pct + 20) {
            return {
              id: `dash-goal-pacing-${goal.id}-${ctx.currentMonth.toISOString().slice(0, 7)}`,
              ruleId: "dash-goal-pacing-behind",
              module: "dashboard",
              category: "warning",
              priority: "medium",
              title: "Meta atrasada",
              message: `Vas un poco atrasado con "${goal.name}" (tiempo: ${timePct.toFixed(0)}%, progreso: ${pct.toFixed(0)}%).`,
              href: "/metas",
              dismissible: true,
              createdAt: new Date().toISOString(),
            };
          }
        }
      }
      return null;
    },
  },
];

