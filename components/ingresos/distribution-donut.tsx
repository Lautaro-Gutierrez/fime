"use client";

import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { AnimatePresence, motion } from "framer-motion";
import { PieChart as PieIcon } from "lucide-react";
import { INCOME_CATEGORIES } from "@/lib/income-categories";
import { formatARS } from "@/lib/format";
import type { Income } from "@/hooks/use-incomes";
import { PrivateAmount } from "@/components/ui/private-amount";

type Props = { incomes: Income[] };

export function DistributionDonut({ incomes }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const data = useMemo(() => {
    const totals = new Map<string, number>();
    for (const i of incomes) {
      totals.set(
        i.category,
        (totals.get(i.category) ?? 0) + Number(i.amount_ars),
      );
    }
    return INCOME_CATEGORIES.map((c) => ({
      name: c.label,
      short: c.short,
      id: c.id,
      value: totals.get(c.id) ?? 0,
      color: c.color,
    })).filter((d) => d.value > 0);
  }, [incomes]);

  const total = data.reduce((s, d) => s + d.value, 0);
  const active = activeId ? data.find((d) => d.id === activeId) : null;
  const activePct = active ? (active.value / total) * 100 : 0;

  if (total === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative flex h-[360px] flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-lime-500/5 via-transparent to-transparent p-6 backdrop-blur"
      >
        <div className="flex size-11 items-center justify-center rounded-2xl bg-lime-500/15 ring-1 ring-lime-500/30">
          <PieIcon className="size-5 text-lime-300" />
        </div>
        <p className="text-sm text-muted-foreground">
          Sin ingresos este mes todavía
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-3xl border border-white/5 bg-card/60 p-6 backdrop-blur"
    >
      <div className="pointer-events-none absolute -right-20 -top-20 size-40 rounded-full bg-lime-500/10 blur-3xl" />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-lime-400 shadow-[0_0_8px_rgba(132,204,22,0.8)]" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Distribución
          </p>
        </div>
      </div>

      <div className="relative mt-3 h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={92}
              outerRadius={140}
              dataKey="value"
              stroke="none"
              startAngle={90}
              endAngle={-270}
              isAnimationActive
              animationDuration={500}
              onMouseEnter={(entry) => {
                const e = entry as { id?: string } | undefined;
                if (e?.id) setActiveId(e.id);
              }}
              onMouseLeave={() => setActiveId(null)}
            >
              {data.map((entry) => {
                const isActive = activeId === entry.id;
                const isDimmed = activeId !== null && !isActive;
                return (
                  <Cell
                    key={entry.id}
                    fill={entry.color}
                    fillOpacity={isDimmed ? 0.2 : 1}
                    stroke={isActive ? entry.color : "none"}
                    strokeWidth={isActive ? 2.5 : 0}
                  />
                );
              })}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {active ? (
              <motion.div
                key={active.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.18 }}
                className="flex max-w-[160px] flex-col items-center gap-1.5 text-center"
              >
                <span
                  className="text-[10px] font-semibold uppercase leading-none tracking-widest"
                  style={{ color: active.color }}
                >
                  {active.short}
                </span>
                <span className="font-mono text-4xl font-bold leading-none tabular-nums">
                  <PrivateAmount>{activePct.toFixed(1)}%</PrivateAmount>
                </span>
                <span className="font-mono text-xs leading-none tabular-nums text-muted-foreground">
                  <PrivateAmount>{formatARS(active.value)}</PrivateAmount>
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="total"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col items-center gap-1"
              >
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Total
                </span>
                <span className="bg-gradient-to-br from-white to-white/70 bg-clip-text font-mono text-2xl font-bold tabular-nums text-transparent">
                  <PrivateAmount>{formatARS(total)}</PrivateAmount>
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Leyenda con hover */}
      <div className="relative mt-4 flex flex-wrap gap-x-3 gap-y-1.5">
        {data.map((d) => {
          const pct = (d.value / total) * 100;
          const isActive = activeId === d.id;
          return (
            <button
              key={d.id}
              onMouseEnter={() => setActiveId(d.id)}
              onMouseLeave={() => setActiveId(null)}
              className={`inline-flex items-center gap-1.5 text-[11px] transition-opacity ${
                activeId !== null && !isActive ? "opacity-35" : "opacity-100"
              }`}
            >
              <span
                className="size-2 rounded-full"
                style={{
                  backgroundColor: d.color,
                  boxShadow: isActive ? `0 0 8px ${d.color}80` : undefined,
                }}
              />
              <span className="text-muted-foreground">{d.name}</span>
              <span className="font-mono font-semibold tabular-nums text-foreground/80">
                <PrivateAmount>{pct.toFixed(0)}%</PrivateAmount>
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
