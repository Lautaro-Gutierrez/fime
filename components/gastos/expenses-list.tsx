"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { Trash2, PencilLine, Sparkles, CreditCard as CreditCardIcon, CalendarDays, Wallet } from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale/es";
import {
  type Expense,
  useCreateExpense,
  useDeleteExpense,
} from "@/hooks/use-expenses";
import type { CreditCard } from "@/hooks/use-credit-cards";
import { CATEGORIES_BY_ID } from "@/lib/categories";
import { formatARS, fromISODate, monthLabel, toISODate } from "@/lib/format";
import { billingMonthForExpense, colorFromHex } from "@/lib/credit-cards";
import { cn } from "@/lib/utils";
import { EditExpenseDialog } from "@/components/gastos/edit-expense-dialog";
import { PrivateAmount } from "@/components/ui/private-amount";

export type ViewMode = "calendar" | "card_billing";

type Props = {
  expenses: Expense[];
  filterCategory: string | null;
  cards?: CreditCard[];
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
};

function dayLabel(date: Date) {
  if (isToday(date)) return "Hoy";
  if (isYesterday(date)) return "Ayer";
  return format(date, "d 'de' LLLL", { locale: es });
}

export function ExpensesList({ expenses, filterCategory, cards = [], viewMode = "calendar", onViewModeChange }: Props) {
  const [editing, setEditing] = useState<Expense | null>(null);

  const cardsMap = useMemo(
    () => new Map(cards.map((c) => [c.id, c])),
    [cards],
  );

  const filtered = useMemo(
    () =>
      filterCategory
        ? expenses.filter((e) => e.category === filterCategory)
        : expenses,
    [expenses, filterCategory],
  );

  const hasAnyCards = cards.length > 0;

  // Calendar view: group by date
  const calendarGroups = useMemo(() => {
    if (viewMode !== "calendar") return [];
    const map = new Map<string, Expense[]>();
    for (const e of filtered) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
  }, [filtered, viewMode]);

  // Card billing view: group by card name + billing month
  const billingGroups = useMemo(() => {
    if (viewMode !== "card_billing") return [];

    // Separate: with card vs without
    const withCard: { expense: Expense; card: CreditCard; billingKey: string; billingLabel: string }[] = [];
    const withoutCard: Expense[] = [];

    for (const e of filtered) {
      if (e.card_id && cardsMap.has(e.card_id)) {
        const card = cardsMap.get(e.card_id)!;
        const billingDate = billingMonthForExpense(e.date, card.closing_day, card.due_day);
        const key = `${card.id}::${billingDate.getFullYear()}-${billingDate.getMonth()}`;
        const label = monthLabel(billingDate);
        withCard.push({ expense: e, card, billingKey: key, billingLabel: label });
      } else {
        withoutCard.push(e);
      }
    }

    // Group card expenses by billing key
    const cardGroupMap = new Map<string, { card: CreditCard; billingLabel: string; items: Expense[] }>();
    for (const entry of withCard) {
      const existing = cardGroupMap.get(entry.billingKey);
      if (existing) {
        existing.items.push(entry.expense);
      } else {
        cardGroupMap.set(entry.billingKey, {
          card: entry.card,
          billingLabel: entry.billingLabel,
          items: [entry.expense],
        });
      }
    }

    // Sort items within each group by date desc
    for (const group of cardGroupMap.values()) {
      group.items.sort((a, b) => (a.date < b.date ? 1 : -1));
    }

    // Group non-card expenses by day
    const dayMap = new Map<string, Expense[]>();
    for (const e of withoutCard) {
      const list = dayMap.get(e.date) ?? [];
      list.push(e);
      dayMap.set(e.date, list);
    }
    const dayGroups = Array.from(dayMap.entries()).sort(([a], [b]) => (a < b ? 1 : -1));

    return {
      cardGroups: Array.from(cardGroupMap.values()),
      dayGroups,
    };
  }, [filtered, viewMode, cardsMap]);

  if (filtered.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-theme-500/10 via-teal-500/5 to-transparent p-12 text-center backdrop-blur"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.15),transparent_50%)]" />
        <div className="relative flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-theme-500/20 ring-1 ring-theme-500/30">
            <Sparkles className="size-5 text-theme-300" />
          </div>
          <p className="text-base font-semibold tracking-tight">
            {filterCategory ? "Sin gastos en esta categoría" : "Sin gastos todavía"}
          </p>
          <p className="max-w-xs text-sm text-muted-foreground">
            {filterCategory
              ? "No cargaste gastos de esta categoría en el mes."
              : "Cargá tu primer gasto del mes."}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4 backdrop-blur sm:p-6">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -left-16 -top-16 size-40 rounded-full bg-theme-500/5 blur-3xl" />

        <div className="relative mb-4 flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-theme-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Movimientos
          </p>
          <div className="flex-1" />
          {/* View mode toggle — solo visible si hay tarjetas */}
          {hasAnyCards && onViewModeChange && (
            <div className="flex gap-0.5 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-0.5 text-[9px] font-semibold backdrop-blur">
              <button
                type="button"
                onClick={() => onViewModeChange("calendar")}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-1 uppercase tracking-widest transition-all",
                  viewMode === "calendar"
                    ? "bg-gradient-to-br from-theme-500 to-teal-600 text-white shadow-md"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <CalendarDays className="size-3" />
                Calendario
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange("card_billing")}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-1 uppercase tracking-widest transition-all",
                  viewMode === "card_billing"
                    ? "bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-md"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Wallet className="size-3" />
                Tarjeta
              </button>
            </div>
          )}
        </div>

        <div className="relative flex flex-col gap-5">
          <AnimatePresence initial={false}>
            {viewMode === "calendar"
              ? calendarGroups.map(([date, items]) => (
                  <DayGroup
                    key={date}
                    date={date}
                    items={items}
                    cardsMap={cardsMap}
                    onEdit={setEditing}
                  />
                ))
              : billingGroups && (
                  <>
                    {(billingGroups as { cardGroups: { card: CreditCard; billingLabel: string; items: Expense[] }[]; dayGroups: [string, Expense[]][] }).cardGroups.map((group) => (
                      <CardBillingGroup
                        key={`${group.card.id}-${group.billingLabel}`}
                        card={group.card}
                        billingLabel={group.billingLabel}
                        items={group.items}
                        cardsMap={cardsMap}
                        onEdit={setEditing}
                      />
                    ))}
                    {(billingGroups as { cardGroups: { card: CreditCard; billingLabel: string; items: Expense[] }[]; dayGroups: [string, Expense[]][] }).dayGroups.map(([date, items]) => (
                      <DayGroup
                        key={date}
                        date={date}
                        items={items}
                        cardsMap={cardsMap}
                        onEdit={setEditing}
                      />
                    ))}
                  </>
                )}
          </AnimatePresence>
        </div>
      </div>

      {editing && (
        <EditExpenseDialog
          open={!!editing}
          expense={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

/* ── Card Billing Group ── */
function CardBillingGroup({
  card,
  billingLabel,
  items,
  cardsMap,
  onEdit,
}: {
  card: CreditCard;
  billingLabel: string;
  items: Expense[];
  cardsMap: Map<string, CreditCard>;
  onEdit: (e: Expense) => void;
}) {
  const cardColor = colorFromHex(card.color);
  const groupTotal = items.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-col gap-2"
    >
      <div className="flex items-center gap-2.5 px-1">
        <div
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: cardColor.hex, boxShadow: `0 0 8px ${cardColor.hex}50` }}
        />
        <div className="flex flex-col">
          <h3 className={cn("text-sm font-semibold tracking-tight", cardColor.textClass)}>
            {card.name}
          </h3>
          <span className="text-[10px] capitalize text-muted-foreground">
            Paga en {billingLabel}
          </span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
        <span className="font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">
          <PrivateAmount>{formatARS(groupTotal)}</PrivateAmount>
        </span>
      </div>

      <ul className="flex flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {items.map((e) => (
            <ExpenseRow key={e.id} expense={e} onEdit={onEdit} isFuture={false} cardsMap={cardsMap} />
          ))}
        </AnimatePresence>
      </ul>
    </motion.div>
  );
}

/* ── Day Group (calendario) ── */
function DayGroup({
  date,
  items,
  cardsMap,
  onEdit,
}: {
  date: string;
  items: Expense[];
  cardsMap: Map<string, CreditCard>;
  onEdit: (e: Expense) => void;
}) {
  const today = toISODate(new Date());
  const isFuture = date > today;
  const dateObj = fromISODate(date);
  const dayTotal = items.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-col gap-2"
    >
      <div className="flex items-center gap-3 px-1">
        <h3
          className={cn(
            "text-sm font-semibold capitalize tracking-tight",
            isFuture ? "text-theme-400/90" : "text-foreground",
          )}
        >
          {dayLabel(dateObj)}
        </h3>
        {isFuture && (
          <span className="rounded-full bg-theme-500/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-theme-300 ring-1 ring-theme-500/30">
            Programado
          </span>
        )}
        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
        <span className="font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">
          <PrivateAmount>{formatARS(dayTotal)}</PrivateAmount>
        </span>
      </div>

      <ul className="flex flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {items.map((e) => (
            <ExpenseRow key={e.id} expense={e} onEdit={onEdit} isFuture={isFuture} cardsMap={cardsMap} />
          ))}
        </AnimatePresence>
      </ul>
    </motion.div>
  );
}

/* ── Expense Row ── */
function ExpenseRow({
  expense,
  onEdit,
  isFuture,
  cardsMap,
}: {
  expense: Expense;
  onEdit: (e: Expense) => void;
  isFuture: boolean;
  cardsMap: Map<string, CreditCard>;
}) {
  const cat = CATEGORIES_BY_ID[expense.category];
  const Icon = cat.icon;
  const deleteMutation = useDeleteExpense();
  const recreateMutation = useCreateExpense();

  // Card badge info
  const linkedCard = expense.card_id ? cardsMap.get(expense.card_id) : null;
  const cardColor = linkedCard ? colorFromHex(linkedCard.color) : null;

  const x = useMotionValue(0);
  const bgOpacity = useTransform(x, [-120, 0], [1, 0]);
  const iconScale = useTransform(x, [-120, -40], [1, 0.6]);

  function performDelete() {
    const snapshot = { ...expense };
    deleteMutation.mutate(expense.id, {
      onSuccess: () => {
        toast("Gasto borrado", {
          description: `${cat.label} · ${formatARS(Number(expense.amount))}`,
          duration: 5000,
          action: {
            label: "Deshacer",
            onClick: () => {
              recreateMutation.mutate({
                amount: Number(snapshot.amount),
                category: snapshot.category,
                type: snapshot.type,
                date: snapshot.date,
                note: snapshot.note,
                card_id: snapshot.card_id,
              });
            },
          },
        });
      },
      onError: (err) => {
        toast.error(err.message);
      },
    });
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0, x: -200 }}
      transition={{ duration: 0.18 }}
      className="relative overflow-hidden rounded-2xl"
    >
      {/* Capa de fondo de delete (visible al swipe) */}
      <motion.div
        style={{ opacity: bgOpacity }}
        className="pointer-events-none absolute inset-0 flex items-center justify-end rounded-2xl bg-rose-500/20 pr-6 text-rose-300"
      >
        <motion.div style={{ scale: iconScale }}>
          <Trash2 className="size-5" />
        </motion.div>
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -120, right: 0 }}
        dragElastic={{ left: 0.2, right: 0 }}
        style={{ x }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -80) {
            performDelete();
          } else {
            x.set(0);
          }
        }}
        whileHover={{ y: -1 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={cn(
          "group relative flex cursor-grab items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-3 backdrop-blur transition-colors hover:border-white/10 active:cursor-grabbing",
          isFuture && "opacity-70",
        )}
      >
        {/* Icon con glow */}
        <div className="relative shrink-0">
          <div
            className={cn(
              "absolute inset-0 rounded-xl blur-md opacity-50",
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
            <Icon className="size-4" />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-semibold tracking-tight">
              {cat.label}
            </span>
            <span className="font-mono text-base font-bold tabular-nums">
              <PrivateAmount>{formatARS(Number(expense.amount))}</PrivateAmount>
            </span>
          </div>
          {expense.note && (
            <p className="truncate text-xs text-muted-foreground">
              {expense.note}
            </p>
          )}
          {/* Card badge */}
          {expense.card_id && (
            <div className="mt-1 flex items-center gap-1.5">
              {linkedCard && cardColor ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    cardColor.bgClass,
                    cardColor.textClass,
                    cardColor.ringClass,
                    "ring-1",
                  )}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: cardColor.hex }}
                  />
                  {linkedCard.name}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-semibold text-slate-400 ring-1 ring-slate-500/20">
                  <CreditCardIcon className="size-2.5" />
                  Tarjeta archivada
                </span>
              )}
            </div>
          )}
        </div>

        {/* Edit button (desktop hover) */}
        <button
          onClick={() => onEdit(expense)}
          className="hidden shrink-0 rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-white/10 hover:text-foreground group-hover:opacity-100 md:block"
          aria-label="Editar gasto"
        >
          <PencilLine className="size-3.5" />
        </button>
      </motion.div>
    </motion.li>
  );
}
