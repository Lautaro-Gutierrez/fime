"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Sparkles, Zap, ArrowRight } from "lucide-react";
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
import {
  INCOME_CATEGORIES,
  INCOME_CATEGORIES_BY_ID,
  INCOME_TEMPLATES,
} from "@/lib/income-categories";
import type { IncomeCategory, IncomeDistribution } from "@/types/database";
import { firstOfMonth, fromISODate, toISODate } from "@/lib/format";
import {
  useCreateIncome,
  useLastIncomeByCategory,
} from "@/hooks/use-incomes";
import { sumExpensesByType, useExpenses } from "@/hooks/use-expenses";
import { useFxRates } from "@/hooks/use-prices";
import { cn } from "@/lib/utils";
import { DistributionStep } from "@/components/ingresos/distribution-step";

// Categorías donde tiene sentido un waterfall de distribución por default.
// Para las otras (dividendos, venta, otros) se puede entrar al paso 2 igual si el user lo pide.
const DEFAULT_DISTRIBUTE: IncomeCategory[] = ["sueldo", "bono", "freelance"];

const CATEGORY_CARD_GRADIENT: Record<IncomeCategory, string> = {
  sueldo: "from-lime-500/20 via-lime-500/5 to-transparent",
  freelance: "from-sky-500/20 via-sky-500/5 to-transparent",
  alquiler_cobrado: "from-blue-500/20 via-blue-500/5 to-transparent",
  dividendos: "from-theme-500/20 via-theme-500/5 to-transparent",
  venta: "from-orange-500/20 via-orange-500/5 to-transparent",
  bono: "from-fuchsia-500/20 via-fuchsia-500/5 to-transparent",
  otros: "from-slate-500/20 via-slate-500/5 to-transparent",
};

// Acepta formato AR ("1.234,56") y anglo ("1,234.56" o "2.20").
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
  return isFinite(n) && n > 0 ? n : null;
}

type Step = "form" | "distribution";

export function QuickAddIncome() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("form");

  // Form fields
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  const [category, setCategory] = useState<IncomeCategory | null>(null);
  const [source, setSource] = useState("");
  const [date, setDate] = useState(toISODate(new Date()));
  const [note, setNote] = useState("");
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);

  const { data: fx } = useFxRates();
  const createIncome = useCreateIncome();

  // Gastos reales del mes seleccionado — la DistributionStep usa estos para
  // lockear fixed/variable cuando el usuario ya cargó gastos.
  const monthForExpenses = useMemo(
    () => firstOfMonth(fromISODate(date)),
    [date],
  );
  const { data: expenses = [] } = useExpenses(monthForExpenses);
  const realExpenses = useMemo(() => {
    const sums = sumExpensesByType(expenses);
    return sums.total > 0
      ? { fixed: sums.fixed, variable: sums.variable }
      : undefined;
  }, [expenses]);

  // Hooks templates: para cada template, traemos el último ingreso de su categoría
  // y lo usamos como sugerencia al hacer click.
  const lastSueldo = useLastIncomeByCategory("sueldo");
  const lastBono = useLastIncomeByCategory("bono");

  useEffect(() => {
    if (!open) {
      setStep("form");
      setAmount("");
      setCurrency("ARS");
      setCategory(null);
      setSource("");
      setDate(toISODate(new Date()));
      setNote("");
      setActiveTemplate(null);
    }
  }, [open]);

  function applyTemplate(templateId: string) {
    const t = INCOME_TEMPLATES.find((x) => x.id === templateId);
    if (!t) return;
    let last: { amount: number; currency: "ARS" | "USD"; source: string | null } | null = null;
    if (t.id === "sueldo_base" && lastSueldo.data) {
      last = {
        amount: Number(lastSueldo.data.amount),
        currency: lastSueldo.data.currency,
        source: lastSueldo.data.source,
      };
    } else if (t.id === "aguinaldo" && lastBono.data) {
      last = {
        amount: Number(lastBono.data.amount),
        currency: lastBono.data.currency,
        source: lastBono.data.source,
      };
    }
    setCategory(t.category);
    setActiveTemplate(t.id);
    if (last) {
      setAmount(last.amount.toString());
      setCurrency(last.currency);
      setSource(last.source ?? "");
    }
  }

  // Monto ARS calculado (para preview y para la distribution step)
  const amountArs = useMemo(() => {
    const v = parseNumber(amount);
    if (v === null) return 0;
    if (currency === "ARS") return v;
    return v * (fx?.mep ?? 0);
  }, [amount, currency, fx?.mep]);

  const amountUsd = useMemo(() => {
    const v = parseNumber(amount);
    if (v === null) return 0;
    if (currency === "USD") return v;
    if (!fx?.mep) return 0;
    return v / fx.mep;
  }, [amount, currency, fx?.mep]);

  const canDistribute =
    category !== null && DEFAULT_DISTRIBUTE.includes(category);

  function validateBeforeSubmit(): { amount: number; fx_rate: number | null } | null {
    const v = parseNumber(amount);
    if (v === null) {
      toast.error("Ingresá un monto válido.");
      return null;
    }
    if (!category) {
      toast.error("Elegí una categoría.");
      return null;
    }
    if (currency === "USD" && !fx?.mep) {
      toast.error("No pude leer el MEP. Intentá de nuevo en un momento.");
      return null;
    }
    return {
      amount: v,
      fx_rate: currency === "USD" ? fx?.mep ?? null : null,
    };
  }

  async function submitDirect() {
    const parsed = validateBeforeSubmit();
    if (!parsed || !category) return;
    try {
      await createIncome.mutateAsync({
        amount: parsed.amount,
        currency,
        fx_rate: parsed.fx_rate,
        category,
        source: source.trim() || null,
        date,
        note: note.trim() || null,
        distribution: null,
      });
      toast.success("Ingreso registrado");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  function goToDistribution() {
    const parsed = validateBeforeSubmit();
    if (!parsed) return;
    setStep("distribution");
  }

  async function submitWithDistribution(dist: IncomeDistribution) {
    const parsed = validateBeforeSubmit();
    if (!parsed || !category) return;
    try {
      await createIncome.mutateAsync({
        amount: parsed.amount,
        currency,
        fx_rate: parsed.fx_rate,
        category,
        source: source.trim() || null,
        date,
        note: note.trim() || null,
        distribution: dist,
      });
      toast.success("Ingreso registrado y distribuido");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="lg"
            className="h-11 gap-2 rounded-full bg-gradient-to-br from-lime-500 to-green-600 px-5 text-white shadow-lg shadow-lime-500/25 transition-all hover:from-lime-400 hover:to-green-500 hover:shadow-lime-500/40"
          >
            <Plus className="size-4" />
            Nuevo ingreso
          </Button>
        }
      />

      <DialogContent className="max-w-lg overflow-hidden border-white/5 bg-white/[0.03] backdrop-blur-xl p-0 backdrop-blur-xl">
        <AnimatePresence mode="wait">
          {step === "form" ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative flex max-h-[85vh] flex-col"
            >
              <div className="relative flex flex-col gap-5 overflow-y-auto p-6">
                {/* Background glow */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(132,204,22,0.1),transparent_60%)]" />

                {/* Header */}
                <div className="relative flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-lime-500/15 ring-1 ring-lime-500/30">
                    <Sparkles className="size-4 text-lime-300" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <DialogTitle className="text-lg font-semibold tracking-tight">
                      Nuevo ingreso
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground">
                      Cargá el monto y la categoría. Podés distribuirlo al finalizar.
                    </p>
                  </div>
                </div>

                {/* Templates one-click */}
                <div className="relative flex flex-col gap-2">
                  <Label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    <Zap className="size-3 text-lime-400" />
                    Carga rápida
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {INCOME_TEMPLATES.map((t) => {
                      const cat = INCOME_CATEGORIES_BY_ID[t.category];
                      const isActive = activeTemplate === t.id;
                      return (
                        <motion.button
                          key={t.id}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => applyTemplate(t.id)}
                          className={cn(
                            "group relative flex min-h-[72px] flex-col items-start justify-between overflow-hidden rounded-xl border bg-gradient-to-br p-2.5 text-left transition-all",
                            CATEGORY_CARD_GRADIENT[t.category],
                            isActive
                              ? `border-white/20 ring-1 ring-lime-500/40`
                              : "border-white/5 hover:border-white/10",
                          )}
                        >
                          <div
                            className={cn(
                              "flex size-6 items-center justify-center rounded-lg ring-1",
                              cat.bgClass,
                              cat.textClass,
                              cat.borderClass,
                            )}
                          >
                            <cat.icon className="size-3" />
                          </div>
                          <span className="text-[11px] font-bold leading-tight tracking-tight text-foreground">
                            {t.label}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Monto + currency toggle */}
                <div className="relative flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="amount"
                      className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                    >
                      Monto
                    </Label>
                    <div className="flex gap-0.5 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-0.5 text-[10px] font-semibold backdrop-blur">
                      <button
                        type="button"
                        onClick={() => setCurrency("ARS")}
                        className={cn(
                          "rounded-full px-2.5 py-1 uppercase tracking-widest transition-all",
                          currency === "ARS"
                            ? "bg-gradient-to-br from-lime-500 to-green-600 text-white shadow-md"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        ARS
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrency("USD")}
                        className={cn(
                          "rounded-full px-2.5 py-1 uppercase tracking-widest transition-all",
                          currency === "USD"
                            ? "bg-gradient-to-br from-lime-500 to-green-600 text-white shadow-md"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        USD
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-mono text-2xl text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="amount"
                      type="text"
                      inputMode="decimal"
                      autoFocus
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-16 rounded-2xl border-white/5 bg-white/[0.03] backdrop-blur-xl pl-10 font-mono text-3xl font-bold tabular-nums backdrop-blur focus-visible:border-lime-500/40 focus-visible:ring-lime-500/20"
                    />
                  </div>
                  {/* Preview de conversión */}
                  {parseNumber(amount) !== null && fx?.mep && (
                    <p className="rounded-lg bg-white/5 px-3 py-1.5 font-mono text-xs text-muted-foreground">
                      {currency === "ARS"
                        ? `≈ USD ${amountUsd.toFixed(2)} al MEP $${Math.round(fx.mep)}`
                        : `≈ ARS ${amountArs.toLocaleString("es-AR", { maximumFractionDigits: 0 })} al MEP $${Math.round(fx.mep)}`}
                    </p>
                  )}
                </div>

                {/* Categoría grid */}
                <div className="relative flex flex-col gap-2">
                  <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Categoría
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {INCOME_CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isActive = category === cat.id;
                      return (
                        <motion.button
                          key={cat.id}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => setCategory(cat.id)}
                          className={cn(
                            "group relative flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border bg-gradient-to-br p-1.5 text-center transition-all",
                            CATEGORY_CARD_GRADIENT[cat.id],
                            isActive
                              ? "border-white/20 ring-1 ring-lime-500/40"
                              : "border-white/5 hover:border-white/10",
                          )}
                          aria-label={cat.label}
                        >
                          <div className="relative">
                            <div
                              className={cn(
                                "absolute inset-0 rounded-lg opacity-60 blur-md",
                                cat.bgClass,
                              )}
                            />
                            <div
                              className={cn(
                                "relative flex size-8 items-center justify-center rounded-lg ring-1",
                                cat.bgClass,
                                cat.textClass,
                                cat.borderClass,
                              )}
                            >
                              <Icon className="size-4" />
                            </div>
                          </div>
                          <span className="text-[9px] font-semibold leading-tight tracking-tight text-foreground/90">
                            {cat.short}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Source + Date */}
                <div className="relative grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="source"
                      className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                    >
                      Origen
                    </Label>
                    <Input
                      id="source"
                      placeholder="Empresa, cliente..."
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="h-11 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl backdrop-blur focus-visible:border-white/20"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="date"
                      className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                    >
                      Fecha
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-11 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl backdrop-blur focus-visible:border-white/20"
                    />
                  </div>
                </div>

                {/* Nota */}
                <div className="relative flex flex-col gap-1.5">
                  <Label
                    htmlFor="note"
                    className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                  >
                    Nota
                  </Label>
                  <Input
                    id="note"
                    placeholder="Opcional"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={120}
                    className="h-11 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl backdrop-blur focus-visible:border-white/20"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="relative flex gap-2 border-t border-white/5 bg-white/[0.03] backdrop-blur-xl p-4 backdrop-blur">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={createIncome.isPending}
                  className="h-11 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl hover:bg-white/[0.03] backdrop-blur-xl"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={submitDirect}
                  disabled={createIncome.isPending}
                  variant="outline"
                  className="h-11 flex-1 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl font-semibold hover:bg-white/[0.03] backdrop-blur-xl"
                >
                  {createIncome.isPending ? "Guardando..." : "Guardar"}
                </Button>
                <Button
                  onClick={goToDistribution}
                  disabled={createIncome.isPending || !canDistribute}
                  title={
                    !canDistribute
                      ? "Elegí Sueldo, Bono o Freelance para distribuir"
                      : undefined
                  }
                  className="h-11 flex-1 gap-1 rounded-xl bg-gradient-to-br from-lime-500 to-green-600 text-white shadow-lg shadow-lime-500/25 transition-all hover:from-lime-400 hover:to-green-500 hover:shadow-lime-500/40 disabled:opacity-40"
                >
                  Distribuir
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <DistributionStep
              key="distribution"
              amountArs={amountArs}
              onBack={() => setStep("form")}
              onConfirm={submitWithDistribution}
              isSaving={createIncome.isPending}
              realExpenses={realExpenses}
            />
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
