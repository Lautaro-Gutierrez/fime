"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Target, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Goal } from "@/hooks/use-goals";
import type { GoalProgress } from "@/lib/goals/progress";
import type { QuestType } from "@/types/database";
import { QUEST_DESCRIPTIONS } from "@/lib/goals";
import { GoalCard } from "./goal-card";

type Props = {
  goals: Goal[];
  progressByGoalId: Record<string, GoalProgress>;
  onEdit: (g: Goal) => void;
  onDelete: (g: Goal) => void;
  onQuickAdd: (g: Goal, delta: number) => void;
  onCreate: () => void;
};

export function QuestBoard({
  goals,
  progressByGoalId,
  onEdit,
  onDelete,
  onQuickAdd,
  onCreate,
}: Props) {
  const [tab, setTab] = useState<QuestType>("main");

  const mainGoals = goals.filter((g) => g.quest_type === "main");
  const sideGoals = goals.filter((g) => g.quest_type === "side");
  const visible = tab === "main" ? mainGoals : sideGoals;

  return (
    <div className="flex flex-col gap-4">
      {/* Tab selector */}
      <div id="metas-quest-board" className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] p-1 w-fit">
        <TabButton
          active={tab === "main"}
          onClick={() => setTab("main")}
          icon={<Target className="size-3.5" />}
          label="Largo Plazo"
          count={mainGoals.length}
          activeColor="bg-theme-500/15 text-theme-300 border-theme-500/25"
        />
        <TabButton
          active={tab === "side"}
          onClick={() => setTab("side")}
          icon={<Flag className="size-3.5" />}
          label="Corto Plazo"
          count={sideGoals.length}
          activeColor="bg-orange-500/15 text-orange-300 border-orange-500/25"
        />
      </div>

      <span className="-mt-2 text-[11px] text-muted-foreground">
        {QUEST_DESCRIPTIONS[tab]}
      </span>

      <AnimatePresence mode="wait">
        {visible.length === 0 ? (
          <motion.div
            key={`empty-${tab}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative overflow-hidden rounded-xl border border-dashed border-white/10 bg-white/[0.03] p-10 text-center"
          >
            <div className="relative">
              <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-theme-500/10 text-theme-400 ring-1 ring-theme-500/20">
                {tab === "main" ? (
                  <Target className="size-5" />
                ) : (
                  <Flag className="size-5" />
                )}
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">
                Sin metas de {tab === "main" ? "largo plazo" : "corto plazo"}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {tab === "main"
                  ? "Los objetivos de largo plazo van acá."
                  : "Objetivos de corto plazo y compras puntuales."}
              </p>
              <button
                onClick={onCreate}
                className="mt-4 rounded-lg border border-white/[0.12] bg-white/[0.06] px-4 py-1.5 text-xs font-semibold text-foreground transition hover:bg-white/[0.10]"
              >
                Crear la primera
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`grid-${tab}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {visible.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                progress={
                  progressByGoalId[g.id] ?? {
                    current: 0,
                    target: Number(g.target_amount),
                    pct: 0,
                    rawPct: 0,
                    remaining: Number(g.target_amount),
                    isManual: g.source_type == null,
                    isInverted: g.goal_type === "expense_cap",
                  }
                }
                onEdit={onEdit}
                onDelete={onDelete}
                onQuickAdd={onQuickAdd}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
  activeColor,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  activeColor: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition",
        active
          ? activeColor
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 text-[9px]",
          active ? "bg-black/30" : "bg-white/5",
        )}
      >
        {count}
      </span>
    </button>
  );
}
