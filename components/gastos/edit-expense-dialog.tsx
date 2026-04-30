"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Pencil, CreditCard as CreditCardIcon } from "lucide-react";
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
import { CATEGORIES, CATEGORIES_BY_ID } from "@/lib/categories";
import { isFutureMonth, lastOfMonth, toISODate } from "@/lib/format";
import { type Expense, useUpdateExpense } from "@/hooks/use-expenses";
import { useCreditCards } from "@/hooks/use-credit-cards";
import { colorFromHex } from "@/lib/credit-cards";
import type { ExpenseCategory, ExpenseType } from "@/types/database";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  expense: Expense;
  onClose: () => void;
};

// Gradient de fondo del header según la categoría actual.
const CATEGORY_HEADER_GRADIENT: Record<ExpenseCategory, string> = {
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

export function EditExpenseDialog({ open, expense, onClose }: Props) {
  const [amount, setAmount] = useState(String(expense.amount));
  const [category, setCategory] = useState<ExpenseCategory>(expense.category);
  const [type, setType] = useState<ExpenseType>(expense.type);
  const [date, setDate] = useState(expense.date);
  const [note, setNote] = useState(expense.note ?? "");
  const [cardId, setCardId] = useState<string | null>(expense.card_id);

  const update = useUpdateExpense();
  const { data: cards = [] } = useCreditCards();

  useEffect(() => {
    setAmount(String(expense.amount));
    setCategory(expense.category);
    setType(expense.type);
    setDate(expense.date);
    setNote(expense.note ?? "");
    setCardId(expense.card_id);
  }, [expense]);

  // Auto-clear card_id when switching away from tarjeta_credito
  function handleCategoryChange(newCat: ExpenseCategory) {
    setCategory(newCat);
    if (newCat !== "tarjeta_credito") {
      setCardId(null);
    }
  }

  const maxDate = toISODate(lastOfMonth(new Date()));
  const cat = CATEGORIES_BY_ID[category];
  const Icon = cat.icon;

  async function save() {
    const value = parseAmount(amount);
    if (value === null) {
      toast.error("Monto inválido.");
      return;
    }
    if (isFutureMonth(new Date(date))) {
      toast.error("Solo se pueden cargar gastos hasta fin del mes en curso.");
      return;
    }
    try {
      await update.mutateAsync({
        id: expense.id,
        patch: {
          amount: value,
          category,
          type,
          date,
          note: note.trim() || null,
          card_id: category === "tarjeta_credito" ? cardId : null,
        },
      });
      toast.success("Gasto actualizado");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md border-white/5 bg-card/95 p-0 backdrop-blur-xl">
        <div className="flex flex-col">
          {/* Header con glow de categoría */}
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
                Editar gasto
              </DialogTitle>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {cat.label}
              </span>
            </div>
          </div>

          <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto p-5">
            {/* Monto */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-amount" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Monto · ARS
              </Label>
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
                  className="h-14 rounded-xl border-white/5 bg-card/60 pl-9 font-mono text-2xl font-bold tabular-nums backdrop-blur focus-visible:border-white/20"
                />
              </div>
            </div>

            {/* Categoría */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Categoría
              </Label>
              <Select
                value={category}
                onValueChange={(v) => handleCategoryChange(v as ExpenseCategory)}
              >
                <SelectTrigger className="h-11 rounded-xl border-white/5 bg-card/60 backdrop-blur focus-visible:border-white/20">
                  <span className="flex items-center gap-2 text-sm">
                    <Icon className={cn("size-3.5", cat.textClass)} />
                    {cat.label}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => {
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

            {/* Toggle Fijo / Variable */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Tipo
                </Label>
                <span className="text-[10px] text-muted-foreground">
                  {type === "fixed"
                    ? "Recurrente mensual"
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
                      ? "bg-gradient-to-br from-theme-500 to-teal-600 text-white shadow-md"
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
                      ? "bg-gradient-to-br from-theme-500 to-teal-600 text-white shadow-md"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Fijo
                </button>
              </div>
            </div>

            {/* Card selector — visible solo con categoría tarjeta_credito */}
            <AnimatePresence>
              {category === "tarjeta_credito" && cards.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-1.5 overflow-hidden"
                >
                  <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Tarjeta
                  </Label>
                  {(() => {
                    const selectedCard = cardId ? cards.find((c) => c.id === cardId) : null;
                    const selectedColor = selectedCard ? colorFromHex(selectedCard.color) : null;
                    return (
                      <Select
                        value={cardId ?? "__none__"}
                        onValueChange={(v) => setCardId(v === "__none__" ? null : v)}
                      >
                        <SelectTrigger className="h-11 rounded-xl border-white/5 bg-card/60 backdrop-blur focus-visible:border-white/20">
                          <span className="flex items-center gap-2 text-sm">
                            {selectedCard && selectedColor ? (
                              <>
                                <span
                                  className="size-2.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: selectedColor.hex }}
                                />
                                {selectedCard.name}
                              </>
                            ) : (
                              <span className="text-muted-foreground">Sin tarjeta</span>
                            )}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <CreditCardIcon className="size-3.5" />
                              Sin tarjeta
                            </div>
                          </SelectItem>
                          {cards.map((card) => {
                            const cardColor = colorFromHex(card.color);
                            return (
                              <SelectItem key={card.id} value={card.id}>
                                <div className="flex items-center gap-2">
                                  <span
                                    className="size-2.5 rounded-full"
                                    style={{ backgroundColor: cardColor.hex }}
                                  />
                                  {card.name}
                                  {card.last_four && (
                                    <span className="font-mono text-[10px] text-muted-foreground">
                                      {card.last_four}
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-date" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Fecha
                </Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={date}
                  max={maxDate}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 rounded-xl border-white/5 bg-card/60 backdrop-blur focus-visible:border-white/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-note" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Nota
                </Label>
                <Input
                  id="edit-note"
                  type="text"
                  placeholder="Opcional"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={120}
                  className="h-11 rounded-xl border-white/5 bg-card/60 backdrop-blur focus-visible:border-white/20"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-white/5 bg-card/80 px-5 py-3 backdrop-blur">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-10 rounded-xl border-white/5 bg-card/40 hover:bg-card/60"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={save}
              disabled={update.isPending}
              className="h-10 rounded-xl bg-gradient-to-br from-theme-500 to-teal-600 text-white shadow-lg shadow-theme-500/25 transition-all hover:from-theme-400 hover:to-teal-500 hover:shadow-theme-500/40 disabled:opacity-50"
            >
              {update.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
