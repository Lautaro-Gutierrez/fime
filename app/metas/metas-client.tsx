"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/layout/shell";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trophy,
  Target,
  Flag,
  Trash2,
  Pencil,
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  Zap,
  Loader2,
  Save,
} from "lucide-react";
import {
  useGoals,
  useUpdateGoal,
  useDeleteGoal,
  useCreateGoal,
  type Goal,
} from "@/hooks/use-goals";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useExpenses } from "@/hooks/use-expenses";
import { useIncomes } from "@/hooks/use-incomes";
import { firstOfMonth, toISODate, monthKey } from "@/lib/format";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { PrivateAmount } from "@/components/ui/private-amount";
import { usePrefsContext } from "@/components/providers/preferences-provider";
import { ProgressRing } from "@/components/metas/progress-ring";
import {
  computeGoalProgress,
  type ProgressContext,
  type GoalProgress,
} from "@/lib/goals/progress";
import { GOALS, GOALS_BY_ID, SOURCE_TYPE_LABELS } from "@/lib/goals";
import type { GoalConfig, GoalCurrency, SourceTypeId } from "@/lib/goals";
import type { GoalType, QuestType } from "@/types/database";
import { CATEGORIES } from "@/lib/categories";
import type { ValuedHolding } from "@/lib/portfolio/holdings";
import { cn } from "@/lib/utils";

// Category colors for "Tope de gasto" buttons at 10% opacity
const CATEGORY_STYLES: Record<string, { inactive: string; active: string }> = {
  comida: {
    inactive: "bg-[#10B981]/10 text-[#10B981] border-transparent hover:bg-[#10B981]/15",
    active: "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/50",
  },
  servicios: {
    inactive: "bg-[#F59E0B]/10 text-[#F59E0B] border-transparent hover:bg-[#F59E0B]/15",
    active: "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/50",
  },
  alquiler: {
    inactive: "bg-[#6366F1]/10 text-[#6366F1] border-transparent hover:bg-[#6366F1]/15",
    active: "bg-[#6366F1]/20 text-[#6366F1] border-[#6366F1]/50",
  },
  impuestos: {
    inactive: "bg-[#EF4444]/10 text-[#EF4444] border-transparent hover:bg-[#EF4444]/15",
    active: "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/50",
  },
  tarjeta_credito: {
    inactive: "bg-[#8B5CF6]/10 text-[#8B5CF6] border-transparent hover:bg-[#8B5CF6]/15",
    active: "bg-[#8B5CF6]/20 text-[#8B5CF6] border-[#8B5CF6]/50",
  },
  educacion: {
    inactive: "bg-[#06B6D4]/10 text-[#06B6D4] border-transparent hover:bg-[#06B6D4]/15",
    active: "bg-[#06B6D4]/20 text-[#06B6D4] border-[#06B6D4]/50",
  },
  imprevistos: {
    inactive: "bg-[#EC4899]/10 text-[#EC4899] border-transparent hover:bg-[#EC4899]/15",
    active: "bg-[#EC4899]/20 text-[#EC4899] border-[#EC4899]/50",
  },
  suscripciones: {
    inactive: "bg-[#F43F5E]/10 text-[#F43F5E] border-transparent hover:bg-[#F43F5E]/15",
    active: "bg-[#F43F5E]/20 text-[#F43F5E] border-[#F43F5E]/50",
  },
};

// Helper for parsing numeric inputs
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

function formatAmount(
  value: number,
  currency: "USD" | "ARS" | null,
  isPercentage: boolean,
): string {
  if (isPercentage) return `${value.toFixed(1)}%`;
  if (currency === "USD") {
    return `u$s ${value.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: value < 100 ? 2 : 0 })}`;
  }
  if (currency === "ARS") {
    return `$${value.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  return value.toLocaleString("es-AR");
}

function getQuickAmounts(target: number): number[] {
  if (target <= 1_000) return [10, 50, 100];
  if (target <= 100_000) return [100, 500, 1_000];
  if (target <= 10_000_000) return [1_000, 5_000, 10_000];
  return [10_000, 50_000, 100_000];
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

export default function MetasClient() {
  const { stealthMode: isStealthMode } = usePrefsContext();
  const month = useMemo(() => firstOfMonth(new Date()), []);
  const mKey = monthKey(month);

  const goalsQ = useGoals();
  const portfolio = usePortfolio();
  const expensesQ = useExpenses(month);
  const incomesQ = useIncomes(month);
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const [tab, setTab] = useState<QuestType>("main");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

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
    
    let passiveInc = 0;
    const snapshots = portfolio.snapshots || [];
    if (snapshots.length > 0) {
      const monthStartIso = `${mKey}-01`;
      const within = snapshots.filter((s) => s.date >= monthStartIso);
      if (within.length > 0) {
        const before = snapshots.filter((s) => s.date < monthStartIso);
        const startTotal = before.length > 0 ? before[before.length - 1].total_usd : within[0].total_usd;
        const endTotal = within[within.length - 1].total_usd;
        const cashflowSum = within.reduce((s, sn) => s + Number(sn.cashflow_usd), 0);
        passiveInc = endTotal - startTotal - cashflowSum;
      }
    }

    return {
      portfolioTotalUsd: portfolio.totals.total_usd,
      valuedHoldings: portfolio.holdings,
      expensesCurrentMonth: { byCategory, total: totalExp },
      incomesCurrentMonthArs: incomesArs,
      passiveIncomeMonthlyUsd: passiveInc,
      snapshots: portfolio.snapshots,
    };
  }, [portfolio.totals.total_usd, portfolio.holdings, portfolio.snapshots, expensesQ.data, incomesQ.data, mKey]);

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

  const mainGoals = activeGoals.filter((g) => g.quest_type === "main");
  const sideGoals = activeGoals.filter((g) => g.quest_type === "side");
  const visibleGoals = tab === "main" ? mainGoals : sideGoals;

  const avgProgressPct = useMemo(() => {
    if (activeGoals.length === 0) return 0;
    const sum = activeGoals.reduce(
      (s, g) => s + (progressByGoalId[g.id]?.pct ?? 0),
      0,
    );
    return sum / activeGoals.length;
  }, [activeGoals, progressByGoalId]);

  const handleQuickAdd = useCallback(async (g: Goal, delta: number) => {
    try {
      await updateGoal.mutateAsync({
        id: g.id,
        patch: { current_amount: Number(g.current_amount) + delta },
      });
      toast.success(`+${delta.toLocaleString("es-AR")}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar");
    }
  }, [updateGoal]);

  const handleDelete = useCallback(async (g: Goal) => {
    if (confirm("¿Estás seguro de que querés eliminar este objetivo?")) {
      try {
        await deleteGoal.mutateAsync(g.id);
        toast.success("Objetivo eliminado");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al borrar");
      }
    }
  }, [deleteGoal]);

  return (
    <Shell>
      <div className="relative flex flex-col gap-6 p-4 pb-10 sm:p-6 md:p-8">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[380px] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.12),transparent_80%)]" />

        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <p className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span> OBJETIVOS FINANCIEROS
          </p>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white tracking-tight">Metas y Objetivos</h1>
            {/* Botón superior - minimalista de la app */}
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 border border-white/[0.1] hover:bg-white/[0.05] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo objetivo
            </button>
          </div>
        </div>

        {/* Fila 1: KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl p-5 border transition-all duration-300 hover:border-white/10" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-sm text-slate-400 font-medium mb-2">Largo Plazo</p>
            <p className="text-2xl font-bold text-blue-400 tnum">{mainGoals.length}</p>
          </div>
          <div className="rounded-2xl p-5 border transition-all duration-300 hover:border-white/10" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-sm text-slate-400 font-medium mb-2">Corto Plazo</p>
            <p className="text-2xl font-bold text-amber-500 tnum">{sideGoals.length}</p>
          </div>
          <div className="rounded-2xl p-5 border transition-all duration-300 hover:border-white/10" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-sm text-slate-400 font-medium mb-2">Completadas</p>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-2xl font-bold text-emerald-400 tnum">{completedCount}</p>
            </div>
          </div>
          <div className="rounded-2xl p-5 border transition-all duration-300 hover:border-white/10" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-sm text-slate-400 font-medium mb-2">Progreso Promedio</p>
            <p className="text-2xl font-bold text-white tnum">{Math.round(avgProgressPct)}%</p>
          </div>
        </div>

        {/* Fila 2: Filtros y Acciones */}
        <div className="flex items-center justify-between mb-5 animate-fade-in delay-1">
          <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1 w-fit">
            <button
              onClick={() => setTab("main")}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all",
                tab === "main"
                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/25 shadow-sm"
                  : "border border-transparent text-slate-400 hover:text-white"
              )}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              Largo Plazo
            </button>
            <button
              onClick={() => setTab("side")}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all",
                tab === "side"
                  ? "bg-amber-500/15 text-amber-500 border border-amber-500/25 shadow-sm"
                  : "border border-transparent text-slate-400 hover:text-white"
              )}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" />
              </svg>
              Corto Plazo
            </button>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 mb-4 animate-fade-in delay-1">
          {tab === "main" ? "Objetivos persistentes de largo alcance." : "Objetivos de corto plazo y consumos planificados."}
        </p>

        {/* Fila 3: Grilla de Tarjetas */}
        {goalsQ.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[420px] animate-pulse rounded-[24px] border border-white/[0.06] bg-[#1F2229]"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in delay-2">
            {visibleGoals.map((g) => {
              const progress = progressByGoalId[g.id] || {
                current: 0,
                target: Number(g.target_amount),
                pct: 0,
                rawPct: 0,
                remaining: Number(g.target_amount),
                isManual: g.source_type == null,
                isInverted: g.goal_type === "expense_cap",
              };
              return (
                <GoalCard
                  key={g.id}
                  goal={g}
                  progress={progress}
                  onEdit={setEditingGoal}
                  onDelete={handleDelete}
                  onQuickAdd={handleQuickAdd}
                />
              );
            })}

            {/* Tarjeta Vacía / Crear */}
            <div
              onClick={() => setCreateOpen(true)}
              className="rounded-[24px] border border-dashed border-white/10 hover:border-white/20 p-6 flex flex-col items-center justify-center cursor-pointer group bg-white/[0.01] transition-all min-h-[420px]"
            >
              <div className="w-12 h-12 rounded-full bg-white/[0.03] group-hover:bg-blue-500/10 flex items-center justify-center mb-4 transition-colors">
                <Plus className="w-6 h-6 text-slate-400 group-hover:text-blue-400 transition-colors" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                Crear Nueva Meta
              </h3>
              <p className="text-[11px] text-slate-500 mt-2 text-center max-w-[200px]">
                Establecé un nuevo objetivo de ahorro y seguí tu progreso de cerca.
              </p>
            </div>
          </div>
        )}
      </div>

      <NewGoalDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        holdings={portfolio.holdings}
      />
      
      <EditGoalDialog
        goal={editingGoal}
        onClose={() => setEditingGoal(null)}
        holdings={portfolio.holdings}
      />
    </Shell>
  );
}

// ─── COMPONENTE: TARJETA DE META (GOAL CARD) ─────────────────
interface GoalCardProps {
  goal: Goal;
  progress: GoalProgress;
  onEdit: (g: Goal) => void;
  onDelete: (g: Goal) => void;
  onQuickAdd: (g: Goal, delta: number) => void;
}

function GoalCard({ goal, progress, onEdit, onDelete, onQuickAdd }: GoalCardProps) {
  const { stealthMode: isStealthMode } = usePrefsContext();
  const cfg = GOALS_BY_ID[goal.goal_type];
  const Icon = cfg.icon;
  const currency = goal.currency;
  const showQuickAdd = goal.source_type == null && goal.status === "active";
  const quickAmounts = getQuickAmounts(Number(goal.target_amount));
  
  const remaining = Math.max(0, progress.target - progress.current);
  const pct = Math.round(progress.pct);

  const deadlineDate = goal.deadline ? parseISO(goal.deadline) : null;

  return (
    <div 
      className="rounded-[24px] p-6 border flex flex-col relative transition-all duration-300 hover:border-white/10 group"
      style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl border flex items-center justify-center transition-all",
            cfg.bgClass,
            cfg.textClass,
            cfg.borderClass
          )}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-tight">{goal.name}</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5 text-muted-foreground">
              {cfg.short} {currency ? `· ${currency}` : ""}
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-6 right-6">
          <button
            onClick={() => onEdit(goal)}
            className="rounded-lg p-1.5 text-slate-500 hover:text-white transition-colors bg-white/[0.02] border border-white/[0.04]"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(goal)}
            className="rounded-lg p-1.5 text-slate-500 hover:text-rose-400 transition-colors bg-white/[0.02] border border-white/[0.04]"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center Donut Ring */}
      <div className="flex justify-center mb-8 relative">
        <ProgressRing
          pct={pct}
          rawPct={progress.rawPct}
          size={128}
          strokeWidth={8}
          color={goal.color || "#10b981"}
          isInverted={progress.isInverted}
          label={
            <span className="text-3xl font-extrabold text-white tnum tracking-tighter">
              {isStealthMode ? "**" : `${pct}%`}
            </span>
          }
          sublabel={
            <span className="text-[10px] text-slate-400 font-medium mt-1">
              {progress.isInverted ? "Tope" : "Completado"}
            </span>
          }
        />
      </div>

      {/* Amounts and details */}
      <div className="flex flex-col gap-2.5 mb-6 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-slate-400 font-medium">Actual</span>
          <span className="font-bold text-white tnum tracking-tight">
            <PrivateAmount>{formatAmount(progress.current, currency, cfg.isPercentage)}</PrivateAmount>
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400 font-medium">Objetivo</span>
          <span className="font-bold text-white tnum tracking-tight">
            <PrivateAmount>{formatAmount(progress.target, currency, cfg.isPercentage)}</PrivateAmount>
          </span>
        </div>
        {!cfg.isPercentage && (
          <div className="flex justify-between items-center border-t border-white/[0.06] pt-2 mt-1">
            <span className="text-slate-400 font-medium">Restante</span>
            <span className="font-bold text-amber-400 tnum tracking-tight">
              <PrivateAmount>{formatAmount(remaining, currency, cfg.isPercentage)}</PrivateAmount>
            </span>
          </div>
        )}
      </div>

      {/* ETA & Deadline if exist */}
      {!showQuickAdd && (progress.pace || progress.eta || deadlineDate) && (
        <div className="mb-5 flex flex-col gap-1.5 rounded-xl border border-white/[0.06] bg-black/10 p-3 text-[10px]">
          {progress.pace && progress.pace.perDay > 0 && (
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-slate-400">
                <Zap className="w-3 h-3 text-fuchsia-400" /> Ritmo
              </span>
              <span className="font-mono font-medium tnum text-white">
                <PrivateAmount>{formatAmount(progress.pace.perMonth, currency, cfg.isPercentage)}</PrivateAmount> / mes
              </span>
            </div>
          )}
          {deadlineDate && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Fecha Límite</span>
              <span className="font-mono font-medium text-white/70">
                {format(deadlineDate, "dd MMM yyyy", { locale: es })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Quick Add sum options (Abonar a meta) */}
      {showQuickAdd && (
        <div className="mt-auto flex flex-col gap-2">
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-center mb-1">Abonar a meta</span>
          <div className="flex gap-1.5">
            {quickAmounts.map((amt) => (
              <button
                key={amt}
                onClick={() => onQuickAdd(goal, amt)}
                className="flex-1 py-2 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] font-mono text-[11px] font-bold text-white tnum tracking-tight transition-colors"
              >
                +{amt.toLocaleString("es-AR")}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── COMPONENTE: FORMULARIO COMPARIDO (FORM BODY) ─────────────
interface GoalFormBodyProps {
  type: GoalConfig;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  holdings: ValuedHolding[];
}

function GoalFormBody({ type, form, setForm, holdings }: GoalFormBodyProps) {
  const sourceOptions: (SourceTypeId | "manual")[] = [
    ...type.availableSourceTypes,
    "manual",
  ];
  const showCategoryPicker = form.source_type === "expense_category_monthly";
  const showAssetPicker = type.supportsAssetLink && form.source_type === "portfolio_subset";
  const isManual = form.source_type === "manual";

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-6 max-h-[60vh]">
      {/* Nombre */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Nombre
        </Label>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder={type.id === "purchase" ? "Viaje a Japón" : "Mi meta"}
          className="h-11 rounded-xl border border-white/[0.06] bg-[#1A1D24] text-white focus-visible:border-fuchsia-500/50 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-500"
        />
      </div>

      {/* Tipo de misión */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Tipo de misión
        </Label>
        <div className="flex gap-1 rounded-full bg-[#1A1D24] p-1 text-[11px] font-semibold w-fit border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, quest_type: "main" }))}
            className={cn(
              "rounded-full px-4 py-1.5 uppercase tracking-widest transition-all",
              form.quest_type === "main" ? "bg-white/[0.08] text-white" : "text-slate-400 hover:text-white"
            )}
          >
            Largo plazo (Main)
          </button>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, quest_type: "side" }))}
            className={cn(
              "rounded-full px-4 py-1.5 uppercase tracking-widest transition-all",
              form.quest_type === "side" ? "bg-white/[0.08] text-white" : "text-slate-400 hover:text-white"
            )}
          >
            Corto plazo (Side)
          </button>
        </div>
      </div>

      {/* Objetivo */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          {type.isPercentage ? "Tasa objetivo (%)" : "Objetivo"}
        </Label>
        <div className="flex gap-2">
          <Input
            value={form.target}
            onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
            placeholder={type.isPercentage ? "30" : "10000"}
            inputMode="decimal"
            className="h-11 flex-1 rounded-xl border border-white/[0.06] bg-[#1A1D24] text-white focus-visible:border-fuchsia-500/50 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-500"
          />
          {!type.isPercentage && type.supportedCurrencies.length > 1 && (
            <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-[#1A1D24] p-0.5">
              {type.supportedCurrencies.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, currency: c }))}
                  className={cn(
                    "rounded-lg px-3 text-xs font-semibold transition-all",
                    form.currency === c
                      ? "bg-fuchsia-500/20 text-fuchsia-400"
                      : "text-slate-400 hover:text-white",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cómo trackearla */}
      {sourceOptions.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Cómo trackearla
          </Label>
          <div className="grid grid-cols-1 gap-1">
            {sourceOptions.map((src) => {
              const isManualOpt = src === "manual";
              const optLabel = isManualOpt
                ? "Manual · Actualizable de forma manual"
                : SOURCE_TYPE_LABELS[src as SourceTypeId];
              const active = form.source_type === src;
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
                    "rounded-xl border px-3 py-2.5 text-left text-xs transition-all",
                    active
                      ? "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300"
                      : "border border-white/[0.06] bg-[#1A1D24] text-slate-400 hover:border-white/10 hover:text-white"
                  )}
                >
                  {optLabel}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Category picker (para topes de gasto) con fondo al 10% */}
      {showCategoryPicker && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Categoría a medir
          </Label>
          <div className="grid grid-cols-2 gap-1.5">
            {CATEGORIES.map((c) => {
              const IconComp = c.icon;
              const active = form.source_ref === c.id;
              const styles = CATEGORY_STYLES[c.id] || {
                inactive: "bg-slate-500/10 text-slate-400 border-transparent",
                active: "bg-slate-500/20 text-slate-400 border-slate-500/50",
              };
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, source_ref: c.id }))}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-all",
                    active
                      ? styles.active
                      : "border border-white/[0.06] bg-[#1A1D24] text-slate-400 hover:border-white/10 hover:text-white",
                  )}
                >
                  <IconComp className="size-4 shrink-0" />
                  {c.short}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Asset Picker (para subset de portfolio) */}
      {showAssetPicker && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Activos asignados a esta meta
          </Label>
          {holdings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-3 text-center text-xs text-muted-foreground bg-[#1A1D24]">
              No tenés holdings cargados todavía.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto pr-1">
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
                      "flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition-all",
                      active
                        ? "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300"
                        : "border border-white/[0.06] bg-[#1A1D24] text-slate-400 hover:border-white/10 hover:text-white"
                    )}
                  >
                    <span className="font-mono font-semibold">{h.label}</span>
                    <span className="font-mono text-[10px] opacity-80">${h.current_value_usd.toFixed(0)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Manual value field */}
      {isManual && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Estado actual (opcional)
          </Label>
          <Input
            value={form.current}
            onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))}
            placeholder="0"
            inputMode="decimal"
            className="h-11 rounded-xl border border-white/[0.06] bg-[#1A1D24] text-white focus-visible:border-fuchsia-500/50 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-500"
          />
        </div>
      )}

      {/* Deadline */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Fecha límite (opcional)
        </Label>
        <Input
          type="date"
          value={form.deadline}
          min={toISODate(new Date())}
          onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
          className="h-11 rounded-xl border border-white/[0.06] bg-[#1A1D24] text-white focus-visible:border-fuchsia-500/50 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      {/* Note */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Nota (opcional)
        </Label>
        <Input
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          placeholder="Detalle de la meta"
          className="h-11 rounded-xl border border-white/[0.06] bg-[#1A1D24] text-white focus-visible:border-fuchsia-500/50 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-500"
        />
      </div>
    </div>
  );
}

// ─── MODAL: NUEVA META (NEW GOAL DIALOG) ─────────────────────
interface NewGoalDialogProps {
  holdings?: ValuedHolding[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function NewGoalDialog({ holdings = [], open, onOpenChange }: NewGoalDialogProps) {
  const [selectedType, setSelectedType] = useState<GoalConfig | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const createGoal = useCreateGoal();

  useEffect(() => {
    if (!open) {
      setSelectedType(null);
      setForm(null);
    }
  }, [open]);

  function handleSelectType(cfg: GoalConfig) {
    setSelectedType(cfg);
    setForm(defaultForm(cfg));
  }

  async function submit() {
    if (!selectedType || !form) return;

    if (!form.name.trim()) {
      toast.error("Ponele un nombre a la meta");
      return;
    }
    const targetVal = parseNumber(form.target);
    if (targetVal === null || targetVal <= 0) {
      toast.error("El objetivo tiene que ser un número > 0");
      return;
    }
    if (selectedType.isPercentage && targetVal > 100) {
      toast.error("La tasa no puede superar 100%");
      return;
    }
    if (form.source_type === "expense_category_monthly" && !form.source_ref) {
      toast.error("Elegí qué categoría de gasto medir");
      return;
    }
    if (form.source_type === "portfolio_subset" && form.linked_asset_keys.length === 0) {
      toast.error("Seleccioná al menos un activo del portfolio");
      return;
    }

    const isManual = form.source_type === "manual";
    const currentVal = isManual ? (parseNumber(form.current) ?? 0) : 0;

    try {
      await createGoal.mutateAsync({
        name: form.name.trim(),
        goal_type: selectedType.id,
        quest_type: form.quest_type,
        target_amount: targetVal,
        currency: selectedType.isPercentage ? null : form.currency,
        current_amount: currentVal,
        source_type: isManual ? null : form.source_type,
        source_ref: form.source_ref,
        linked_asset_keys: form.linked_asset_keys,
        deadline: form.deadline || null,
        note: form.note.trim() || null,
      });
      toast.success("Meta creada");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border border-white/[0.06] bg-[#1F2229] p-0 rounded-[24px] overflow-hidden">
        <AnimatePresence mode="wait">
          {!selectedType ? (
            <motion.div
              key="select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4 p-6"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-fuchsia-500/15 ring-1 ring-fuchsia-500/30">
                  <Sparkles className="size-4 text-fuchsia-400" />
                </div>
                <div className="flex flex-col leading-tight">
                  <DialogTitle className="text-lg font-semibold tracking-tight text-white">
                    Nueva misión
                  </DialogTitle>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Elegí qué tipo de meta querés trackear.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                {GOALS.map((g, idx) => {
                  const IconComp = g.icon;
                  return (
                    <motion.button
                      key={g.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.03 }}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleSelectType(g)}
                      className="group relative flex min-h-[100px] flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.06] bg-[#1A1D24] p-3 text-left transition hover:border-white/10"
                    >
                      <div className="relative shrink-0">
                        <div className={cn(
                          "flex size-8 items-center justify-center rounded-xl ring-1",
                          g.bgClass,
                          g.textClass,
                          g.borderClass
                        )}>
                          <IconComp className="size-4" />
                        </div>
                      </div>
                      <div className="relative flex flex-col gap-0.5 mt-3">
                        <span className="text-xs font-bold leading-tight text-white group-hover:text-fuchsia-400 transition-colors">
                          {g.label}
                        </span>
                        <span className="text-[9px] uppercase tracking-widest text-slate-500">
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
              className="flex flex-col"
            >
              {/* Header clon de Editar Gasto */}
              <div className="relative flex items-center gap-3 border-b border-white/[0.06] bg-[#1F2229] p-4">
                <button
                  onClick={() => setSelectedType(null)}
                  className="flex size-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "flex size-8 items-center justify-center rounded-xl ring-1",
                    selectedType.bgClass,
                    selectedType.textClass,
                    selectedType.borderClass,
                  )}>
                    <selectedType.icon className="size-4" />
                  </div>
                  <div className="flex flex-col leading-tight">
                    <DialogTitle className="text-sm font-semibold tracking-tight text-white">
                      Nueva · {selectedType.label}
                    </DialogTitle>
                    <span className="text-[9px] text-muted-foreground mt-0.5">
                      {selectedType.description}
                    </span>
                  </div>
                </div>
              </div>

              {form && (
                <GoalFormBody
                  type={selectedType}
                  form={form}
                  setForm={setForm as React.Dispatch<React.SetStateAction<FormState>>}
                  holdings={holdings}
                />
              )}

              {/* Footer de acción */}
              <div className="relative flex items-center justify-end gap-2 border-t border-white/[0.06] bg-[#1F2229] p-4">
                <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={createGoal.isPending}>
                  Cancelar
                </Button>
                <Button
                  onClick={submit}
                  disabled={createGoal.isPending}
                  className="bg-gradient-to-r from-[#d946ef] to-[#06b6d4] hover:opacity-90 text-white font-semibold shadow-lg shadow-fuchsia-500/20 transition-all border-0"
                >
                  {createGoal.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
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

// ─── MODAL: EDITAR META (EDIT GOAL DIALOG) ───────────────────
interface EditGoalDialogProps {
  goal: Goal | null;
  onClose: () => void;
  holdings?: ValuedHolding[];
}

function EditGoalDialog({ goal, onClose, holdings = [] }: EditGoalDialogProps) {
  const [form, setForm] = useState<FormState | null>(null);
  const updateGoal = useUpdateGoal();

  useEffect(() => {
    if (goal) {
      const cfg = GOALS_BY_ID[goal.goal_type];
      setForm({
        name: goal.name,
        target: String(goal.target_amount),
        currency: goal.currency,
        quest_type: goal.quest_type,
        source_type: (goal.source_type as FormState["source_type"]) || "manual",
        source_ref: goal.source_ref,
        linked_asset_keys: goal.linked_asset_keys || [],
        current: String(goal.current_amount || ""),
        deadline: goal.deadline || "",
        note: goal.note || "",
      });
    } else {
      setForm(null);
    }
  }, [goal]);

  if (!goal || !form) return null;
  const cfg = GOALS_BY_ID[goal.goal_type];

  async function submit() {
    if (!goal || !form) return;

    if (!form.name.trim()) {
      toast.error("Ponele un nombre a la meta");
      return;
    }
    const targetVal = parseNumber(form.target);
    if (targetVal === null || targetVal <= 0) {
      toast.error("El objetivo tiene que ser un número > 0");
      return;
    }
    if (cfg.isPercentage && targetVal > 100) {
      toast.error("La tasa no puede superar 100%");
      return;
    }
    if (form.source_type === "expense_category_monthly" && !form.source_ref) {
      toast.error("Elegí qué categoría de gasto medir");
      return;
    }
    if (form.source_type === "portfolio_subset" && form.linked_asset_keys.length === 0) {
      toast.error("Seleccioná al menos un activo");
      return;
    }

    const isManual = form.source_type === "manual";
    const currentVal = isManual ? (parseNumber(form.current) ?? 0) : 0;

    try {
      await updateGoal.mutateAsync({
        id: goal.id,
        patch: {
          name: form.name.trim(),
          quest_type: form.quest_type,
          target_amount: targetVal,
          currency: cfg.isPercentage ? null : form.currency,
          current_amount: currentVal,
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
      <DialogContent className="max-w-md border border-white/[0.06] bg-[#1F2229] p-0 rounded-[24px] overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col"
        >
          {/* Header clon de Editar Gasto */}
          <div className="relative flex items-center gap-3 border-b border-white/[0.06] bg-[#1F2229] p-4">
            <div className={cn(
              "flex size-8 items-center justify-center rounded-xl ring-1",
              cfg.bgClass,
              cfg.textClass,
              cfg.borderClass,
            )}>
              <cfg.icon className="size-4" />
            </div>
            <div className="flex flex-col leading-tight">
              <DialogTitle className="text-sm font-semibold tracking-tight text-white">
                Editar · {cfg.label}
              </DialogTitle>
              <span className="text-[9px] text-muted-foreground mt-0.5">
                {cfg.description}
              </span>
            </div>
          </div>

          <GoalFormBody
            type={cfg}
            form={form}
            setForm={setForm as React.Dispatch<React.SetStateAction<FormState>>}
            holdings={holdings}
          />

          {/* Footer de acción */}
          <div className="relative flex items-center justify-end gap-2 border-t border-white/[0.06] bg-[#1F2229] p-4">
            <Button variant="ghost" onClick={onClose} disabled={updateGoal.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={submit}
              disabled={updateGoal.isPending}
              className="bg-gradient-to-r from-[#d946ef] to-[#06b6d4] hover:opacity-90 text-white font-semibold shadow-lg shadow-fuchsia-500/20 transition-all border-0"
            >
              {updateGoal.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Actualizar
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
