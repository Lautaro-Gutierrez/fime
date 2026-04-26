"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { Trash2, PencilLine, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale/es";
import {
  type Expense,
  useCreateExpense,
  useDeleteExpense,
} from "@/hooks/use-expenses";
import { CATEGORIES_BY_ID } from "@/lib/categories";
import { formatARS, fromISODate, toISODate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EditExpenseDialog } from "@/components/gastos/edit-expense-dialog";

type Props = {
  expenses: Expense[];
  filterCategory: string | null;
};

function dayLabel(date: Date) {
  if (isToday(date)) return "Hoy";
  if (isYesterday(date)) return "Ayer";
  return format(date, "d 'de' LLLL", { locale: es });
}

export function ExpensesList({ expenses, filterCategory }: Props) {
  const [editing, setEditing] = useState<Expense | null>(null);

  const filtered = useMemo(
    () =>
      filterCategory
        ? expenses.filter((e) => e.category === filterCategory)
        : expenses,
    [expenses, filterCategory],
  );

  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of filtered) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
  }, [filtered]);

  if (filtered.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-12 text-center backdrop-blur"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.15),transparent_50%)]" />
        <div className="relative flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/20 ring-1 ring-emerald-500/30">
            <Sparkles className="size-5 text-emerald-300" />
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
      <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-card/60 p-4 backdrop-blur sm:p-6">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -left-16 -top-16 size-40 rounded-full bg-emerald-500/5 blur-3xl" />

        <div className="relative mb-4 flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Movimientos
          </p>
        </div>

        <div className="relative flex flex-col gap-5">
          <AnimatePresence initial={false}>
            {groups.map(([date, items]) => (
              <DayGroup
                key={date}
                date={date}
                items={items}
                onEdit={setEditing}
              />
            ))}
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

function DayGroup({
  date,
  items,
  onEdit,
}: {
  date: string;
  items: Expense[];
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
            isFuture ? "text-amber-400/90" : "text-foreground",
          )}
        >
          {dayLabel(dateObj)}
        </h3>
        {isFuture && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-amber-300 ring-1 ring-amber-500/30">
            Programado
          </span>
        )}
        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
        <span className="font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">
          {formatARS(dayTotal)}
        </span>
      </div>

      <ul className="flex flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {items.map((e) => (
            <ExpenseRow key={e.id} expense={e} onEdit={onEdit} isFuture={isFuture} />
          ))}
        </AnimatePresence>
      </ul>
    </motion.div>
  );
}

function ExpenseRow({
  expense,
  onEdit,
  isFuture,
}: {
  expense: Expense;
  onEdit: (e: Expense) => void;
  isFuture: boolean;
}) {
  const cat = CATEGORIES_BY_ID[expense.category];
  const Icon = cat.icon;
  const deleteMutation = useDeleteExpense();
  const recreateMutation = useCreateExpense();

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
          "group relative flex cursor-grab items-center gap-3 rounded-2xl border border-white/5 bg-card/60 p-3 backdrop-blur transition-colors hover:border-white/10 active:cursor-grabbing",
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
              {formatARS(Number(expense.amount))}
            </span>
          </div>
          {expense.note && (
            <p className="truncate text-xs text-muted-foreground">
              {expense.note}
            </p>
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
