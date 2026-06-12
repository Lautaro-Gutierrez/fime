"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Sparkles, Zap } from "lucide-react";
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
import type { IncomeCategory } from "@/types/database";
import { toISODate } from "@/lib/format";
import {
  useCreateIncome,
  useLastIncomeByCategory,
} from "@/hooks/use-incomes";
import { useFxRates } from "@/hooks/use-prices";
import { cn } from "@/lib/utils";

const INCOME_CATEGORY_STYLES: Record<IncomeCategory, { inactive: string; active: string }> = {
  sueldo: {
    inactive: "bg-emerald-500/10 text-emerald-400 border-white/[0.06] hover:bg-emerald-500/15",
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
  },
  freelance: {
    inactive: "bg-[#8B5CF6]/10 text-[#8B5CF6] border-white/[0.06] hover:bg-[#8B5CF6]/15",
    active: "bg-[#8B5CF6]/20 text-[#8B5CF6] border-[#8B5CF6]/50",
  },
  alquiler_cobrado: {
    inactive: "bg-blue-500/10 text-blue-400 border-white/[0.06] hover:bg-blue-500/15",
    active: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  },
  dividendos: {
    inactive: "bg-amber-500/10 text-amber-400 border-white/[0.06] hover:bg-amber-500/15",
    active: "bg-amber-500/20 text-amber-400 border-amber-500/50",
  },
  venta: {
    inactive: "bg-orange-500/10 text-orange-400 border-white/[0.06] hover:bg-orange-500/15",
    active: "bg-orange-500/20 text-orange-400 border-orange-500/50",
  },
  bono: {
    inactive: "bg-indigo-500/10 text-indigo-400 border-white/[0.06] hover:bg-indigo-500/15",
    active: "bg-indigo-500/20 text-indigo-400 border-indigo-500/50",
  },
  otros: {
    inactive: "bg-slate-500/10 text-slate-400 border-white/[0.06] hover:bg-slate-500/15",
    active: "bg-slate-500/20 text-slate-400 border-slate-500/50",
  },
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

export function QuickAddIncome() {
  const [open, setOpen] = useState(false);

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

  // Hooks templates: para cada template, traemos el último ingreso de su categoría
  // y lo usamos como sugerencia al hacer click.
  const lastSueldo = useLastIncomeByCategory("sueldo");
  const lastBono = useLastIncomeByCategory("bono");

  useEffect(() => {
    if (!open) {
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

  // Monto ARS calculado (para preview)
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            id="ingresos-quick-add"
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nuevo ingreso
          </button>
        }
      />

      <DialogContent className="max-w-md overflow-hidden bg-[#1F2229] border border-white/[0.06] rounded-[24px] p-0 shadow-2xl">
        <div className="relative flex max-h-[85vh] flex-col">
          <div className="relative flex flex-col gap-5 overflow-y-auto p-6">
            {/* Header */}
            <div className="relative flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Sparkles className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5">
                <DialogTitle className="text-lg font-semibold tracking-tight text-white">
                  Nuevo ingreso
                </DialogTitle>
                <p className="text-xs text-slate-400">
                  Cargá el monto y la categoría para registrar un ingreso en tu pozo común.
                </p>
              </div>
            </div>

            {/* Templates one-click */}
            <div className="relative flex flex-col gap-2">
              <Label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                <Zap className="size-3 text-emerald-400 animate-pulse" />
                Carga rápida
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {INCOME_TEMPLATES.map((t) => {
                  const cat = INCOME_CATEGORIES_BY_ID[t.category];
                  const isActive = activeTemplate === t.id;
                  const style = INCOME_CATEGORY_STYLES[t.category];
                  return (
                    <motion.button
                      key={t.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => applyTemplate(t.id)}
                      className={cn(
                        "group relative flex min-h-[72px] flex-col items-start justify-between rounded-xl border p-2.5 text-left transition-all",
                        isActive ? style.active : style.inactive
                      )}
                    >
                      <div
                        className={cn(
                          "flex size-6 items-center justify-center rounded-lg",
                          isActive ? "bg-white/10" : "bg-white/5",
                          cat.textClass
                        )}
                      >
                        <cat.icon className="size-3.5" />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-200">
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
                  className="text-[10px] font-semibold uppercase tracking-widest text-slate-400"
                >
                  Monto · {currency}
                </Label>
                <div className="flex gap-0.5 rounded-full bg-[#1A1D24] border border-white/[0.06] p-0.5 text-[10px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setCurrency("ARS")}
                    className={cn(
                      "rounded-full px-2.5 py-1 uppercase tracking-widest transition-all",
                      currency === "ARS"
                        ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
                        : "text-slate-500 hover:text-white"
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
                        ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
                        : "text-slate-500 hover:text-white"
                    )}
                  >
                    USD
                  </button>
                </div>
              </div>
              <div className="relative flex items-center bg-[#1A1D24] border border-white/[0.06] focus-within:border-fuchsia-500/50 rounded-2xl transition-all">
                <span className="pointer-events-none pl-4 font-mono text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-cyan-400">
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
                  className="h-16 w-full rounded-2xl border-0 bg-transparent pl-2 pr-4 font-mono text-4xl font-bold tabular-nums text-white focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              {/* Preview de conversión */}
              {parseNumber(amount) !== null && fx?.mep && (
                <p className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-1.5 font-mono text-xs text-slate-400">
                  {currency === "ARS"
                    ? `≈ USD ${amountUsd.toFixed(2)} al MEP $${Math.round(fx.mep)}`
                    : `≈ ARS ${amountArs.toLocaleString("es-AR", { maximumFractionDigits: 0 })} al MEP $${Math.round(fx.mep)}`}
                </p>
              )}
            </div>

            {/* Categoría grid */}
            <div className="relative flex flex-col gap-2">
              <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Categoría
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {INCOME_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const style = INCOME_CATEGORY_STYLES[cat.id];
                  const isActive = category === cat.id;
                  const disabled = !amount;
                  return (
                    <motion.button
                      key={cat.id}
                      type="button"
                      whileHover={disabled ? undefined : { y: -2 }}
                      whileTap={disabled ? undefined : { scale: 0.96 }}
                      onClick={() => setCategory(cat.id)}
                      disabled={disabled}
                      className={cn(
                        "group relative flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border p-1.5 text-center transition-all",
                        isActive ? style.active : style.inactive,
                        disabled && "cursor-not-allowed opacity-40"
                      )}
                      aria-label={cat.label}
                    >
                      <Icon className="size-5" />
                      <span className="font-semibold text-slate-200 text-[9px] mt-1">
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
                  className="text-[10px] font-semibold uppercase tracking-widest text-slate-400"
                >
                  Origen
                </Label>
                <Input
                  id="source"
                  placeholder="Empresa, cliente..."
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="h-11 rounded-xl border border-white/[0.06] bg-[#1A1D24] text-white focus-visible:border-white/20 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-500"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="date"
                  className="text-[10px] font-semibold uppercase tracking-widest text-slate-400"
                >
                  Fecha
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 rounded-xl border border-white/[0.06] bg-[#1A1D24] text-white focus-visible:border-white/20 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            {/* Nota */}
            <div className="relative flex flex-col gap-1.5">
              <Label
                htmlFor="note"
                className="text-[10px] font-semibold uppercase tracking-widest text-slate-400"
              >
                Nota
              </Label>
              <Input
                id="note"
                placeholder="Opcional"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={120}
                className="h-11 rounded-xl border border-white/[0.06] bg-[#1A1D24] text-white focus-visible:border-white/20 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Footer Rediseñado */}
          <div className="flex items-center justify-between border-t border-white/[0.06] bg-[#1A1D24] px-6 py-4 rounded-b-[24px]">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="h-10 rounded-xl border-white/[0.06] bg-transparent hover:bg-white/[0.04] text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={submitDirect}
              disabled={createIncome.isPending || !category || !amount}
              className="h-10 rounded-xl bg-gradient-to-r from-[#d946ef] to-[#06b6d4] hover:opacity-90 text-white font-semibold shadow-lg shadow-fuchsia-500/20 transition-all border-0"
            >
              {createIncome.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
