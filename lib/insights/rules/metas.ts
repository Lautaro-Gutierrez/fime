import type { InsightRule, SmartInsight } from "../types";

export const metasRules: InsightRule[] = [
  // 1. meta-behind-pace
  {
    id: "meta-behind-pace",
    module: "metas",
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
              id: `meta-behind-${goal.id}-${ctx.currentMonth.toISOString().slice(0, 7)}`,
              ruleId: "meta-behind-pace",
              module: "metas",
              category: "warning",
              priority: "high",
              title: "Meta retrasada",
              message: `La meta "${goal.name}" está retrasada respecto a su tiempo ideal (tiempo transcurrido: ${Math.round(timePct)}%, progreso: ${Math.round(pct)}%).`,
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
  // 2. meta-milestone
  {
    id: "meta-milestone",
    module: "metas",
    evaluate: (ctx): SmartInsight | null => {
      for (const goal of ctx.goals) {
        if (goal.status !== "active") continue;
        const pct = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;

        let milestone = 0;
        if (pct >= 75) milestone = 75;
        else if (pct >= 50) milestone = 50;
        else if (pct >= 25) milestone = 25;

        if (milestone > 0) {
          return {
            id: `meta-milestone-${goal.id}-${milestone}`,
            ruleId: "meta-milestone",
            module: "metas",
            category: "achievement",
            priority: "medium",
            title: "Hito alcanzado",
            message: `¡Felicitaciones! Tu meta "${goal.name}" ya superó el ${milestone}% completado (actual: ${Math.round(pct)}%).`,
            href: "/metas",
            dismissible: true,
            createdAt: new Date().toISOString(),
          };
        }
      }
      return null;
    },
  },
  // 3. meta-stale
  {
    id: "meta-stale",
    module: "metas",
    evaluate: (ctx): SmartInsight | null => {
      const now = ctx.today;
      for (const goal of ctx.goals) {
        if (goal.status !== "active") continue;
        const pct = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;

        if (pct < 100 && goal.updated_at) {
          const updatedAt = new Date(goal.updated_at);
          const diffDays = Math.ceil((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays > 30) {
            return {
              id: `meta-stale-${goal.id}-${ctx.currentMonth.toISOString().slice(0, 7)}`,
              ruleId: "meta-stale",
              module: "metas",
              category: "reminder",
              priority: "low",
              title: "Meta sin movimientos",
              message: `La meta "${goal.name}" no registra actualizaciones desde hace ${diffDays} días. ¿Podés sumarle algo este mes?`,
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
  // 4. meta-asset-link-suggestion
  {
    id: "meta-asset-link-suggestion",
    module: "metas",
    evaluate: (ctx): SmartInsight | null => {
      for (const goal of ctx.goals) {
        if (goal.status !== "active") continue;

        const hasNoAssets = !goal.linked_asset_keys || goal.linked_asset_keys.length === 0;
        if (hasNoAssets && ctx.holdings.length > 0) {
          return {
            id: `meta-link-asset-${goal.id}-${ctx.currentMonth.toISOString().slice(0, 7)}`,
            ruleId: "meta-asset-link-suggestion",
            module: "metas",
            category: "opportunity",
            priority: "low",
            title: "Vinculá tu portfolio",
            message: `Tu meta "${goal.name}" no tiene activos vinculados. Podés asociar inversiones para automatizar el seguimiento.`,
            href: "/metas",
            dismissible: true,
            createdAt: new Date().toISOString(),
          };
        }
      }
      return null;
    },
  },
  // 5. meta-achievable-with-surplus
  {
    id: "meta-achievable-with-surplus",
    module: "metas",
    evaluate: (ctx): SmartInsight | null => {
      const totalIncome = ctx.incomes.reduce((acc, i) => acc + i.amount_ars, 0);
      const totalExpense = ctx.expenses.reduce((acc, e) => acc + e.amount, 0);
      const surplus = totalIncome - totalExpense;

      if (surplus > 0) {
        for (const goal of ctx.goals) {
          if (goal.status !== "active") continue;
          
          const pct = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
          if (pct < 80) {
            // Asumiendo misma moneda por simplicidad (ARS)
            const targetWithSurplus = goal.current_amount + surplus;
            const newPct = (targetWithSurplus / goal.target_amount) * 100;

            if (newPct >= 80) {
              return {
                id: `meta-achievable-surplus-${goal.id}-${ctx.currentMonth.toISOString().slice(0, 7)}`,
                ruleId: "meta-achievable-with-surplus",
                module: "metas",
                category: "opportunity",
                priority: "medium",
                title: "Meta alcanzable este mes",
                message: `Tu excedente disponible de $${Math.round(surplus).toLocaleString("es-AR")} te permitiría llevar tu meta "${goal.name}" a más del 80% del objetivo.`,
                href: "/metas",
                dismissible: true,
                createdAt: new Date().toISOString(),
              };
            }
          }
        }
      }
      return null;
    },
  },
  // 6. meta-deadline-near
  {
    id: "meta-deadline-near",
    module: "metas",
    evaluate: (ctx): SmartInsight | null => {
      const now = ctx.today;
      for (const goal of ctx.goals) {
        if (goal.status !== "active") continue;
        const pct = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;

        if (goal.deadline && pct < 80) {
          const deadlineDate = new Date(goal.deadline);
          const diffDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays > 0 && diffDays <= 30) {
            return {
              id: `meta-deadline-near-${goal.id}-${ctx.currentMonth.toISOString().slice(0, 7)}`,
              ruleId: "meta-deadline-near",
              module: "metas",
              category: "reminder",
              priority: "high",
              title: "Meta pronta a vencer",
              message: `La meta "${goal.name}" vence en ${diffDays} días y su progreso es de apenas el ${Math.round(pct)}%. Considerá realizar un aporte extra.`,
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
