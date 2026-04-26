"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, CalendarDays, StickyNote, Sparkles } from "lucide-react";
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
import { CATEGORIES } from "@/lib/categories";
import type { ExpenseCategory, ExpenseType } from "@/types/database";
import {
  isFutureMonth,
  lastOfMonth,
  toISODate,
} from "@/lib/format";
import { useCreateExpense } from "@/hooks/use-expenses";
import { cn } from "@/lib/utils";

// Gradient de fondo por categoría en las cards del grid.
const CATEGORY_CARD_GRADIENT: Record<ExpenseCategory, string> = {
  alquiler: "from-blue-500/20 via-blue-500/5 to-transparent",
  servicios: "from-amber-500/20 via-amber-500/5 to-transparent",
  impuestos: "from-red-500/20 via-red-500/5 to-transparent",
  comida: "from-emerald-500/20 via-emerald-500/5 to-transparent",
  tarjeta_credito: "from-violet-500/20 via-violet-500/5 to-transparent",
  educacion: "from-cyan-500/20 via-cyan-500/5 to-transparent",
  imprevistos: "from-pink-500/20 via-pink-500/5 to-transparent",
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

export function QuickAdd() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<ExpenseType>("variable");
  const [date, setDate] = useState(toISODate(new Date()));
  const [note, setNote] = useState("");
  const [showExtras, setShowExtras] = useState(false);

  const createExpense = useCreateExpense();

  useEffect(() => {
    if (!open) {
      setAmount("");
      setType("variable");
      setDate(toISODate(new Date()));
      setNote("");
      setShowExtras(false);
    }
  }, [open]);

  const today = new Date();
  const maxDate = toISODate(lastOfMonth(today));

  function handleDateChange(value: string) {
    if (!value) return;
    const picked = new Date(value);
    if (isFutureMonth(picked)) {
      toast.error("Solo se pueden cargar gastos hasta fin del mes en curso.");
      return;
    }
    setDate(value);
  }

  async function submit(category: ExpenseCategory) {
    const value = parseAmount(amount);
    if (value === null) {
      toast.error("Ingresá un monto válido.");
      return;
    }

    try {
      await createExpense.mutateAsync({
        amount: value,
        category,
        type,
        date,
        note: note.trim() || null,
      });
      toast.success("Gasto registrado");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  const isToday = date === toISODate(new Date());

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="lg"
            className="h-11 gap-2 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 px-5 text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-400 hover:to-teal-500 hover:shadow-emerald-500/40"
          >
            <Plus className="size-4" />
            Nuevo gasto
          </Button>
        }
      />

      <DialogContent className="max-w-md overflow-hidden border-white/5 bg-card/95 p-0 backdrop-blur-xl">
        <div className="relative flex flex-col gap-5 p-6">
          {/* Background glow */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.1),transparent_60%)]" />

          <div className="relative flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-500/30">
              <Sparkles className="size-4 text-emerald-300" />
            </div>
            <div className="flex flex-col gap-0.5">
              <DialogTitle className="text-lg font-semibold tracking-tight">
                Nuevo gasto
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Monto primero, después tapea la categoría.
              </p>
            </div>
          </div>

          {/* Monto hero */}
          <div className="relative flex flex-col gap-2">
            <Label htmlFor="amount" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Monto · ARS
            </Label>
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
                className="h-16 rounded-2xl border-white/5 bg-card/60 pl-10 font-mono text-3xl font-bold tabular-nums backdrop-blur focus-visible:border-emerald-500/40 focus-visible:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Chips: fecha y nota */}
          <div className="relative flex flex-wrap gap-2">
            <button
              onClick={() => setShowExtras((s) => !s)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                !isToday
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                  : "border-white/5 bg-card/40 text-muted-foreground hover:border-white/10 hover:text-foreground",
              )}
            >
              <CalendarDays className="size-3.5" />
              {isToday ? "Hoy" : date}
            </button>
            <button
              onClick={() => setShowExtras(true)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                note
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-white/5 bg-card/40 text-muted-foreground hover:border-white/10 hover:text-foreground",
              )}
            >
              <StickyNote className="size-3.5" />
              {note ? "Nota agregada" : "Agregar nota"}
            </button>
          </div>

          {showExtras && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.25 }}
              className="relative flex flex-col gap-3 overflow-hidden"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="date" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Fecha
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  max={maxDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="h-11 rounded-xl border-white/5 bg-card/60 backdrop-blur focus-visible:border-white/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="note" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Nota
                </Label>
                <Input
                  id="note"
                  type="text"
                  placeholder="Opcional"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={120}
                  className="h-11 rounded-xl border-white/5 bg-card/60 backdrop-blur focus-visible:border-white/20"
                />
              </div>
            </motion.div>
          )}

          {/* Toggle Fijo / Variable — afecta al Sankey de Ingresos */}
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Tipo
              </Label>
              <span className="text-[10px] text-muted-foreground">
                {type === "fixed"
                  ? "Recurrente mensual (alquiler, servicios)"
                  : "Discrecional del mes"}
              </span>
            </div>
            <div className="flex gap-0.5 rounded-full border border-white/5 bg-card/60 p-0.5 text-[10px] font-semibold backdrop-blur">
              <button
                type="button"
                onClick={() => setType("variable")}
                className={cn(
                  "rounded-full px-3 py-1.5 uppercase tracking-widest transition-all",
                  type === "variable"
                    ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Variable
              </button>
              <button
                type="button"
                onClick={() => setType("fixed")}
                className={cn(
                  "rounded-full px-3 py-1.5 uppercase tracking-widest transition-all",
                  type === "fixed"
                    ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Fijo
              </button>
            </div>
          </div>

          <div className="relative flex flex-col gap-2">
            <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Categoría
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((cat, idx) => {
                const Icon = cat.icon;
                const disabled = createExpense.isPending || !amount;
                return (
                  <motion.button
                    key={cat.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.02 }}
                    whileHover={disabled ? undefined : { y: -2 }}
                    whileTap={disabled ? undefined : { scale: 0.96 }}
                    onClick={() => submit(cat.id)}
                    disabled={disabled}
                    className={cn(
                      "group relative flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br p-1.5 text-center transition-all hover:border-white/10",
                      CATEGORY_CARD_GRADIENT[cat.id],
                      disabled && "cursor-not-allowed opacity-40",
                    )}
                    aria-label={cat.label}
                  >
                    {/* Icon con glow */}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
