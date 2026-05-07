"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GOALS, GOALS_BY_ID, SOURCE_TYPE_LABELS } from "@/lib/goals";
import type { GoalConfig, GoalCurrency, SourceTypeId } from "@/lib/goals";
import type { GoalType, QuestType } from "@/types/database";
import { CATEGORIES, CATEGORIES_BY_ID } from "@/lib/categories";
import { useCreateGoal } from "@/hooks/use-goals";
import type { ValuedHolding } from "@/lib/portfolio/holdings";
import { toISODate } from "@/lib/format";
import { cn } from "@/lib/utils";

// Acepta formato AR ("1.234,56") y anglo ("2.20"). Mismo helper que el resto del proyecto.
function parseNumber(input: string): number | null {
  if (!input) return null;
  const trimmed = input.trim().replace(/\s/g, "");
  if (!trimmed) return null;
  const hasComma = trimmed.includes(",");
  const hasDot = trimmed.includes(".");
  let cleaned: string;
  if (hasComma && hasDot) {
    const lastComma = trimmed.lastIndexOf(",");
    const lastDot = trimmed.lastIndexOf(".");
    cleaned =
      lastComma > lastDot
        ? trimmed.replace(/\./g, "").replace(",", ".")
        : trimmed.replace(/,/g, "");
  } else if (hasComma) {
    cleaned = trimmed.replace(",", ".");
  } else {
    cleaned = trimmed;
  }
  const n = Number(cleaned);
  if (!isFinite(n) || n < 0) return null;
  return n;
}

type FormState = {
  name: string;
  target: string;
  currency: GoalCurrency | null;
  quest_type: QuestType;
  source_type: SourceTypeId | "manual";
  source_ref: string | null;
  linked_asset_keys: string[];
  current: string;
  deadline: string;
  note: string;
};

function defaultForm(cfg: GoalConfig): FormState {
  return {
    name: "",
    target: "",
    currency: cfg.defaultCurrency,
    quest_type: cfg.defaultQuestType,
    source_type: cfg.availableSourceTypes[0] ?? "manual",
    source_ref: null,
    linked_asset_keys: [],
    current: "",
    deadline: "",
    note: "",
  };
}

type Props = {
  holdings?: ValuedHolding[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function NewGoalDialog({ holdings = [], trigger, open: openProp, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [type, setType] = useState<GoalConfig | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const createGoal = useCreateGoal();

  useEffect(() => {
    if (!open) {
      setType(null);
      setForm(null);
    }
  }, [open]);

  function selectType(g: GoalConfig) {
    setType(g);
    setForm(defaultForm(g));
  }

  function back() {
    setType(null);
    setForm(null);
  }

  async function submit() {
    if (!type || !form) return;

    if (!form.name.trim()) {
      toast.error("Ponele un nombre a la meta");
      return;
    }
    const target = parseNumber(form.target);
    if (target === null || target <= 0) {
      toast.error("El objetivo tiene que ser un número > 0");
      return;
    }
    if (type.isPercentage && target > 100) {
      toast.error("La tasa no puede superar 100%");
      return;
    }
    if (
      form.source_type === "expense_category_monthly" &&
      !form.source_ref
    ) {
      toast.error("Elegí qué categoría de gasto medir");
      return;
    }
    if (
      form.source_type === "portfolio_subset" &&
      form.linked_asset_keys.length === 0
    ) {
      toast.error("Seleccioná al menos un activo del portfolio");
      return;
    }

    const isManual = form.source_type === "manual";
    const current = isManual ? (parseNumber(form.current) ?? 0) : 0;

    try {
      await createGoal.mutateAsync({
        name: form.name.trim(),
        goal_type: type.id,
        quest_type: form.quest_type,
        target_amount: target,
        currency: type.isPercentage ? null : form.currency,
        current_amount: current,
        source_type: isManual ? null : form.source_type,
        source_ref: form.source_ref,
        linked_asset_keys: form.linked_asset_keys,
        deadline: form.deadline || null,
        note: form.note.trim() || null,
      });
      toast.success("Meta creada");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger as React.ReactElement} />}

      <DialogContent className="max-w-lg overflow-hidden border-white/5 bg-white/[0.03] backdrop-blur-xl p-0 backdrop-blur-xl">
        <AnimatePresence mode="wait">
          {!type ? (
            <motion.div
              key="select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative flex flex-col gap-5 p-6"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.1),transparent_60%)]" />
              <div className="relative flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-theme-500/15 ring-1 ring-theme-500/30">
                  <Sparkles className="size-4 text-theme-300" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <DialogTitle className="text-lg font-semibold tracking-tight">
                    Nueva misión
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    Elegí qué tipo de meta querés trackear.
                  </p>
                </div>
              </div>

              <div className="relative grid grid-cols-2 gap-2">
                {GOALS.map((g, idx) => {
                  const Icon = g.icon;
                  return (
                    <motion.button
                      key={g.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.03 }}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => selectType(g)}
                      className="group relative flex min-h-[110px] flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-3.5 text-left transition hover:border-white/10"
                    >
                      <div
                        className="pointer-events-none absolute inset-0 opacity-30"
                        style={{
                          background: `radial-gradient(ellipse at top right, ${g.color}30, transparent 60%)`,
                        }}
                      />
                      <div className="relative">
                        <div className={cn("absolute inset-0 rounded-xl opacity-60 blur-md", g.bgClass)} />
                        <div
                          className={cn(
                            "relative flex size-9 items-center justify-center rounded-xl ring-1",
                            g.bgClass,
                            g.textClass,
                            g.borderClass,
                          )}
                        >
                          <Icon className="size-4" />
                        </div>
                      </div>
                      <div className="relative flex flex-col gap-0.5">
                        <span className="text-sm font-bold leading-tight tracking-tight text-foreground">
                          {g.label}
                        </span>
                        <span className="text-[9px] uppercase tracking-widest text-muted-foreground line-clamp-2">
                          {g.short}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="relative flex max-h-[80vh] flex-col"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.08),transparent_70%)]" />
              <div className="relative flex items-center gap-3 border-b border-white/5 px-6 py-4">
                <button
                  onClick={back}
                  className="flex size-8 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                  aria-label="Volver"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-xl ring-1",
                      type.bgClass,
                      type.textClass,
                      type.borderClass,
                    )}
                  >
                    <type.icon className="size-4" />
                  </div>
                  <div className="flex flex-col leading-tight">
                    <DialogTitle className="text-sm font-semibold tracking-tight">
                      Nueva · {type.label}
                    </DialogTitle>
                    <span className="text-[10px] text-muted-foreground">
                      {type.description}
                    </span>
                  </div>
                </div>
              </div>

              {form && (
                <GoalFormBody
                  type={type}
                  form={form}
                  setForm={setForm as React.Dispatch<React.SetStateAction<FormState>>}
                  holdings={holdings}
                />
              )}

              <div className="relative flex items-center justify-end gap-2 border-t border-white/5 bg-white/[0.03] backdrop-blur-xl px-6 py-3">
                <Button variant="ghost" onClick={() => setOpen(false)} disabled={createGoal.isPending}>
                  Cancelar
                </Button>
                <Button
                  onClick={submit}
                  disabled={createGoal.isPending}
                  className="bg-gradient-to-br from-theme-500 to-orange-600 text-white shadow-lg shadow-theme-500/25 hover:from-theme-400 hover:to-orange-500"
                >
                  <Plus className="size-4" />
                  Guardar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

// Form body shareable con el Edit dialog.
export function GoalFormBody({
  type,
  form,
  setForm,
  holdings,
}: {
  type: GoalConfig;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  holdings: ValuedHolding[];
}) {
  const sourceOptions: (SourceTypeId | "manual")[] = [
    ...type.availableSourceTypes,
    "manual",
  ];
  const showCategoryPicker = form.source_type === "expense_category_monthly";
  const showAssetPicker =
    type.supportsAssetLink && form.source_type === "portfolio_subset";
  const isManual = form.source_type === "manual";

  return (
    <div className="relative flex flex-col gap-4 overflow-y-auto px-6 py-5">
      {/* Nombre */}
      <Field label="Nombre">
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder={
            type.id === "purchase"
              ? "Viaje a Japón"
              : type.id === "savings"
                ? "Reserva 6 meses"
                : type.id === "passive_income_target"
                  ? "Pasivo 1k USD/mes"
                  : "Mi meta"
          }
          className="h-11 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl backdrop-blur focus-visible:border-white/20"
        />
      </Field>

      {/* Quest type toggle */}
      <Field label="Tipo de misión">
        <div className="flex gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-1 backdrop-blur w-fit">
          <QuestToggle
            active={form.quest_type === "main"}
            onClick={() => setForm((f) => ({ ...f, quest_type: "main" }))}
            label="Main · Largo plazo"
            color="amber"
          />
          <QuestToggle
            active={form.quest_type === "side"}
            onClick={() => setForm((f) => ({ ...f, quest_type: "side" }))}
            label="Side · Puntual"
            color="orange"
          />
        </div>
      </Field>

      {/* Target amount + currency */}
      <Field label={type.isPercentage ? "Tasa objetivo (%)" : "Objetivo"}>
        <div className="flex gap-2">
          <Input
            value={form.target}
            onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
            placeholder={type.isPercentage ? "30" : "10000"}
            inputMode="decimal"
            className="h-11 flex-1 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl backdrop-blur focus-visible:border-white/20"
          />
          {!type.isPercentage && type.supportedCurrencies.length > 1 && (
            <div className="flex gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-0.5 backdrop-blur">
              {type.supportedCurrencies.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, currency: c }))}
                  className={cn(
                    "rounded-lg px-3 text-xs font-semibold transition",
                    form.currency === c
                      ? "bg-theme-500/20 text-theme-300"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          {!type.isPercentage && type.supportedCurrencies.length === 1 && (
            <div className="flex h-11 items-center rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl px-3 text-xs font-semibold uppercase text-muted-foreground backdrop-blur">
              {type.supportedCurrencies[0]}
            </div>
          )}
        </div>
      </Field>

      {/* Source type */}
      {sourceOptions.length > 1 && (
        <Field label="Cómo trackearla">
          <div className="grid grid-cols-1 gap-1">
            {sourceOptions.map((src) => {
              const isManualOpt = src === "manual";
              const label = isManualOpt
                ? "Manual · current_amount editable"
                : SOURCE_TYPE_LABELS[src as SourceTypeId];
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      source_type: src,
                      source_ref: null,
                      linked_asset_keys: [],
                    }))
                  }
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left text-xs transition",
                    form.source_type === src
                      ? "border-theme-400/40 bg-theme-500/10 text-theme-200"
                      : "border-white/5 bg-white/[0.03] backdrop-blur-xl text-muted-foreground hover:border-white/15 hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </Field>
      )}

      {/* Category picker (expense_category_monthly) */}
      {showCategoryPicker && (
        <Field label="Categoría a medir">
          <div className="grid grid-cols-2 gap-1.5">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const active = form.source_ref === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, source_ref: c.id }))}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-2.5 py-2 text-xs transition",
                    active
                      ? cn(c.bgClass, c.textClass, c.borderClass)
                      : "border-white/5 bg-white/[0.03] backdrop-blur-xl text-muted-foreground hover:border-white/15 hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  {c.short}
                </button>
              );
            })}
          </div>
        </Field>
      )}

      {/* Asset picker (portfolio_subset) */}
      {showAssetPicker && (
        <Field label="Activos asignados a esta meta">
          {holdings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-3 text-center text-xs text-muted-foreground">
              No tenés holdings cargados todavía.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-1 max-h-44 overflow-y-auto pr-1">
              {holdings.map((h) => {
                const active = form.linked_asset_keys.includes(h.key);
                return (
                  <button
                    key={h.key}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        linked_asset_keys: active
                          ? f.linked_asset_keys.filter((k) => k !== h.key)
                          : [...f.linked_asset_keys, h.key],
                      }))
                    }
                    className={cn(
                      "flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition",
                      active
                        ? "border-theme-400/40 bg-theme-500/10 text-theme-200"
                        : "border-white/5 bg-white/[0.03] backdrop-blur-xl text-muted-foreground hover:border-white/15 hover:text-foreground",
                    )}
                  >
                    <span className="font-mono font-semibold">{h.label}</span>
                    <span className="font-mono tabular-nums text-[11px] opacity-80">
                      ${h.current_value_usd.toFixed(0)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Field>
      )}

      {/* Current amount (manual mode) */}
      {isManual && (
        <Field label="Estado actual (opcional)">
          <Input
            value={form.current}
            onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))}
            placeholder="0"
            inputMode="decimal"
            className="h-11 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl backdrop-blur focus-visible:border-white/20"
          />
        </Field>
      )}

      {/* Deadline */}
      <Field label="Fecha límite (opcional)">
        <Input
          type="date"
          value={form.deadline}
          min={toISODate(new Date())}
          onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
          className="h-11 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl backdrop-blur focus-visible:border-white/20"
        />
      </Field>

      {/* Note */}
      <Field label="Nota (opcional)">
        <Input
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          placeholder="Detalle"
          className="h-11 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl backdrop-blur focus-visible:border-white/20"
        />
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function QuestToggle({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color: "amber" | "orange";
}) {
  const activeCls =
    color === "amber"
      ? "bg-theme-500/20 text-theme-300"
      : "bg-orange-500/20 text-orange-300";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition",
        active ? activeCls : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

// re-export para que el edit dialog use el mismo helper.
export { parseNumber as parseGoalNumber };
export type { FormState as GoalFormState };
export { defaultForm as defaultGoalForm };
export { GOALS_BY_ID };
