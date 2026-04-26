import { addDays, differenceInCalendarDays, format } from "date-fns";
import type { Goal } from "@/hooks/use-goals";
import type { SourceTypeId } from "@/lib/goals";
import type { ValuedHolding } from "@/lib/portfolio/holdings";

const DAY_MS = 86_400_000;

// Datos opcionales para auto-tracking. La página los junta y los pasa a `computeGoalProgress`.
// Cada source_type usa solo el subset que necesita; faltantes → progreso 0.
export type ProgressContext = {
  portfolioTotalUsd?: number;
  valuedHoldings?: ValuedHolding[];
  expensesCurrentMonth?: {
    byCategory: Record<string, number>;
    total: number;
  };
  incomesCurrentMonthArs?: number;
  passiveIncomeMonthlyUsd?: number; // Δ portfolio − cashflows del mes corriente
  // Snapshots del portfolio para calcular el ritmo real (Δ vs valor en started_at).
  snapshots?: Array<{ date: string; total_usd: number }>;
};

export type GoalPace = {
  perDay: number;
  perMonth: number;
  daysPassed: number;
};

export type GoalEta = {
  daysToTarget: number | null;
  date: string | null;          // yyyy-MM-dd
  onTrack: boolean | null;      // null si no hay deadline; bool si compara vs deadline
};

export type GoalProgress = {
  current: number;
  target: number;
  pct: number;       // 0..100, capped (para anillos)
  rawPct: number;    // sin cap (para indicar overshoot/over-cap)
  remaining: number; // distancia absoluta restante (en target − current)
  isManual: boolean;
  isInverted: boolean; // expense_cap: subir es malo
  pace?: GoalPace;
  eta?: GoalEta;
};

/**
 * Calcula el current_amount real de la meta combinando fuente + contexto.
 * Si no hay source_type, retorna goal.current_amount (modo manual).
 */
export function computeCurrentAmount(goal: Goal, ctx: ProgressContext): number {
  const source = goal.source_type as SourceTypeId | null;
  if (!source) return Number(goal.current_amount);

  switch (source) {
    case "portfolio_total":
      return ctx.portfolioTotalUsd ?? 0;

    case "portfolio_subset": {
      if (!ctx.valuedHoldings || goal.linked_asset_keys.length === 0) return 0;
      const set = new Set(goal.linked_asset_keys);
      return ctx.valuedHoldings
        .filter((h) => set.has(h.key))
        .reduce((s, h) => s + h.current_value_usd, 0);
    }

    case "expense_category_monthly": {
      if (!ctx.expensesCurrentMonth || !goal.source_ref) return 0;
      return ctx.expensesCurrentMonth.byCategory[goal.source_ref] ?? 0;
    }

    case "expense_total_monthly":
      return ctx.expensesCurrentMonth?.total ?? 0;

    case "income_monthly":
      return ctx.incomesCurrentMonthArs ?? 0;

    case "savings_rate_monthly": {
      const inc = ctx.incomesCurrentMonthArs ?? 0;
      const exp = ctx.expensesCurrentMonth?.total ?? 0;
      if (inc <= 0) return 0;
      return ((inc - exp) / inc) * 100;
    }

    case "passive_income_monthly":
      return ctx.passiveIncomeMonthlyUsd ?? 0;

    default:
      return Number(goal.current_amount);
  }
}

/**
 * Pacing real, ancado al valor del portfolio en started_at (para metas auto-tracked).
 *
 * Caso portfolio_total: busca el snapshot más cercano anterior o igual a started_at
 *   y calcula Δ = current − snapshot.total_usd. Esto evita inflar el ritmo con
 *   capital que ya existía cuando se creó la meta.
 *   Si no hay snapshot previo (meta creada antes del primer snapshot) → sin datos suficientes.
 *   Si daysPassed < 7 → sin datos suficientes (demasiado pronto para extrapolar).
 *
 * Caso portfolio_subset: no hay historia de subsets → sin pace.
 *
 * Caso manual / otros: ritmo desde 0. Requiere daysPassed >= 7 para evitar
 *   extrapolaciones sin sentido el día 1.
 */
function computePace(
  goal: Goal,
  current: number,
  ctx: ProgressContext,
): GoalPace | undefined {
  const start = new Date(goal.started_at);
  const now = new Date();
  const daysPassed = Math.max(
    1,
    Math.floor((now.getTime() - start.getTime()) / DAY_MS),
  );

  if (goal.source_type === "portfolio_total") {
    // Necesitamos snapshots y al menos 7 días para extrapolar.
    if (!ctx.snapshots || ctx.snapshots.length === 0 || daysPassed < 7) {
      return undefined;
    }
    // Snapshot más cercano anterior o igual a started_at.
    const snapshotAtStart = ctx.snapshots
      .filter((s) => s.date <= goal.started_at)
      .at(-1);
    if (!snapshotAtStart) return undefined; // no hay historia previa al started_at
    const delta = current - snapshotAtStart.total_usd;
    if (delta <= 0) return undefined; // sin crecimiento → pace indefinido
    const perDay = delta / daysPassed;
    return { perDay, perMonth: perDay * 30, daysPassed };
  }

  if (goal.source_type === "portfolio_subset") {
    // No hay historia de subsets → no podemos calcular un pace fiable.
    return undefined;
  }

  // Manual u otros auto-tracked: pace desde 0, mínimo 7 días.
  if (daysPassed < 7) return undefined;
  const perDay = current / daysPassed;
  if (perDay <= 0) return undefined;
  return { perDay, perMonth: perDay * 30, daysPassed };
}

/**
 * Computa el progress completo de una meta.
 * Stock goals (savings, purchase, debt_payoff) reciben ETA.
 * Flow goals (income_target, expense_cap, savings_rate, passive_income_target)
 * solo reportan pct vs target del período; el "ETA" no aplica.
 */
export function computeGoalProgress(
  goal: Goal,
  ctx: ProgressContext,
): GoalProgress {
  const current = computeCurrentAmount(goal, ctx);
  const target = Number(goal.target_amount);
  const isInverted = goal.goal_type === "expense_cap";
  const isManual = goal.source_type == null;

  // Math común: rawPct = current/target * 100. La interpretación cambia por tipo.
  const rawPct = target > 0 ? (current / target) * 100 : 0;
  const pct = Math.max(0, Math.min(100, rawPct));
  const remaining = Math.max(0, target - current);

  const pace = computePace(goal, current, ctx);

  const isStockGoal =
    goal.goal_type === "savings" ||
    goal.goal_type === "purchase" ||
    goal.goal_type === "debt_payoff";

  let eta: GoalEta | undefined;
  if (isStockGoal) {
    if (pace && pace.perDay > 0 && remaining > 0) {
      const daysToTarget = Math.ceil(remaining / pace.perDay);
      const date = format(addDays(new Date(), daysToTarget), "yyyy-MM-dd");
      let onTrack: boolean | null = null;
      if (goal.deadline) {
        const deadlineDays = differenceInCalendarDays(
          new Date(goal.deadline),
          new Date(),
        );
        onTrack = daysToTarget <= deadlineDays;
      }
      eta = { daysToTarget, date, onTrack };
    } else {
      // Sin pace o sin remaining → no estimable (o ya cumplida).
      const onTrack = remaining === 0 ? true : null;
      eta = { daysToTarget: null, date: null, onTrack };
    }
  }

  return {
    current,
    target,
    pct,
    rawPct,
    remaining,
    isManual,
    isInverted,
    pace,
    eta,
  };
}
