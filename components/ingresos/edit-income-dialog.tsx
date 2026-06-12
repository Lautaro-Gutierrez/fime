"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  INCOME_CATEGORIES,
  INCOME_CATEGORIES_BY_ID,
} from "@/lib/income-categories";
import type { IncomeCategory } from "@/types/database";
import { type Income, useUpdateIncome, useDeleteIncome } from "@/hooks/use-incomes";
import { useFxRates } from "@/hooks/use-prices";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  income: Income;
  onClose: () => void;
};

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

export function EditIncomeDialog({ open, income, onClose }: Props) {
  const [amount, setAmount] = useState(String(income.amount));
  const [currency, setCurrency] = useState<"ARS" | "USD">(income.currency);
  const [category, setCategory] = useState<IncomeCategory>(income.category);
  const [source, setSource] = useState(income.source ?? "");
  const [date, setDate] = useState(income.date);
  const [note, setNote] = useState(income.note ?? "");

  const { data: fx } = useFxRates();
  const update = useUpdateIncome();
  const del = useDeleteIncome();

  // Reset al abrir o cambiar de ingreso.
  useEffect(() => {
    setAmount(String(income.amount));
    setCurrency(income.currency);
    setCategory(income.category);
    setSource(income.source ?? "");
    setDate(income.date);
    setNote(income.note ?? "");
  }, [income]);

  const cat = INCOME_CATEGORIES_BY_ID[category];
  const Icon = cat.icon;

  // Preview del monto ARS para la distribución (usa MEP actual si es USD).
  const amountArsPreview = useMemo(() => {
    const v = parseAmount(amount);
    if (v === null) return 0;
    if (currency === "ARS") return v;
    return v * (fx?.mep ?? income.fx_rate ?? 0);
  }, [amount, currency, fx?.mep, income.fx_rate]);

  const amountUsdPreview = useMemo(() => {
    const v = parseAmount(amount);
    if (v === null) return 0;
    if (currency === "USD") return v;
    const rate = fx?.mep ?? income.fx_rate ?? 0;
    if (rate === 0) return 0;
    return v / rate;
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
          distribution: null,
        },
      });
      toast.success("Ingreso actualizado");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  function performDelete() {
    if (confirm("¿Seguro que querés eliminar este ingreso?")) {
      del.mutate(income.id, {
        onSuccess: () => {
          toast.success("Ingreso eliminado");
          onClose();
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Error al eliminar"),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md overflow-hidden bg-[#1F2229] border border-white/[0.06] rounded-[24px] p-0 shadow-2xl">
        <div className="relative flex max-h-[85vh] flex-col">
          <div className="relative flex flex-col gap-5 overflow-y-auto p-6">
            {/* Header */}
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Pencil className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <DialogTitle className="text-lg font-semibold tracking-tight text-white">
                    Editar ingreso
                  </DialogTitle>
                  <p className="text-xs text-slate-400">
                    Modificá los detalles de tu ingreso en el pozo común.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={performDelete}
                disabled={del.isPending}
                className="flex size-9 items-center justify-center rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
                title="Eliminar ingreso"
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            {/* Monto + currency toggle */}
            <div className="relative flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="edit-amount"
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
                  id="edit-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-16 w-full rounded-2xl border-0 bg-transparent pl-2 pr-4 font-mono text-4xl font-bold tabular-nums text-white focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              {/* Preview de conversión */}
              {parseAmount(amount) !== null && (fx?.mep || income.fx_rate) && (
                <p className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-1.5 font-mono text-xs text-slate-400">
                  {currency === "ARS"
                    ? `≈ USD ${amountUsdPreview.toFixed(2)} al MEP $${Math.round(fx?.mep ?? income.fx_rate ?? 0)}`
                    : `≈ ARS ${amountArsPreview.toLocaleString("es-AR", { maximumFractionDigits: 0 })} al MEP $${Math.round(fx?.mep ?? income.fx_rate ?? 0)}`}
                </p>
              )}
            </div>

            {/* Categoría grid */}
            <div className="relative flex flex-col gap-2">
              <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Categoría
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {INCOME_CATEGORIES.map((catItem) => {
                  const CatIcon = catItem.icon;
                  const style = INCOME_CATEGORY_STYLES[catItem.id];
                  const isActive = category === catItem.id;
                  const disabled = !amount;
                  return (
                    <motion.button
                      key={catItem.id}
                      type="button"
                      whileHover={disabled ? undefined : { y: -2 }}
                      whileTap={disabled ? undefined : { scale: 0.96 }}
                      onClick={() => setCategory(catItem.id)}
                      disabled={disabled}
                      className={cn(
                        "group relative flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border p-1.5 text-center transition-all",
                        isActive ? style.active : style.inactive,
                        disabled && "cursor-not-allowed opacity-40"
                      )}
                      aria-label={catItem.label}
                    >
                      <CatIcon className="size-5" />
                      <span className="font-semibold text-slate-200 text-[9px] mt-1">
                        {catItem.short}
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
                  htmlFor="edit-source"
                  className="text-[10px] font-semibold uppercase tracking-widest text-slate-400"
                >
                  Origen
                </Label>
                <Input
                  id="edit-source"
                  placeholder="Empresa, cliente..."
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="h-11 rounded-xl border border-white/[0.06] bg-[#1A1D24] text-white focus-visible:border-white/20 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-500"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="edit-date"
                  className="text-[10px] font-semibold uppercase tracking-widest text-slate-400"
                >
                  Fecha
                </Label>
                <Input
                  id="edit-date"
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
                htmlFor="edit-note"
                className="text-[10px] font-semibold uppercase tracking-widest text-slate-400"
              >
                Nota
              </Label>
              <Input
                id="edit-note"
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
              onClick={onClose}
              className="h-10 rounded-xl border-white/[0.06] bg-transparent hover:bg-white/[0.04] text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={save}
              disabled={update.isPending || !category || !amount}
              className="h-10 rounded-xl bg-gradient-to-r from-[#d946ef] to-[#06b6d4] hover:opacity-90 text-white font-semibold shadow-lg shadow-fuchsia-500/20 transition-all border-0"
            >
              {update.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
