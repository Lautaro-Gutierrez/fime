"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, CalendarDays, StickyNote, Sparkles, CreditCard as CreditCardIcon, ArrowLeft } from "lucide-react";
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
import { useCreditCards } from "@/hooks/use-credit-cards";
import { colorFromHex } from "@/lib/credit-cards";
import { cn } from "@/lib/utils";

// Gradient de fondo por categoría en las cards del grid.
const CATEGORY_CARD_GRADIENT: Record<ExpenseCategory, string> = {
  alquiler: "from-blue-500/20 via-blue-500/5 to-transparent",
  servicios: "from-theme-500/20 via-theme-500/5 to-transparent",
  impuestos: "from-red-500/20 via-red-500/5 to-transparent",
  comida: "from-theme-500/20 via-theme-500/5 to-transparent",
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

export function QuickAdd({ customTrigger }: { customTrigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<ExpenseType>("variable");
  const [date, setDate] = useState(toISODate(new Date()));
  const [note, setNote] = useState("");
  const [showExtras, setShowExtras] = useState(false);
  // Segundo paso: selección de tarjeta
  const [pickingCard, setPickingCard] = useState(false);
  const [cardId, setCardId] = useState<string | null>(null);

  const createExpense = useCreateExpense();
  const { data: cards = [] } = useCreditCards();

  useEffect(() => {
    if (!open) {
      setAmount("");
      setType("variable");
      setDate(toISODate(new Date()));
      setNote("");
      setShowExtras(false);
      setPickingCard(false);
      setCardId(null);
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

  async function submit(category: ExpenseCategory, selectedCardId?: string | null) {
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
        card_id: category === "tarjeta_credito" ? (selectedCardId ?? null) : null,
      });
      toast.success("Gasto registrado");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  function handleCategoryClick(category: ExpenseCategory) {
    if (category === "tarjeta_credito" && cards.length > 0) {
      // Abrir segundo paso de selección de tarjeta
      setPickingCard(true);
      return;
    }
    if (category === "tarjeta_credito" && cards.length === 0) {
      toast.info("Podés agregar tarjetas en Configuración → Tarjetas");
    }
    submit(category);
  }

  function handleCardSelect(selectedCardId: string) {
    setCardId(selectedCardId);
    submit("tarjeta_credito", selectedCardId);
  }

  const isToday = date === toISODate(new Date());

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {customTrigger ? (
        <DialogTrigger render={customTrigger as React.ReactElement} />
      ) : (
        <DialogTrigger
          render={
            <Button
              id="gastos-quick-add"
              size="lg"
              className="h-11 gap-2 rounded-lg border border-white/[0.12] bg-white/[0.06] px-5 text-foreground transition-all hover:bg-white/[0.10]"
            >
              <Plus className="size-4" />
              Nuevo gasto
            </Button>
          }
        />
      )}

      <DialogContent className="max-w-md overflow-hidden border-white/5 bg-white/[0.03] backdrop-blur-xl p-0 backdrop-blur-xl">
        <div className="relative flex flex-col gap-5 p-6">
          {/* Background glow */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.1),transparent_60%)]" />

          <div className="relative flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-theme-500/15 ring-1 ring-theme-500/30">
              <Sparkles className="size-4 text-theme-300" />
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
                className="h-16 rounded-2xl border-white/5 bg-white/[0.03] backdrop-blur-xl pl-10 font-mono text-3xl font-bold tabular-nums backdrop-blur focus-visible:border-theme-500/40 focus-visible:ring-theme-500/20"
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
                  ? "border-theme-500/30 bg-theme-500/10 text-theme-300"
                  : "border-white/5 bg-white/[0.03] backdrop-blur-xl text-muted-foreground hover:border-white/10 hover:text-foreground",
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
                  ? "border-theme-500/30 bg-theme-500/10 text-theme-300"
                  : "border-white/5 bg-white/[0.03] backdrop-blur-xl text-muted-foreground hover:border-white/10 hover:text-foreground",
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
                  className="h-11 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl focus-visible:border-white/20"
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
                  className="h-11 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl focus-visible:border-white/20"
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
            <div className="flex gap-0.5 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-0.5 text-[10px] font-semibold backdrop-blur">
              <button
                type="button"
                onClick={() => setType("variable")}
                className={cn(
                  "rounded-full px-3 py-1.5 uppercase tracking-widest transition-all",
                  type === "variable"
                    ? "bg-theme-500/10 border border-theme-500/20 text-theme-300"
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
                    ? "bg-theme-500/10 border border-theme-500/20 text-theme-300"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Fijo
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!pickingCard ? (
              <motion.div
                key="categories"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, x: -20 }}
                className="relative flex flex-col gap-2"
              >
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
                        onClick={() => handleCategoryClick(cat.id)}
                        disabled={disabled}
                        className={cn(
                          "group relative flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br p-1.5 text-center transition-all hover:border-white/10",
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
              </motion.div>
            ) : (
              <motion.div
                key="card-picker"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="relative flex flex-col gap-3"
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPickingCard(false)}
                    className="flex size-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl text-muted-foreground transition-colors hover:border-white/10 hover:text-foreground"
                  >
                    <ArrowLeft className="size-3.5" />
                  </button>
                  <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    ¿Con qué tarjeta?
                  </Label>
                </div>
                <div className="flex flex-col gap-1.5">
                  {cards.map((card, idx) => {
                    const cardColor = colorFromHex(card.color);
                    return (
                      <motion.button
                        key={card.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15, delay: idx * 0.03 }}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleCardSelect(card.id)}
                        disabled={createExpense.isPending}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl px-4 py-3 text-left transition-all hover:border-white/10",
                          createExpense.isPending && "cursor-not-allowed opacity-40",
                        )}
                      >
                        <div
                          className="size-3 shrink-0 rounded-full ring-2"
                          style={{ backgroundColor: cardColor.hex, boxShadow: `0 0 8px ${cardColor.hex}40` }}
                        />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-semibold tracking-tight text-foreground">
                            {card.name}
                          </span>
                          {card.last_four && (
                            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                              •••• {card.last_four}
                            </span>
                          )}
                        </div>
                        <CreditCardIcon className={cn("size-4", cardColor.textClass)} />
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
