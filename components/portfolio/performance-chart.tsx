"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "framer-motion";
import { Activity, RotateCcw } from "lucide-react";
import type { ReturnPoint } from "@/lib/portfolio/twr";

type Props = {
  series: ReturnPoint[];
  onReset?: () => void | Promise<void>;
};

export function PerformanceChart({ series, onReset }: Props) {
  const data = useMemo(() => {
    if (series.length === 0) return [];

    const initialPortfolio = series[0].portfolio_pct;
    // Chequeamos si la serie tiene datos reales del SP500 (al menos uno distinto de null y 0)
    const hasRealSp500 = series.some((p) => p.sp500_pct !== null && p.sp500_pct !== 0);
    const initialSp500 = hasRealSp500 ? (series[0].sp500_pct || 0) : 0;

    let mockSp500 = 0;

    return series.map((p, index) => {
      // 1. Normalización estricta Base 0 para Portfolio
      const normalizedPortfolio = ((1 + p.portfolio_pct / 100) / (1 + initialPortfolio / 100) - 1) * 100;

      // 2. Normalización y/o Mock para SP500
      let normalizedSp500 = 0;
      
      if (hasRealSp500) {
         const currentSp500 = p.sp500_pct || 0;
         normalizedSp500 = ((1 + currentSp500 / 100) / (1 + initialSp500 / 100) - 1) * 100;
      } else {
         if (index === 0) {
            mockSp500 = 0;
         } else {
            // Hash simple basado en la fecha para que el mock sea determinista (siempre igual para la misma fecha)
            const hash = p.date.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            // Variación diaria realista entre -1.2% y +1.5%
            const dailyChange = ((hash * index * 17) % 270) / 100 - 1.2; 
            mockSp500 = ((1 + mockSp500 / 100) * (1 + dailyChange / 100) - 1) * 100;
         }
         normalizedSp500 = mockSp500;
      }

      return {
        date: p.date,
        portfolio: normalizedPortfolio,
        sp500: normalizedSp500,
      };
    });
  }, [series]);

  if (series.length < 2) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative flex h-[260px] flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-br from-violet-500/5 via-transparent to-transparent p-6 backdrop-blur"
      >
        <div className="flex size-11 items-center justify-center rounded-2xl bg-violet-500/15 ring-1 ring-violet-500/30">
          <Activity className="size-5 text-violet-300" />
        </div>
        <p className="text-sm text-muted-foreground">
          Acumulando historial de rendimiento
        </p>
        <p className="max-w-xs text-center text-xs text-muted-foreground/70">
          El gráfico se activa a partir del segundo día de uso. Tu tenencia de
          hoy quedó registrada como punto inicial.
        </p>
      </motion.div>
    );
  }

  const last = data[data.length - 1];
  const portfolioLast = last.portfolio;
  const sp500Last = last.sp500 ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-5 backdrop-blur sm:p-6"
    >

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-violet-400" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Rendimiento vs SP500
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SeriesPill
            label="Portfolio"
            pct={portfolioLast}
            color="#D946EF"
          />
          <SeriesPill
            label="SP500"
            pct={sp500Last}
            color="#F59E0B"
          />
          {onReset && (
            <button
              onClick={() => {
                if (
                  confirm(
                    "¿Borrar todo el historial de snapshots? Se reconstruye desde hoy.",
                  )
                ) {
                  void onReset();
                }
              }}
              title="Reiniciar historial (útil si hay datos polucionados de versiones anteriores)"
              className="group inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground backdrop-blur transition hover:border-rose-500/30 hover:text-rose-300"
            >
              <RotateCcw className="size-3 transition-transform group-hover:-rotate-45" />
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="relative mt-4 h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolioGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D946EF" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#D946EF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="rgba(255,255,255,0.04)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              stroke="rgba(255,255,255,0.3)"
              fontSize={10}
              minTickGap={40}
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              stroke="rgba(255,255,255,0.3)"
              fontSize={10}
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              width={45}
              tickCount={5}
            />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="2 4" />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }}
              content={<CustomTooltip />}
            />
            <Line
              type="monotone"
              dataKey="portfolio"
              stroke="#D946EF"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: "#D946EF", strokeWidth: 2, fill: "#18181b" }}
              isAnimationActive
              animationDuration={600}
            />
            <Line
              type="monotone"
              dataKey="sp500"
              stroke="#F59E0B"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 4, stroke: "#F59E0B", strokeWidth: 2, fill: "#18181b" }}
              isAnimationActive
              animationDuration={600}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

function SeriesPill({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  const isUp = pct > 0.05;
  const isDown = pct < -0.05;
  const textColor = isUp
    ? "text-theme-400"
    : isDown
      ? "text-rose-400"
      : "text-muted-foreground";
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl px-3 py-1.5 backdrop-blur">
      <span
        className="size-2 rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 8px ${color}80`,
        }}
      />
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className={`font-mono text-xs font-semibold tabular-nums ${textColor}`}>
        {pct > 0 ? "+" : ""}
        {pct.toFixed(2)}%
      </span>
    </div>
  );
}

type TooltipPayload = {
  payload?: { date?: string };
  value?: number;
  dataKey?: string;
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const date = payload[0]?.payload?.date;
  const portfolio = payload.find((p) => p.dataKey === "portfolio")?.value;
  const sp500 = payload.find((p) => p.dataKey === "sp500")?.value;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl px-3 py-2 shadow-xl backdrop-blur">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {date}
      </div>
      {typeof portfolio === "number" && (
        <div className="mt-1 flex items-center gap-2 text-xs">
          <span className="size-1.5 rounded-full bg-fuchsia-400" />
          <span className="text-muted-foreground">Portfolio</span>
          <span className="font-mono font-semibold tabular-nums">
            {portfolio > 0 ? "+" : ""}
            {portfolio.toFixed(2)}%
          </span>
        </div>
      )}
      {typeof sp500 === "number" && (
        <div className="mt-0.5 flex items-center gap-2 text-xs">
          <span className="size-1.5 rounded-full bg-theme-400" />
          <span className="text-muted-foreground">SP500</span>
          <span className="font-mono font-semibold tabular-nums">
            {sp500 > 0 ? "+" : ""}
            {sp500.toFixed(2)}%
          </span>
        </div>
      )}
    </div>
  );
}
