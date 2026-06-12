"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, CalendarDays, StickyNote, Sparkles, CreditCard as CreditCardIcon, ArrowLeft, Trash2, Pencil } from "lucide-react";
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
import { useCreateExpense, useUpdateExpense, useDeleteExpense, type Expense } from "@/hooks/use-expenses";
import { useCreditCards } from "@/hooks/use-credit-cards";
import { colorFromHex } from "@/lib/credit-cards";
import { cn } from "@/lib/utils";

// Estilo de categoría con fondo pastel y estados activo/inactivo coherentes
const CATEGORY_STYLES: Record<ExpenseCategory | "suscripciones", { inactive: string; active: string; text: string }> = {
  alquiler: { inactive: "bg-blue-500/10 text-blue-400 border-transparent hover:bg-blue-500/15", active: "bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-[0_0_12px_rgba(59,130,246,0.2)]", text: "text-blue-400" },
  servicios: { inactive: "bg-amber-500/10 text-amber-400 border-transparent hover:bg-amber-500/15", active: "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]", text: "text-amber-400" },
  impuestos: { inactive: "bg-red-500/10 text-red-400 border-transparent hover:bg-red-500/15", active: "bg-red-500/20 text-red-300 border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.2)]", text: "text-red-400" },
  comida: { inactive: "bg-emerald-500/10 text-emerald-400 border-transparent hover:bg-emerald-500/15", active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.2)]", text: "text-emerald-400" },
  tarjeta_credito: { inactive: "bg-violet-500/10 text-violet-400 border-transparent hover:bg-violet-500/15", active: "bg-violet-500/20 text-violet-300 border-violet-500/50 shadow-[0_0_12px_rgba(139,92,246,0.2)]", text: "text-violet-400" },
  educacion: { inactive: "bg-cyan-500/10 text-cyan-400 border-transparent hover:bg-cyan-500/15", active: "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.2)]", text: "text-cyan-400" },
  imprevistos: { inactive: "bg-pink-500/10 text-pink-400 border-transparent hover:bg-pink-500/15", active: "bg-pink-500/20 text-pink-300 border-pink-500/50 shadow-[0_0_12px_rgba(236,72,153,0.2)]", text: "text-pink-400" },
  suscripciones: { inactive: "bg-rose-500/10 text-rose-400 border-transparent hover:bg-rose-500/15", active: "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.2)]", text: "text-rose-400" },
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

export function QuickAdd({
  customTrigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  expenseToEdit,
  onClose,
}: {
  customTrigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  expenseToEdit?: Expense | null;
  onClose?: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  
  const setOpen = (o: boolean) => {
    if (isControlled) {
      controlledOnOpenChange?.(o);
      if (!o) onClose?.();
    } else {
      setInternalOpen(o);
    }
  };

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory | "suscripciones" | "">("");
  const [type, setType] = useState<ExpenseType>("variable");
  const [date, setDate] = useState(toISODate(new Date()));
  const [note, setNote] = useState("");
  const [showExtras, setShowExtras] = useState(false);
  const [pickingCard, setPickingCard] = useState(false);
  const [cardId, setCardId] = useState<string | null>(null);

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const { data: cards = [] } = useCreditCards();

  // Sincronizar datos al abrir en modo edición o creación
  useEffect(() => {
    if (open) {
      if (expenseToEdit) {
        setAmount(String(expenseToEdit.amount));
        setType(expenseToEdit.type);
        setDate(expenseToEdit.date);
        setNote(expenseToEdit.note ?? "");
        setCardId(expenseToEdit.card_id);
        
        if (expenseToEdit.is_subscription) {
          setCategory("suscripciones");
        } else {
          setCategory(expenseToEdit.category);
        }
        
        setShowExtras(!!expenseToEdit.note || expenseToEdit.date !== toISODate(new Date()));
        setPickingCard(false);
      } else {
        setAmount("");
        setCategory("");
        setType("variable");
        setDate(toISODate(new Date()));
        setNote("");
        setShowExtras(false);
        setPickingCard(false);
        setCardId(null);
      }
    }
  }, [open, expenseToEdit]);

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

  async function submit(selectedCategory?: ExpenseCategory | "suscripciones", selectedCardId?: string | null) {
    const finalCategory = selectedCategory || category;
    if (!finalCategory) {
      toast.error("Seleccioná una categoría.");
      return;
    }

    const value = parseAmount(amount);
    if (value === null) {
      toast.error("Ingresá un monto válido.");
      return;
    }

    let dbCategory: ExpenseCategory;
    let isSubscription = false;

    if (finalCategory === "suscripciones") {
      dbCategory = "servicios";
      isSubscription = true;
    } else {
      dbCategory = finalCategory;
      isSubscription = false;
    }

    try {
      if (expenseToEdit) {
        await updateExpense.mutateAsync({
          id: expenseToEdit.id,
          patch: {
            amount: value,
            category: dbCategory,
            type,
            date,
            note: note.trim() || null,
            card_id: dbCategory === "tarjeta_credito" ? (selectedCardId !== undefined ? selectedCardId : cardId) : null,
            is_subscription: isSubscription,
          },
        });
        toast.success("Gasto actualizado");
      } else {
        await createExpense.mutateAsync({
          amount: value,
          category: dbCategory,
          type,
          date,
          note: note.trim() || null,
          card_id: dbCategory === "tarjeta_credito" ? (selectedCardId !== undefined ? selectedCardId : cardId) : null,
          is_subscription: isSubscription,
        });
        toast.success("Gasto registrado");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  function handleCategoryClick(catId: ExpenseCategory | "suscripciones") {
    setCategory(catId);
    if (catId === "tarjeta_credito" && cards.length > 0) {
      setPickingCard(true);
    }
  }

  function handleCardSelect(selectedCardId: string) {
    setCardId(selectedCardId);
    setPickingCard(false);
  }

  function handleDelete() {
    if (!expenseToEdit) return;
    if (confirm("¿Seguro que querés eliminar este gasto?")) {
      deleteExpense.mutate(expenseToEdit.id, {
        onSuccess: () => {
          toast.success("Gasto eliminado");
          setOpen(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Error al eliminar");
        }
      });
    }
  }

  const isToday = date === toISODate(new Date());

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {customTrigger && !isControlled && (
        <DialogTrigger render={customTrigger as React.ReactElement} />
      )}
      {!customTrigger && !isControlled && (
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

      <DialogContent className="max-w-md overflow-hidden bg-[#1F2229] border border-white/[0.06] rounded-[24px] p-0">
        <div className="relative flex flex-col gap-5 p-6">
          <div className="relative flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-theme-500/15 ring-1 ring-theme-500/30">
              {expenseToEdit ? (
                <Pencil className="size-4 text-theme-300" />
              ) : (
                <Sparkles className="size-4 text-theme-300" />
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <DialogTitle className="text-lg font-semibold tracking-tight text-white">
                {expenseToEdit ? "Editar gasto" : "Nuevo gasto"}
              </DialogTitle>
              <p className="text-xs text-slate-400">
                {expenseToEdit ? "Modificá los detalles de tu registro." : "Monto primero, después seleccioná la categoría."}
              </p>
            </div>
          </div>

          {/* Monto Input Rediseñado */}
          <div className="relative flex flex-col gap-2">
            <Label htmlFor="amount" className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Monto · ARS
            </Label>
            <div className="relative rounded-2xl p-[1px] transition-all bg-white/[0.04] focus-within:bg-gradient-to-r focus-within:from-[#d946ef] focus-within:to-[#06b6d4]">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-mono text-2xl text-slate-400">
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
                className="h-16 w-full rounded-[15px] border-0 bg-[#1A1D24] pl-10 font-mono text-3xl font-bold tabular-nums text-white focus-visible:ring-0 focus-visible:ring-offset-0"
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
                  : "border-white/5 bg-white/[0.03] text-slate-400 hover:border-white/10 hover:text-white",
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
                  : "border-white/5 bg-white/[0.03] text-slate-400 hover:border-white/10 hover:text-white",
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
                <Label htmlFor="date" className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Fecha
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  max={maxDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="h-11 rounded-xl border-white/5 bg-[#1A1D24] text-white focus-visible:border-white/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="note" className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Nota
                </Label>
                <Input
                  id="note"
                  type="text"
                  placeholder="Opcional"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={120}
                  className="h-11 rounded-xl border-white/5 bg-[#1A1D24] text-white focus-visible:border-white/20"
                />
              </div>
            </motion.div>
          )}

          {/* Toggle Fijo / Variable Rediseñado */}
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Tipo
              </Label>
              <span className="text-[10px] text-slate-500">
                {type === "fixed"
                  ? "Recurrente mensual (alquiler, servicios)"
                  : "Discrecional del mes"}
              </span>
            </div>
            <div className="flex gap-0.5 rounded-full bg-[#1A1D24] p-1 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setType("variable")}
                className={cn(
                  "rounded-full px-4 py-1.5 uppercase tracking-widest transition-all",
                  type === "variable"
                    ? "bg-white/[0.08] text-white"
                    : "text-slate-400 hover:text-white",
                )}
              >
                Variable
              </button>
              <button
                type="button"
                onClick={() => setType("fixed")}
                className={cn(
                  "rounded-full px-4 py-1.5 uppercase tracking-widest transition-all",
                  type === "fixed"
                    ? "bg-white/[0.08] text-white"
                    : "text-slate-400 hover:text-white",
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
                <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Categoría
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map((cat, idx) => {
                    const Icon = cat.icon;
                    const style = CATEGORY_STYLES[cat.id];
                    const isActive = category === cat.id;
                    const activeClass = isActive ? style.active : style.inactive;
                    const disabled = !amount;
                    return (
                      <motion.button
                        key={cat.id}
                        type="button"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: idx * 0.02 }}
                        whileHover={disabled ? undefined : { y: -2 }}
                        whileTap={disabled ? undefined : { scale: 0.96 }}
                        onClick={() => handleCategoryClick(cat.id)}
                        disabled={disabled}
                        className={cn(
                          "group relative flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border p-1.5 text-center transition-all",
                          activeClass,
                          disabled && "cursor-not-allowed opacity-40",
                        )}
                        aria-label={cat.label}
                      >
                        <Icon className="size-5" />
                        <span className="text-[9px] font-semibold leading-tight tracking-tight mt-1 text-white/90">
                          {cat.id === "tarjeta_credito" && cardId
                            ? `T. (${cards.find(c => c.id === cardId)?.name.slice(0, 4)})`
                            : cat.short}
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
                    className="flex size-7 items-center justify-center rounded-lg border border-white/[0.08] bg-[#1A1D24] text-slate-400 transition-colors hover:border-white/10 hover:text-white"
                  >
                    <ArrowLeft className="size-3.5" />
                  </button>
                  <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    ¿Con qué tarjeta?
                  </Label>
                </div>
                <div className="flex flex-col gap-1.5">
                  <motion.button
                    type="button"
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setCardId(null);
                      setPickingCard(false);
                    }}
                    className="flex items-center gap-3 rounded-xl border border-dashed border-white/[0.1] bg-[#1A1D24] px-4 py-3 text-left text-slate-400 hover:border-white/20 hover:text-white"
                  >
                    <CreditCardIcon className="size-4" />
                    <span className="text-sm font-semibold tracking-tight">Sin tarjeta de crédito</span>
                  </motion.button>

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
                        className={cn(
                          "flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#1A1D24] px-4 py-3 text-left transition-all hover:border-white/10",
                        )}
                      >
                        <div
                          className="size-3 shrink-0 rounded-full ring-2"
                          style={{ backgroundColor: cardColor.hex, boxShadow: `0 0 8px ${cardColor.hex}40` }}
                        />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-semibold tracking-tight text-white">
                            {card.name}
                          </span>
                          {card.last_four && (
                            <span className="font-mono text-[10px] tabular-nums text-slate-500">
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

        {/* Footer Rediseñado con Botones */}
        <div className="flex items-center justify-between border-t border-white/[0.06] bg-[#1A1D24] px-6 py-4 rounded-b-[24px]">
          {expenseToEdit ? (
            <Button
              variant="ghost"
              onClick={handleDelete}
              disabled={deleteExpense.isPending || updateExpense.isPending}
              className="h-10 rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 font-semibold"
            >
              <Trash2 className="size-4 mr-2" />
              Eliminar
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="h-10 rounded-xl border-white/[0.06] bg-transparent hover:bg-white/[0.04] text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => submit()}
              disabled={createExpense.isPending || updateExpense.isPending || !category || !amount}
              className="h-10 rounded-xl bg-gradient-to-r from-[#d946ef] to-[#06b6d4] hover:opacity-90 text-white font-semibold shadow-lg transition-all"
            >
              {createExpense.isPending || updateExpense.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
