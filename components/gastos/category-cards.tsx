"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { CATEGORIES } from "@/lib/categories";
import { formatARS } from "@/lib/format";
import type { Expense } from "@/hooks/use-expenses";
import type { ExpenseCategory } from "@/types/database";
import { cn } from "@/lib/utils";
import { PrivateAmount } from "@/components/ui/private-amount";

type Props = {
  expenses: Expense[];
  activeCategory: string | null;
  onSelect: (id: string | null) => void;
};

// Gradient sutil cuando el chip está activo, por categoría.
const ACTIVE_GRADIENT: Record<ExpenseCategory, string> = {
  alquiler: "from-blue-500/10 via-transparent to-transparent",
  servicios: "from-theme-500/10 via-transparent to-transparent",
  impuestos: "from-red-500/10 via-transparent to-transparent",
  comida: "from-theme-500/10 via-transparent to-transparent",
  tarjeta_credito: "from-violet-500/10 via-transparent to-transparent",
  educacion: "from-cyan-500/10 via-transparent to-transparent",
  imprevistos: "from-pink-500/10 via-transparent to-transparent",
};

export function CategoryCards({ expenses, activeCategory, onSelect }: Props) {
  const totals = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
    }
    return map;
  }, [expenses]);

  const grandTotal = Array.from(totals.values()).reduce((s, v) => s + v, 0);

  const sorted = [...CATEGORIES].sort(
    (a, b) => (totals.get(b.id) ?? 0) - (totals.get(a.id) ?? 0),
  );

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4 backdrop-blur sm:p-6">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -right-16 -bottom-16 size-40 rounded-full bg-theme-500/10 blur-3xl" />

      <div className="relative mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-theme-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Categorías
          </p>
        </div>
        {activeCategory && (
          <button
            onClick={() => onSelect(null)}
            className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            Limpiar
          </button>
        )}
      </div>

      <ul className="relative flex flex-col gap-1.5">
        {sorted.map((cat) => {
          const value = totals.get(cat.id) ?? 0;
          const pct = grandTotal > 0 ? (value / grandTotal) * 100 : 0;
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          const dimmed = activeCategory && !isActive;

          return (
            <motion.li
              key={cat.id}
              layout
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
            >
              <button
                onClick={() => onSelect(isActive ? null : cat.id)}
                className={cn(
                  "group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-y-white/[0.02] border-r-white/[0.02] border-l-[3px] p-3 text-left transition-all",
                  isActive ? "shadow-lg" : "hover:bg-white/[0.02]",
                  dimmed && "opacity-40",
                )}
                style={{ borderLeftColor: cat.color }}
              >
                {/* Subtle background tint */}
                <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none" style={{ backgroundColor: cat.color }} />
                {isActive && <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundColor: cat.color }} />}
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

                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-semibold tracking-tight">
                      {cat.label}
                    </span>
                    <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                      <PrivateAmount>{formatARS(value)}</PrivateAmount>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          backgroundColor: cat.color,
                          boxShadow: `0 0 12px ${cat.color}60`,
                        }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right font-mono text-[10px] font-semibold tabular-nums text-muted-foreground">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </button>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
