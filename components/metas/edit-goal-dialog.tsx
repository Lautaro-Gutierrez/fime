"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Save } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUpdateGoal } from "@/hooks/use-goals";
import type { Goal } from "@/hooks/use-goals";
import type { ValuedHolding } from "@/lib/portfolio/holdings";
import { cn } from "@/lib/utils";
import {
  GoalFormBody,
  parseGoalNumber,
  defaultGoalForm,
  GOALS_BY_ID,
  type GoalFormState,
} from "./new-goal-dialog";

type Props = {
  goal: Goal | null;
  onClose: () => void;
  holdings?: ValuedHolding[];
};

function formFromGoal(goal: Goal): GoalFormState {
  const cfg = GOALS_BY_ID[goal.goal_type];
  const base = defaultGoalForm(cfg);
  return {
    ...base,
    name: goal.name,
    target: String(goal.target_amount),
    currency: goal.currency,
    quest_type: goal.quest_type,
    source_type: (goal.source_type as GoalFormState["source_type"]) ?? "manual",
    source_ref: goal.source_ref,
    linked_asset_keys: goal.linked_asset_keys ?? [],
    current: String(goal.current_amount ?? ""),
    deadline: goal.deadline ?? "",
    note: goal.note ?? "",
  };
}

export function EditGoalDialog({ goal, onClose, holdings = [] }: Props) {
  const [form, setForm] = useState<GoalFormState | null>(null);
  const updateGoal = useUpdateGoal();

  useEffect(() => {
    setForm(goal ? formFromGoal(goal) : null);
  }, [goal]);

  if (!goal || !form) return null;
  const cfg = GOALS_BY_ID[goal.goal_type];

  async function submit() {
    if (!goal || !form) return;

    if (!form.name.trim()) {
      toast.error("Ponele un nombre a la meta");
      return;
    }
    const target = parseGoalNumber(form.target);
    if (target === null || target <= 0) {
      toast.error("El objetivo tiene que ser un número > 0");
      return;
    }
    if (cfg.isPercentage && target > 100) {
      toast.error("La tasa no puede superar 100%");
      return;
    }
    if (form.source_type === "expense_category_monthly" && !form.source_ref) {
      toast.error("Elegí qué categoría de gasto medir");
      return;
    }
    if (
      form.source_type === "portfolio_subset" &&
      form.linked_asset_keys.length === 0
    ) {
      toast.error("Seleccioná al menos un activo");
      return;
    }

    const isManual = form.source_type === "manual";
    const current = isManual ? (parseGoalNumber(form.current) ?? 0) : 0;

    try {
      await updateGoal.mutateAsync({
        id: goal.id,
        patch: {
          name: form.name.trim(),
          quest_type: form.quest_type,
          target_amount: target,
          currency: cfg.isPercentage ? null : form.currency,
          current_amount: current,
          source_type: isManual ? null : form.source_type,
          source_ref: form.source_ref,
          linked_asset_keys: form.linked_asset_keys,
          deadline: form.deadline || null,
          note: form.note.trim() || null,
        },
      });
      toast.success("Meta actualizada");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  return (
    <Dialog open={!!goal} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg overflow-hidden border-white/5 bg-card/95 p-0 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative flex max-h-[85vh] flex-col"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.08),transparent_70%)]" />
          <div className="relative flex items-center gap-3 border-b border-white/5 px-6 py-4">
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-xl ring-1",
                cfg.bgClass,
                cfg.textClass,
                cfg.borderClass,
              )}
            >
              <cfg.icon className="size-4" />
            </div>
            <div className="flex flex-col leading-tight">
              <DialogTitle className="text-sm font-semibold tracking-tight">
                Editar · {cfg.label}
              </DialogTitle>
              <span className="text-[10px] text-muted-foreground">
                {cfg.description}
              </span>
            </div>
          </div>

          <GoalFormBody
            type={cfg}
            form={form}
            setForm={setForm as React.Dispatch<React.SetStateAction<GoalFormState>>}
            holdings={holdings}
          />

          <div className="relative flex items-center justify-end gap-2 border-t border-white/5 bg-card/80 px-6 py-3">
            <Button variant="ghost" onClick={onClose} disabled={updateGoal.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={submit}
              disabled={updateGoal.isPending}
              className="bg-gradient-to-br from-theme-500 to-orange-600 text-white shadow-lg shadow-theme-500/25 hover:from-theme-400 hover:to-orange-500"
            >
              <Save className="size-4" />
              Actualizar
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
