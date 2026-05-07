"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/layout/shell";
import { MetasHeader } from "@/components/metas/header";
import { QuestBoard } from "@/components/metas/quest-board";
import { NewGoalDialog } from "@/components/metas/new-goal-dialog";
import { EditGoalDialog } from "@/components/metas/edit-goal-dialog";
import {
  useGoals,
  useUpdateGoal,
  useDeleteGoal,
  type Goal,
} from "@/hooks/use-goals";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useExpenses } from "@/hooks/use-expenses";
import { useIncomes } from "@/hooks/use-incomes";
import {
  computeGoalProgress,
  type ProgressContext,
  type GoalProgress,
} from "@/lib/goals/progress";
import { firstOfMonth, monthKey } from "@/lib/format";
import type { PortfolioSnapshot } from "@/hooks/use-portfolio";

/**
 * Pasivo mensual = Δ portfolio del mes − cashflows aportados/retirados en el mes.
 * Snapshot "monthStart" es el último snapshot anterior al mes (o el primero del
 * mes si no hay historia previa).
 */
function passiveIncomeMonthly(
  snapshots: PortfolioSnapshot[],
  currentMonth: Date,
): number {
  if (snapshots.length === 0) return 0;
  const monthStartIso = `${monthKey(currentMonth)}-01`;
  const within = snapshots.filter((s) => s.date >= monthStartIso);
  if (within.length === 0) return 0;
  const before = snapshots.filter((s) => s.date < monthStartIso);
  const monthStartTotal =
    before.length > 0
      ? before[before.length - 1].total_usd
      : within[0].total_usd;
  const monthEndTotal = within[within.length - 1].total_usd;
  const cashflowSum = within.reduce((s, sn) => s + Number(sn.cashflow_usd), 0);
  return monthEndTotal - monthStartTotal - cashflowSum;
}

export default function MetasPage() {
  const month = useMemo(() => firstOfMonth(new Date()), []);

  const goalsQ = useGoals();
  const portfolio = usePortfolio();
  const expensesQ = useExpenses(month);
  const incomesQ = useIncomes(month);
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  // Build ProgressContext con datos de M1/M3/M4.
  const ctx: ProgressContext = useMemo(() => {
    const expenses = expensesQ.data ?? [];
    const byCategory: Record<string, number> = {};
    let totalExp = 0;
    for (const e of expenses) {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + Number(e.amount);
      totalExp += Number(e.amount);
    }
    const incomesArs = (incomesQ.data ?? []).reduce(
      (s, i) => s + Number(i.amount_ars),
      0,
    );
    return {
      portfolioTotalUsd: portfolio.totals.total_usd,
      valuedHoldings: portfolio.holdings,
      expensesCurrentMonth: { byCategory, total: totalExp },
      incomesCurrentMonthArs: incomesArs,
      passiveIncomeMonthlyUsd: passiveIncomeMonthly(portfolio.snapshots, month),
      snapshots: portfolio.snapshots,
    };
  }, [
    portfolio.totals.total_usd,
    portfolio.holdings,
    portfolio.snapshots,
    expensesQ.data,
    incomesQ.data,
    month,
  ]);

  const goals = goalsQ.data ?? [];
  const activeGoals = goals.filter((g) => g.status === "active");
  const completedCount = goals.filter((g) => g.status === "completed").length;

  const progressByGoalId = useMemo<Record<string, GoalProgress>>(() => {
    const map: Record<string, GoalProgress> = {};
    for (const g of activeGoals) {
      map[g.id] = computeGoalProgress(g, ctx);
    }
    return map;
  }, [activeGoals, ctx]);

  const avgProgressPct = useMemo(() => {
    if (activeGoals.length === 0) return 0;
    const sum = activeGoals.reduce(
      (s, g) => s + (progressByGoalId[g.id]?.pct ?? 0),
      0,
    );
    return sum / activeGoals.length;
  }, [activeGoals, progressByGoalId]);

  const mainCount = activeGoals.filter((g) => g.quest_type === "main").length;
  const sideCount = activeGoals.filter((g) => g.quest_type === "side").length;

  async function handleQuickAdd(g: Goal, delta: number) {
    try {
      await updateGoal.mutateAsync({
        id: g.id,
        patch: { current_amount: Number(g.current_amount) + delta },
      });
      toast.success(`+${delta.toLocaleString("es-AR")}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar");
    }
  }

  async function handleDelete(g: Goal) {
    try {
      await deleteGoal.mutateAsync(g.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al borrar");
    }
  }

  return (
    <Shell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 relative">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[380px] bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.08),transparent_65%)]" />

        <MetasHeader
          mainCount={mainCount}
          sideCount={sideCount}
          completedCount={completedCount}
          avgProgressPct={avgProgressPct}
          onCreate={() => setCreateOpen(true)}
        />

        {goalsQ.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-3xl border border-white/5 bg-card/40"
              />
            ))}
          </div>
        ) : (
          <QuestBoard
            goals={activeGoals}
            progressByGoalId={progressByGoalId}
            onEdit={(g) => setEditing(g)}
            onDelete={handleDelete}
            onQuickAdd={handleQuickAdd}
            onCreate={() => setCreateOpen(true)}
          />
        )}
      </div>

      <NewGoalDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        holdings={portfolio.holdings}
      />
      <EditGoalDialog
        goal={editing}
        onClose={() => setEditing(null)}
        holdings={portfolio.holdings}
      />
    </Shell>
  );
}
