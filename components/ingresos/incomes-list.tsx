"use client";

import { useMemo, useState, useCallback, memo } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { Trash2, PencilLine, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale/es";
import {
  type Income,
  useCreateIncome,
  useDeleteIncome,
} from "@/hooks/use-incomes";
import { INCOME_CATEGORIES_BY_ID } from "@/lib/income-categories";
import { formatARS, formatUSD, fromISODate } from "@/lib/format";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
const EditIncomeDialog = dynamic(() => import("@/components/ingresos/edit-income-dialog").then((mod) => mod.EditIncomeDialog), { ssr: false });

import { PrivateAmount } from "@/components/ui/private-amount";

type Props = {
  incomes: Income[];
  filterCategory: string | null;
  onAdd?: () => void;
};

function dayLabel(date: Date) {
  if (isToday(date)) return "Hoy";
  if (isYesterday(date)) return "Ayer";
  return format(date, "d 'de' LLLL", { locale: es });
}

export function IncomesList({ incomes, filterCategory, onAdd }: Props) {
  const [editing, setEditing] = useState<Income | null>(null);
  const handleEdit = useCallback((i: Income) => setEditing(i), []);

  const filtered = useMemo(
    () =>
      filterCategory
        ? incomes.filter((i) => i.category === filterCategory)
        : incomes,
    [incomes, filterCategory],
  );

  const groups = useMemo(() => {
    const map = new Map<string, Income[]>();
    for (const i of filtered) {
      const list = map.get(i.date) ?? [];
      list.push(i);
      map.set(i.date, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
  }, [filtered]);

  if (filtered.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-br from-lime-500/10 via-green-500/5 to-transparent p-12 text-center backdrop-blur"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(132,204,22,0.15),transparent_50%)]" />
        <div className="relative flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-lime-500/20 ring-1 ring-lime-500/30">
            <Sparkles className="size-5 text-lime-300" />
          </div>
          <p className="text-base font-semibold tracking-tight">
            {filterCategory
              ? "Sin ingresos en esta categoría"
              : "Sin ingresos todavía"}
          </p>
          <p className="max-w-xs text-sm text-muted-foreground">
            {filterCategory
              ? "No cargaste ingresos de esta categoría en el mes."
              : "Cargá tu primer ingreso del mes."}
          </p>
          {onAdd && (
            <button
              onClick={onAdd}
              className="mt-2 rounded-full bg-lime-500 px-4 py-2 text-sm font-medium text-lime-950 shadow-md transition-all hover:bg-lime-400 active:scale-95"
            >
              Cargar ingreso
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4 backdrop-blur sm:p-6">

        <div className="relative mb-4 flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-lime-400" />
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
                onEdit={handleEdit}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {editing && (
        <EditIncomeDialog
          open={!!editing}
          income={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

const DayGroup = memo(function DayGroup({
  date,
  items,
  onEdit,
}: {
  date: string;
  items: Income[];
  onEdit: (i: Income) => void;
}) {
  const dateObj = fromISODate(date);
  const dayTotal = items.reduce((s, i) => s + Number(i.amount_ars), 0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-col gap-2"
    >
      <div className="flex items-center gap-3 px-1">
        <h3 className="text-sm font-semibold capitalize tracking-tight">
          {dayLabel(dateObj)}
        </h3>
        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
        <span className="font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">
          <PrivateAmount>{formatARS(dayTotal)}</PrivateAmount>
        </span>
      </div>

      <ul className="flex flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {items.map((i) => (
            <IncomeRow
              key={i.id}
              income={i}
              onEdit={onEdit}
            />
          ))}
        </AnimatePresence>
      </ul>
    </motion.div>
  );
});

const IncomeRow = memo(function IncomeRow({
  income,
  onEdit,
}: {
  income: Income;
  onEdit: (i: Income) => void;
}) {
  const cat = INCOME_CATEGORIES_BY_ID[income.category];
  const Icon = cat.icon;
  const deleteMutation = useDeleteIncome();
  const recreateMutation = useCreateIncome();

  const x = useMotionValue(0);
  const bgOpacity = useTransform(x, [-120, 0], [1, 0]);
  const iconScale = useTransform(x, [-120, -40], [1, 0.6]);

  const isUsdOriginal = income.currency === "USD";

  function performDelete() {
    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
    const snapshot = { ...income };
    deleteMutation.mutate(income.id, {
      onSuccess: () => {
        toast("Ingreso borrado", {
          description: `${cat.label} · ${formatARS(Number(income.amount_ars))}`,
          duration: 5000,
          action: {
            label: "Deshacer",
            onClick: () => {
              recreateMutation.mutate({
                amount: Number(snapshot.amount),
                currency: snapshot.currency,
                fx_rate: snapshot.fx_rate,
                category: snapshot.category,
                source: snapshot.source,
                date: snapshot.date,
                note: snapshot.note,
                distribution: snapshot.distribution,
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
      {/* Delete background */}
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
        className="group relative flex cursor-grab flex-col rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-3 backdrop-blur transition-colors hover:border-white/10 active:cursor-grabbing"
      >
        <div className="flex items-center gap-3">
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
              <div className="flex flex-col items-end">
                <span className="font-mono text-base font-bold tabular-nums">
                  <PrivateAmount>{formatARS(Number(income.amount_ars))}</PrivateAmount>
                </span>
                {isUsdOriginal && (
                  <span className="font-mono text-[10px] tabular-nums text-lime-300/80">
                    <PrivateAmount>{formatUSD(Number(income.amount))} original</PrivateAmount>
                  </span>
                )}
              </div>
            </div>
            {(income.source || income.note) && (
              <p className="truncate text-xs text-muted-foreground">
                {income.source}
                {income.source && income.note ? " · " : ""}
                {income.note}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">

            <button
              onClick={() => onEdit(income)}
              className="hidden rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-white/10 hover:text-foreground group-hover:opacity-100 md:block"
              aria-label="Editar ingreso"
            >
              <PencilLine className="size-3.5" />
            </button>
          </div>
        </div>


      </motion.div>
    </motion.li>
  );
});
