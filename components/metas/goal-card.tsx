"use client";

import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Pencil,
  Trash2,
  CalendarClock,
  Rocket,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { GOALS_BY_ID } from "@/lib/goals";
import { formatARS, formatUSD } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Goal } from "@/hooks/use-goals";
import type { GoalProgress } from "@/lib/goals/progress";
import { ProgressRing } from "./progress-ring";
import { PrivateAmount } from "@/components/ui/private-amount";

type Props = {
  goal: Goal;
  progress: GoalProgress;
  onEdit: (g: Goal) => void;
  onDelete: (g: Goal) => void;
  onQuickAdd: (g: Goal, delta: number) => void;
};

function formatAmount(
  value: number,
  currency: "USD" | "ARS" | null,
  isPercentage: boolean,
): string {
  if (isPercentage) return `${value.toFixed(1)}%`;
  if (currency === "USD") return formatUSD(value, value < 100);
  if (currency === "ARS") return formatARS(value);
  return value.toLocaleString("es-AR");
}

/**
 * Smart quick-add amounts: escalan con la magnitud del target.
 * User pidió +10 / +50 como tecla base; ajustamos automáticamente en
 * metas grandes para que tenga sentido el "un click = sumar".
 */
function getQuickAmounts(target: number): number[] {
  if (target <= 1_000) return [10, 50, 100];
  if (target <= 100_000) return [100, 500, 1_000];
  if (target <= 10_000_000) return [1_000, 5_000, 10_000];
  return [10_000, 50_000, 100_000];
}

export function GoalCard({ goal, progress, onEdit, onDelete, onQuickAdd }: Props) {
  const cfg = GOALS_BY_ID[goal.goal_type];
  const Icon = cfg.icon;
  const currency = goal.currency;
  const pctLabel = cfg.isPercentage ? `${Math.round(progress.pct)}%` : `${Math.round(progress.pct)}%`;

  const quickAmounts = getQuickAmounts(Number(goal.target_amount));
  const showQuickAdd = goal.source_type == null && goal.status === "active";

  const deadlineDate = goal.deadline ? parseISO(goal.deadline) : null;
  const etaDate = progress.eta?.date ? parseISO(progress.eta.date) : null;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25 }}
      className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 transition hover:border-white/12"
    >

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">

            <div
              className={cn(
                "relative flex size-10 items-center justify-center rounded-xl ring-1",
                cfg.bgClass,
                cfg.textClass,
                cfg.borderClass,
              )}
            >
              <Icon className="size-4" />
            </div>
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {goal.name}
            </h3>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
              <span className={cfg.textClass}>{cfg.short}</span>
              {currency && <span>· {currency}</span>}
              {goal.quest_type === "side" && (
                <span className="rounded border border-orange-400/20 bg-orange-500/8 px-1.5 py-[1px] text-[8px] font-semibold text-orange-300">
                  Side
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(goal)}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-theme-300"
            aria-label="Editar"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={() => {
              onDelete(goal);
              toast.success("Meta eliminada");
            }}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-rose-300"
            aria-label="Eliminar"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="relative mt-4 flex flex-col items-center">
        <ProgressRing
          pct={progress.pct}
          rawPct={progress.rawPct}
          color={cfg.color}
          isInverted={progress.isInverted}
          size={100}
          strokeWidth={8}
          label={
            <div className="font-mono text-2xl font-bold tabular-nums text-foreground">
              {pctLabel}
            </div>
          }
          sublabel={
            <div className="mt-0.5 text-[8px] uppercase tracking-widest text-muted-foreground">
              {progress.isInverted ? "del tope" : "completado"}
            </div>
          }
        />
      </div>

      <div className="relative mt-4 grid gap-1">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">Actual</span>
          <span className="font-mono font-semibold tabular-nums text-foreground">
            <PrivateAmount>{formatAmount(progress.current, currency, cfg.isPercentage)}</PrivateAmount>
          </span>
        </div>
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">Objetivo</span>
          <span className="font-mono font-semibold tabular-nums text-foreground/70">
            <PrivateAmount>{formatAmount(progress.target, currency, cfg.isPercentage)}</PrivateAmount>
          </span>
        </div>
      </div>

      {/* Pacing + ETA */}
      {(progress.pace || progress.eta) && (
        <div className="relative mt-3 grid gap-1.5 rounded-xl border border-white/[0.08] bg-black/20 p-3">
          {progress.pace && progress.pace.perDay > 0 && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Zap className="size-3 text-theme-400" /> Ritmo
              </span>
              <span className="font-mono font-medium tabular-nums text-foreground">
                {formatAmount(progress.pace.perMonth, currency, cfg.isPercentage)} / mes
              </span>
            </div>
          )}
          {progress.eta && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                {progress.eta.onTrack === false ? (
                  <AlertTriangle className="size-3 text-rose-400" />
                ) : (
                  <Rocket className="size-3 text-theme-400" />
                )}
                ETA
              </span>
              <span
                className={cn(
                  "font-mono font-medium tabular-nums",
                  progress.eta.onTrack === false
                    ? "text-rose-300"
                    : progress.eta.onTrack
                      ? "text-theme-300"
                      : "text-foreground",
                )}
              >
                {etaDate
                  ? format(etaDate, "MMM yyyy", { locale: es })
                  : "—"}
              </span>
            </div>
          )}
          {deadlineDate && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <CalendarClock className="size-3" /> Límite
              </span>
              <span className="font-mono font-medium tabular-nums text-foreground/70">
                {format(deadlineDate, "dd MMM yyyy", { locale: es })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Quick-add buttons (solo modo manual) */}
      {showQuickAdd && (
        <div className="relative mt-3 flex gap-1.5">
          {quickAmounts.map((amt) => (
            <button
              key={amt}
              onClick={() => onQuickAdd(goal, amt)}
              className="flex-1 rounded-xl border px-2 py-1.5 font-mono text-[11px] font-semibold tabular-nums transition hover:brightness-125"
              style={{
                color: cfg.color,
                borderColor: `${cfg.color}40`,
                backgroundColor: `${cfg.color}15`
              }}
            >
              +{amt.toLocaleString("es-AR")}
            </button>
          ))}
        </div>
      )}
    </motion.article>
  );
}
