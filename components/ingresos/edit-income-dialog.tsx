"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pencil, Sliders, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DISTRIBUTION_BUCKETS,
  INCOME_CATEGORIES,
  INCOME_CATEGORIES_BY_ID,
} from "@/lib/income-categories";
import type { IncomeCategory, IncomeDistribution } from "@/types/database";
import { type Income, useUpdateIncome } from "@/hooks/use-incomes";
import { sumExpensesByType, useExpenses } from "@/hooks/use-expenses";
import { useFxRates } from "@/hooks/use-prices";
import { firstOfMonth, fromISODate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DistributionStep } from "@/components/ingresos/distribution-step";

type Props = {
  open: boolean;
  income: Income;
  onClose: () => void;
};

const CATEGORY_HEADER_GRADIENT: Record<IncomeCategory, string> = {
  sueldo: "from-lime-500/20 via-lime-500/5 to-transparent",
  freelance: "from-sky-500/20 via-sky-500/5 to-transparent",
  alquiler_cobrado: "from-blue-500/20 via-blue-500/5 to-transparent",
  dividendos: "from-theme-500/20 via-theme-500/5 to-transparent",
  venta: "from-orange-500/20 via-orange-500/5 to-transparent",
  bono: "from-fuchsia-500/20 via-fuchsia-500/5 to-transparent",
  otros: "from-slate-500/20 via-slate-500/5 to-transparent",
};

// Categorías donde ofrecemos el botón "Distribuir" si todavía no tiene distribución.
const DEFAULT_DISTRIBUTE: IncomeCategory[] = ["sueldo", "bono", "freelance"];

// Acepta formato AR ("1.234,56") y anglo ("1,234.56" o "2.20").
function parseAmount(input: string): number | null {
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

export function EditIncomeDialog({ open, income, onClose }: Props) {
  const [step, setStep] = useState<Step>("form");
  const [amount, setAmount] = useState(String(income.amount));
  const [currency, setCurrency] = useState<"ARS" | "USD">(income.currency);
  const [category, setCategory] = useState<IncomeCategory>(income.category);
  const [source, setSource] = useState(income.source ?? "");
  const [date, setDate] = useState(income.date);
  const [note, setNote] = useState(income.note ?? "");
  const [distribution, setDistribution] = useState<IncomeDistribution | null>(
    income.distribution,
  );

  const { data: fx } = useFxRates();
  const update = useUpdateIncome();

  // Gastos reales del mes de este ingreso — la DistributionStep los usa para
  // lockear fixed/variable. Sigue la fecha editada por el usuario.
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

  // Reset al abrir o cambiar de ingreso.
  useEffect(() => {
    setStep("form");
    setAmount(String(income.amount));
    setCurrency(income.currency);
    setCategory(income.category);
    setSource(income.source ?? "");
    setDate(income.date);
    setNote(income.note ?? "");
    setDistribution(income.distribution);
  }, [income]);

  const cat = INCOME_CATEGORIES_BY_ID[category];
  const Icon = cat.icon;
  const canDistribute = DEFAULT_DISTRIBUTE.includes(category);

  // Preview del monto ARS para la distribución (usa MEP actual si es USD).
  const amountArsPreview = useMemo(() => {
    const v = parseAmount(amount);
    if (v === null) return 0;
    if (currency === "ARS") return v;
    return v * (fx?.mep ?? income.fx_rate ?? 0);
  }, [amount, currency, fx?.mep, income.fx_rate]);

  async function save() {
    const value = parseAmount(amount);
    if (value === null) {
      toast.error("Monto inválido.");
      return;
    }
    if (currency === "USD" && !fx?.mep && !income.fx_rate) {
      toast.error("No pude leer el MEP. Intentá de nuevo en un momento.");
      return;
    }

    // Si cambió la currency o el monto, recalculamos fx_rate con el MEP actual.
    // Si sigue siendo USD y el monto no cambió, preservamos el fx_rate original.
    const amountChanged = value !== Number(income.amount);
    const currencyChanged = currency !== income.currency;

    let fx_rate: number | null = null;
    if (currency === "USD") {
      if (currencyChanged || amountChanged) {
        fx_rate = fx?.mep ?? income.fx_rate;
      } else {
        fx_rate = income.fx_rate;
      }
    }

    try {
      await update.mutateAsync({
        id: income.id,
        patch: {
          amount: value,
          currency,
          fx_rate,
          category,
          source: source.trim() || null,
          date,
          note: note.trim() || null,
          distribution,
        },
      });
      toast.success("Ingreso actualizado");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  function handleDistributionConfirm(dist: IncomeDistribution) {
    setDistribution(dist);
    setStep("form");
  }

  function removeDistribution() {
    setDistribution(null);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg overflow-hidden border-white/5 bg-card/95 p-0 backdrop-blur-xl">
        <AnimatePresence mode="wait">
          {step === "form" ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex max-h-[85vh] flex-col"
            >
              {/* Header */}
              <div
                className={cn(
                  "relative flex items-center gap-3 overflow-hidden border-b border-white/5 bg-gradient-to-r p-4",
                  CATEGORY_HEADER_GRADIENT[category],
                )}
              >
                <div className="relative shrink-0">
                  <div
                    className={cn(
                      "absolute inset-0 rounded-xl opacity-60 blur-md",
                      cat.bgClass,
                    )}
                  />
                  <div
                    className={cn(
                      "relative flex size-10 items-center justify-center rounded-xl ring-1",
                      cat.bgClass,
                      cat.textClass,
                      cat.borderClass,
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                </div>
                <div className="relative flex min-w-0 flex-col">
                  <DialogTitle className="flex items-center gap-1.5 text-base font-semibold tracking-tight">
                    <Pencil className="size-3.5 text-muted-foreground" />
                    Editar ingreso
                  </DialogTitle>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {cat.label}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-4 overflow-y-auto p-5">
                {/* Monto + currency toggle */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="edit-amount"
                      className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                    >
                      Monto
                    </Label>
                    <div className="flex gap-0.5 rounded-full border border-white/5 bg-card/60 p-0.5 text-[10px] font-semibold backdrop-blur">
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
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-mono text-lg text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="edit-amount"
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-14 rounded-xl border-white/5 bg-card/60 pl-9 font-mono text-2xl font-bold tabular-nums backdrop-blur focus-visible:border-lime-500/40 focus-visible:ring-lime-500/20"
                    />
                  </div>
                  {currency === "USD" && fx?.mep && parseAmount(amount) !== null && (
                    <p className="rounded-lg bg-white/5 px-3 py-1.5 font-mono text-xs text-muted-foreground">
                      ≈ ARS{" "}
                      {amountArsPreview.toLocaleString("es-AR", {
                        maximumFractionDigits: 0,
                      })}{" "}
                      al MEP ${Math.round(fx.mep)}
                    </p>
                  )}
                </div>

                {/* Categoría */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Categoría
                  </Label>
                  <Select
                    value={category}
                    onValueChange={(v) => setCategory(v as IncomeCategory)}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-white/5 bg-card/60 backdrop-blur focus-visible:border-white/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INCOME_CATEGORIES.map((c) => {
                        const CatIcon = c.icon;
                        return (
                          <SelectItem key={c.id} value={c.id}>
                            <div className="flex items-center gap-2">
                              <CatIcon className={`size-3.5 ${c.textClass}`} />
                              {c.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Origen + Fecha */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="edit-source"
                      className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                    >
                      Origen
                    </Label>
                    <Input
                      id="edit-source"
                      placeholder="Empresa, cliente..."
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="h-11 rounded-xl border-white/5 bg-card/60 backdrop-blur focus-visible:border-white/20"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="edit-date"
                      className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                    >
                      Fecha
                    </Label>
                    <Input
                      id="edit-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-11 rounded-xl border-white/5 bg-card/60 backdrop-blur focus-visible:border-white/20"
                    />
                  </div>
                </div>

                {/* Nota */}
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="edit-note"
                    className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                  >
                    Nota
                  </Label>
                  <Input
                    id="edit-note"
                    placeholder="Opcional"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={120}
                    className="h-11 rounded-xl border-white/5 bg-card/60 backdrop-blur focus-visible:border-white/20"
                  />
                </div>

                {/* Distribución */}
                <div className="flex flex-col gap-2">
                  <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Distribución
                  </Label>

                  {distribution ? (
                    <div className="flex flex-col gap-2 rounded-xl border border-white/5 bg-card/40 p-3 backdrop-blur">
                      {/* Barra de colores */}
                      <div className="flex h-2.5 w-full overflow-hidden rounded-full ring-1 ring-white/10">
                        {DISTRIBUTION_BUCKETS.map((b) => {
                          const pct =
                            b.id === "fixed"
                              ? distribution.fixed_pct
                              : b.id === "variable"
                                ? distribution.variable_pct
                                : b.id === "invest"
                                  ? distribution.invest_pct
                                  : distribution.save_pct;
                          if (pct === 0) return null;
                          return (
                            <div
                              key={b.id}
                              style={{
                                width: `${pct}%`,
                                backgroundColor: b.color,
                              }}
                              className="h-full"
                            />
                          );
                        })}
                      </div>

                      {/* Legend compacto */}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                        {DISTRIBUTION_BUCKETS.map((b) => {
                          const pct =
                            b.id === "fixed"
                              ? distribution.fixed_pct
                              : b.id === "variable"
                                ? distribution.variable_pct
                                : b.id === "invest"
                                  ? distribution.invest_pct
                                  : distribution.save_pct;
                          return (
                            <span
                              key={b.id}
                              className="inline-flex items-center gap-1.5"
                            >
                              <span
                                className="size-1.5 rounded-full"
                                style={{ backgroundColor: b.color }}
                              />
                              <span className="text-muted-foreground">
                                {b.short}
                              </span>
                              <span className="font-mono font-semibold tabular-nums">
                                {pct}%
                              </span>
                            </span>
                          );
                        })}
                      </div>

                      {/* Actions */}
                      <div className="mt-1 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setStep("distribution")}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/5 bg-card/60 px-2.5 py-1.5 text-[11px] font-semibold text-foreground/90 backdrop-blur transition-colors hover:bg-white/10"
                        >
                          <Sliders className="size-3" />
                          Modificar
                        </button>
                        <button
                          type="button"
                          onClick={removeDistribution}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-rose-300 backdrop-blur transition-colors hover:bg-rose-500/20"
                        >
                          <Trash2 className="size-3" />
                          Quitar
                        </button>
                      </div>
                    </div>
                  ) : canDistribute ? (
                    <button
                      type="button"
                      onClick={() => setStep("distribution")}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/5 bg-card/40 px-3 py-2.5 text-xs font-semibold text-muted-foreground backdrop-blur transition-colors hover:bg-white/10 hover:text-foreground"
                    >
                      <Sliders className="size-3.5" />
                      Agregar distribución
                      <ArrowRight className="size-3.5" />
                    </button>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Sin distribución.
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter className="border-t border-white/5 bg-card/80 px-5 py-3 backdrop-blur">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={update.isPending}
                  className="h-10 rounded-xl border-white/5 bg-card/40 hover:bg-card/60"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={save}
                  disabled={update.isPending}
                  className="h-10 rounded-xl bg-gradient-to-br from-lime-500 to-green-600 text-white shadow-lg shadow-lime-500/25 transition-all hover:from-lime-400 hover:to-green-500 hover:shadow-lime-500/40 disabled:opacity-50"
                >
                  {update.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </DialogFooter>
            </motion.div>
          ) : (
            <DistributionStep
              key="distribution"
              amountArs={amountArsPreview}
              initial={distribution}
              onBack={() => setStep("form")}
              onConfirm={handleDistributionConfirm}
              isSaving={false}
              realExpenses={realExpenses}
            />
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
