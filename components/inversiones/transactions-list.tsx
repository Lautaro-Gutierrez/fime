"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  type Investment,
  useCreateInvestment,
  useDeleteInvestment,
} from "@/hooks/use-investments";
import { ASSETS_BY_ID, TX_TYPE_LABELS } from "@/lib/assets";
import { formatQuantity, formatUSD } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EditTransactionDialog } from "@/components/inversiones/edit-transaction-dialog";

type Props = {
  investments: Investment[];
};

function monthGroupLabel(yearMonth: string) {
  const [y, m] = yearMonth.split("-").map(Number);
  const date = new Date(y, m - 1, 1);
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function TransactionsList({ investments }: Props) {
  const [editing, setEditing] = useState<Investment | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, Investment[]>();
    for (const inv of investments) {
      const key = inv.date.slice(0, 7);
      const list = map.get(key) ?? [];
      list.push(inv);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
  }, [investments]);

  if (investments.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-transparent p-12 text-center"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="relative flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-500/20 ring-1 ring-indigo-500/30">
            <Sparkles className="size-5 text-indigo-300" />
          </div>
          <p className="text-base font-medium">Sin operaciones todavía</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Cargá tu primera operación y empezá a trackear tu blotter.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <AnimatePresence initial={false}>
          {groups.map(([month, items]) => (
            <MonthGroup
              key={month}
              month={month}
              items={items}
              onEdit={setEditing}
            />
          ))}
        </AnimatePresence>
      </div>

      {editing && (
        <EditTransactionDialog
          open={!!editing}
          investment={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function MonthGroup({
  month,
  items,
  onEdit,
}: {
  month: string;
  items: Investment[];
  onEdit: (inv: Investment) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-col gap-3"
    >
      <div className="flex items-center gap-3 px-1">
        <h3 className="text-lg font-semibold capitalize tracking-tight">
          {monthGroupLabel(month)}
        </h3>
        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
        <span className="rounded-full border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {items.length} {items.length === 1 ? "op" : "ops"}
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {items.map((inv) => (
            <TransactionRow key={inv.id} inv={inv} onEdit={onEdit} />
          ))}
        </AnimatePresence>
      </ul>
    </motion.div>
  );
}

function TransactionRow({
  inv,
  onEdit,
}: {
  inv: Investment;
  onEdit: (inv: Investment) => void;
}) {
  const asset = ASSETS_BY_ID[inv.asset_type];
  const Icon = asset.icon;
  const deleteMutation = useDeleteInvestment();
  const recreateMutation = useCreateInvestment();

  const x = useMotionValue(0);
  const bgOpacity = useTransform(x, [-120, 0], [1, 0]);
  const iconScale = useTransform(x, [-120, -40], [1, 0.6]);

  const isOutflow = inv.tx_type === "sell" || inv.tx_type === "withdraw";
  const totalUsd =
    inv.price_usd !== null ? inv.quantity * inv.price_usd : inv.quantity;

  const displayTicker = inv.ticker ?? asset.short;
  const day = inv.date.slice(8, 10);

  function performDelete() {
    const snapshot = { ...inv };
    deleteMutation.mutate(inv.id, {
      onSuccess: () => {
        toast("Operación borrada", {
          description: `${displayTicker} · ${formatUSD(totalUsd)}`,
          duration: 5000,
          action: {
            label: "Deshacer",
            onClick: () => {
              recreateMutation.mutate({
                asset_type: snapshot.asset_type,
                ticker: snapshot.ticker,
                tx_type: snapshot.tx_type,
                quantity: snapshot.quantity,
                price_usd: snapshot.price_usd,
                fx_rate: snapshot.fx_rate,
                fees_usd: snapshot.fees_usd,
                broker: snapshot.broker,
                date: snapshot.date,
                note: snapshot.note,
                metadata: snapshot.metadata,
              });
            },
          },
        });
      },
      onError: (err) => toast.error(err.message),
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
          if (info.offset.x < -80) performDelete();
          else x.set(0);
        }}
        onClick={() => onEdit(inv)}
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={cn(
          "group relative flex cursor-pointer items-center gap-4 overflow-hidden rounded-2xl border border-white/5 bg-card/60 p-4 backdrop-blur transition-colors hover:border-white/10",
          "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity hover:before:opacity-100",
        )}
      >
        {/* Gradient glow on hover — color del asset */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 bg-gradient-to-r opacity-0 transition-opacity group-hover:opacity-100",
            asset.id === "crypto" && "from-orange-500/10 via-transparent to-transparent",
            asset.id === "stock_us" && "from-indigo-500/10 via-transparent to-transparent",
            asset.id === "cedear" && "from-cyan-500/10 via-transparent to-transparent",
            asset.id === "stock_ar" && "from-sky-500/10 via-transparent to-transparent",
            asset.id === "bond_ar" && "from-teal-500/10 via-transparent to-transparent",
            asset.id === "time_deposit" && "from-amber-500/10 via-transparent to-transparent",
            asset.id === "usd_cash" && "from-green-500/10 via-transparent to-transparent",
          )}
        />

        {/* Icon con glow */}
        <div className="relative shrink-0">
          <div
            className={cn(
              "absolute inset-0 rounded-2xl blur-xl opacity-40",
              asset.bgClass,
            )}
          />
          <div
            className={cn(
              "relative flex size-12 items-center justify-center rounded-2xl ring-1",
              asset.bgClass,
              asset.textClass,
              asset.borderClass,
            )}
          >
            <Icon className="size-5" />
          </div>
        </div>

        {/* Day chip */}
        <div className="relative flex shrink-0 flex-col items-center justify-center">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Día
          </span>
          <span className="font-mono text-lg font-bold tabular-nums">
            {day}
          </span>
        </div>

        {/* Content */}
        <div className="relative flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-base font-bold tracking-tight">
              {displayTicker}
            </span>
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ring-1",
                isOutflow
                  ? "bg-red-500/15 text-red-300 ring-red-500/30"
                  : "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
              )}
            >
              {TX_TYPE_LABELS[inv.tx_type]}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono tabular-nums">
              {formatQuantity(inv.quantity)}
              {inv.price_usd !== null && (
                <>
                  <span className="mx-1 text-muted-foreground/50">·</span>
                  @ {formatUSD(inv.price_usd, true)}
                </>
              )}
            </span>
            {inv.broker && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span className="truncate text-[10px] font-medium uppercase tracking-wider">
                  {inv.broker}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Total USD hero */}
        <div className="relative flex shrink-0 flex-col items-end gap-0.5">
          <span
            className={cn(
              "font-mono text-xl font-bold tabular-nums leading-none",
              isOutflow ? "text-red-300" : "text-foreground",
            )}
          >
            {isOutflow ? "−" : "+"}
            {formatUSD(totalUsd)}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            USD total
          </span>
        </div>
      </motion.div>
    </motion.li>
  );
}
