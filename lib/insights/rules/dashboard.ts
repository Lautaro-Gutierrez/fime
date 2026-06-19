import type { InsightRule, SmartInsight } from "../types";

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
      if (savingsRate >= 10 || savingsRate < 0) return null;

      return {
        id: `dash-savings-rate-low-${ctx.currentMonth.toISOString().slice(0, 7)}`,
        ruleId: "dash-savings-rate-low",
        module: "dashboard",
        category: "warning",
        priority: "high",
        title: "Capacidad de Ahorro Mensual",
        message: `El nivel de ahorro actual representa el ${savingsRate.toFixed(
          1
        )}% de los ingresos percibidos. Es recomendable apuntar a un mínimo del 15% para constituir un fondo de reserva eficiente.`,
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
          title: "Control de Gastos Mensuales",
          message: `El nivel total de egresos es un ${excessPct}% superior al registrado el mes anterior en esta misma fecha. Se sugiere revisar los gastos no esenciales para mantener el equilibrio del periodo.`,
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
      for (const card of ctx.creditCards) {
        let daysToDue = card.due_day - ctx.dayOfMonth;
        if (daysToDue < 0) daysToDue += ctx.daysInMonth;

        if (daysToDue >= 0 && daysToDue <= 5) {
          return {
            id: `dash-card-due-${card.id}-${ctx.currentMonth.toISOString().slice(0, 7)}`,
            ruleId: "dash-card-due-soon",
            module: "dashboard",
            category: "reminder",
            priority: "high",
            title: "Vencimiento de Compromisos Financieros",
            message: `La tarjeta de crédito ${card.brand || card.name} presenta un vencimiento en ${daysToDue} día${
              daysToDue !== 1 ? "s" : ""
            }. El pago puntual evita recargos por intereses y mantiene el historial crediticio favorable.`,
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
      if (ctx.expenses.length === 0 && ctx.dayOfMonth > 3) {
        return {
          id: `dash-no-expenses-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "dash-no-expenses-logged",
          module: "dashboard",
          category: "reminder",
          priority: "medium",
          title: "Registro de Operaciones Diarias",
          message: `No se han registrado movimientos de gastos en los últimos días. El seguimiento regular de los consumos diarios es indispensable para un control presupuestario preciso.`,
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
          title: "Gestión de Excedentes",
          message: `Se registra un saldo disponible de $${surplus.toLocaleString(
            "es-AR"
          )}. Destinar una fracción de estos fondos a opciones de inversión ayuda a proteger el valor del capital.`,
          href: "/inversiones",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
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
          title: "Cierre del Ejercicio Mensual",
          message: `Restan ${daysLeft} días para la finalización del mes actual. Se aconseja registrar todos los gastos devengados para consolidar la contabilidad del periodo.`,
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
          title: "Iniciación en Inversiones",
          message: `Aún no se registran colocaciones financieras activas. Asignar una porción del ahorro mensual a instrumentos financieros favorece la preservación e incremento del capital en el tiempo.`,
          href: "/inversiones",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 9. dash-financial-health-check
  {
    id: "dash-financial-health-check",
    module: "dashboard",
    evaluate: (ctx): SmartInsight | null => {
      const totalIncome = ctx.incomes.reduce((acc, i) => acc + i.amount_ars, 0);
      const totalExpense = ctx.expenses.reduce((acc, e) => acc + e.amount, 0);
      if (totalIncome <= 0) return null;

      const savingsRate = ((totalIncome - totalExpense) / totalIncome) * 100;
      if (savingsRate >= 25 && ctx.dayOfMonth >= 15) {
        return {
          id: `dash-health-check-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "dash-financial-health-check",
          module: "dashboard",
          category: "achievement",
          priority: "medium",
          title: "Desempeño Financiero Saludable",
          message: `La tasa de ahorro de este periodo se sitúa en un excelente ${savingsRate.toFixed(1)}%. Este excedente constituye un pilar clave para el crecimiento de su patrimonio.`,
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 10. dash-recurring-subscriptions-check
  {
    id: "dash-recurring-subscriptions-check",
    module: "dashboard",
    evaluate: (ctx): SmartInsight | null => {
      const totalIncome = ctx.incomes.reduce((acc, i) => acc + i.amount_ars, 0);
      if (totalIncome <= 0) return null;

      const subExpense = ctx.expenses
        .filter((e) => e.is_subscription)
        .reduce((acc, e) => acc + e.amount, 0);

      if (subExpense > 0 && (subExpense / totalIncome) * 100 < 3 && ctx.dayOfMonth >= 15) {
        return {
          id: `dash-sub-check-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "dash-recurring-subscriptions-check",
          module: "dashboard",
          category: "achievement",
          priority: "low",
          title: "Estructura de Gastos Fijos Eficiente",
          message: "El gasto mensual en suscripciones y servicios fijos se mantiene bajo control, representando un porcentaje mínimo de sus ingresos totales.",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
];
