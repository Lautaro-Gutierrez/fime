"use client";

import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { AnimatePresence, motion } from "framer-motion";
import { PieChart as PieIcon } from "lucide-react";
import type { ValuedHolding } from "@/lib/portfolio/holdings";
import { ASSETS_BY_ID } from "@/lib/assets";

type Props = { holdings: ValuedHolding[] };

const PALETTE = [
  "#6366F1", // indigo-500
  "#475569", // slate-600
  "#0F766E", // teal-700
  "#334155", // slate-700
  "#4338CA", // indigo-700
  "#059669", // emerald-600
  "#64748B", // slate-500
  "#4F46E5", // indigo-600
  "#14B8A6", // teal-500
  "#1E293B", // slate-800
  "#818CF8", // indigo-400
  "#94A3B8", // slate-400
  "#2DD4BF", // teal-400
  "#34D399", // emerald-400
  "#3730A3", // indigo-800
  "#0F172A", // slate-900
  "#115E59", // teal-800
  "#065F46", // emerald-800
  "#A5B4FC", // indigo-300
  "#CBD5E1", // slate-300
];

export function AllocationDonut({ holdings }: Props) {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const data = useMemo(() => {
    return holdings
      .map((h) => ({
        id: h.key,
        label: h.label,
        asset_type: h.asset_type,
        value: h.current_value_usd,
        weight: h.weight_pct,
      }))
      .sort((a, b) => b.value - a.value)
      .map((item, i) => ({
        ...item,
        color: PALETTE[i % PALETTE.length],
      }));
  }, [holdings]);

  const total = data.reduce((s, d) => s + d.value, 0);
  const active = activeKey ? data.find((d) => d.id === activeKey) : null;

  if (total === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative flex h-[300px] flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-br from-fuchsia-500/5 via-transparent to-transparent p-6 backdrop-blur"
      >
        <div className="flex size-11 items-center justify-center rounded-2xl bg-fuchsia-500/15 ring-1 ring-fuchsia-500/30">
          <PieIcon className="size-5 text-fuchsia-300" />
        </div>
        <p className="text-sm text-muted-foreground">Sin tenencias todavía</p>
        <p className="max-w-xs text-center text-xs text-muted-foreground/70">
          Cargá posiciones iniciales o registrá transacciones en el blotter
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-6 backdrop-blur"
    >

      <div className="relative flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-fuchsia-400" />
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Distribución · {data.length} {data.length === 1 ? "posición" : "posiciones"}
        </p>
      </div>

      <div className="relative mt-3 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={100}
              dataKey="value"
              stroke="none"
              startAngle={90}
              endAngle={-270}
              isAnimationActive
              animationDuration={500}
              onMouseEnter={((entry: unknown) => {
                const id = (entry as { id?: string } | undefined)?.id;
                if (id) setActiveKey(id);
              }) as unknown as (data: object) => void}
              onMouseLeave={() => setActiveKey(null)}
            >
              {data.map((entry) => {
                const isActive = activeKey === entry.id;
                const isDimmed = activeKey !== null && !isActive;
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
                className="flex max-w-[140px] flex-col items-center gap-1 text-center"
              >
                <span
                  className="text-[9px] font-semibold uppercase leading-none tracking-widest"
                  style={{ color: active.color }}
                >
                  {active.label}
                </span>
                <span className="font-mono text-3xl font-bold leading-none tabular-nums">
                  {active.weight.toFixed(1)}%
                </span>
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground/70">
                  {ASSETS_BY_ID[active.asset_type].short}
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="total"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col items-center gap-0.5"
              >
                <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Posiciones
                </span>
                <span className="bg-gradient-to-br from-white to-white/70 bg-clip-text font-mono text-2xl font-bold tabular-nums text-transparent">
                  {data.length}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="relative mt-4 flex flex-wrap gap-x-3 gap-y-1.5">
        {data.map((d) => {
          const isActive = activeKey === d.id;
          return (
            <button
              key={d.id}
              onMouseEnter={() => setActiveKey(d.id)}
              onMouseLeave={() => setActiveKey(null)}
              className={`inline-flex items-center gap-1.5 text-[11px] transition-opacity ${
                activeKey !== null && !isActive ? "opacity-35" : "opacity-100"
              }`}
            >
              <span
                className="size-2 rounded-full"
                style={{
                  backgroundColor: d.color,
                  boxShadow: isActive ? `0 0 8px ${d.color}80` : undefined,
                }}
              />
              <span className="text-muted-foreground">{d.label}</span>
              <span className="font-mono font-semibold tabular-nums text-foreground/80">
                {d.weight.toFixed(1)}%
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
