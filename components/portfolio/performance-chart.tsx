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
import { Activity, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { fromISODate } from "@/lib/format";
import type { ReturnPoint } from "@/lib/portfolio/twr";
import { cn } from "@/lib/utils";

type Props = {
  series: ReturnPoint[];
  onReset?: () => void | Promise<void>;
  onlyPortfolio?: boolean;
};

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    value?: number;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (active && payload && payload.length) {
    const portfolio = payload.find((p) => p.dataKey === "portfolio")?.value;
    const sp500 = payload.find((p) => p.dataKey === "sp500")?.value;

    return (
      <div className="glass-card rounded-lg px-3 py-2 text-xs bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl">
        <p className="text-white/60 mb-1.5 capitalize">{label}</p>
        <div className="space-y-1">
          {typeof portfolio === "number" && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-400" />
              <span className="text-white/70">Portfolio</span>
              <span className="text-white font-semibold tabular-nums ml-auto">
                {portfolio > 0 ? "+" : ""}
                {portfolio.toFixed(2)}%
              </span>
            </div>
          )}
          {typeof sp500 === "number" && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-white/70">S&P 500</span>
              <span className="text-white font-semibold tabular-nums ml-auto">
                {sp500 > 0 ? "+" : ""}
                {sp500.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export function PerformanceChart({ series, onReset, onlyPortfolio = false }: Props) {
  const data = useMemo(() => {
    if (series.length < 2) return [];
    const sortedSeries = [...series].sort((a, b) => a.date.localeCompare(b.date));
    return sortedSeries.map((pt) => ({
      date: pt.date,
      portfolio: Number(pt.portfolio_pct.toFixed(2)),
      sp500: pt.sp500_pct !== null ? Number(pt.sp500_pct.toFixed(2)) : null,
      labelX: format(fromISODate(pt.date), "dd MMM", { locale: es }),
    }));
  }, [series]);

  if (data.length < 2) {
    return (
      <div className="rounded-2xl p-6 h-full bg-[#1F2229] border border-white/[0.06] flex flex-col justify-between min-h-[280px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">
            {onlyPortfolio ? "Historial de Rendimiento" : "Performance vs S&P 500"}
          </h3>
          {onReset && series.length >= 1 && (
            <button
              onClick={() => {
                if (confirm("¿Borrar todo el historial de snapshots? Se reconstruye desde hoy.")) {
                  void onReset();
                }
              }}
              title="Reiniciar historial"
              className="group inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition hover:border-rose-500/30 hover:text-rose-300"
            >
              <RotateCcw className="size-3 transition-transform group-hover:-rotate-45" />
              Reset
            </button>
          )}
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/[0.04] text-slate-400">
            <Activity className="size-5" />
          </div>
          <p className="text-sm font-medium text-slate-300">
            Historial en construcción
          </p>
          <p className="max-w-xs text-xs text-slate-500">
            Se necesitan al menos 2 días de snapshots para graficar la curva de rendimiento real.
          </p>
        </div>
      </div>
    );
  }

  const last = data[data.length - 1];
  const portfolioLast = last.portfolio;
  const sp500Last = last.sp500;

  return (
    <div className="rounded-2xl p-6 h-full bg-[#1F2229] border border-white/[0.06]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold text-white">
          {onlyPortfolio ? "Historial de Rendimiento" : "Performance vs S&P 500"}
        </h3>
        
        {onReset && series.length >= 2 && (
          <button
            onClick={() => {
              if (
                confirm(
                  "¿Borrar todo el historial de snapshots? Se reconstruye desde hoy."
                )
              ) {
                void onReset();
              }
            }}
            title="Reiniciar historial"
            className="group inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground backdrop-blur transition hover:border-rose-500/30 hover:text-rose-300"
          >
            <RotateCcw className="size-3 transition-transform group-hover:-rotate-45" />
            Reset
          </button>
        )}
      </div>
      
      <div className="flex flex-wrap items-center gap-6 mb-4">
        <div className="flex items-center gap-2">
          <div className={cn("w-3 h-0.5 rounded-full", onlyPortfolio ? "bg-gradient-to-r from-[#d946ef] to-[#06b6d4]" : "bg-violet-400")} />
          <span className="text-xs text-white/60">Mi Portfolio</span>
          <span className={`text-xs font-semibold tabular-nums ${portfolioLast >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {portfolioLast >= 0 ? "+" : ""}{portfolioLast.toFixed(1)}%
          </span>
        </div>
        {!onlyPortfolio && sp500Last !== null && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-amber-400 rounded-full border-dashed" style={{ borderStyle: "dashed", borderWidth: "1px", borderColor: "#fbbf24", backgroundColor: "transparent" }} />
            <span className="text-xs text-white/60">S&P 500</span>
            <span className={`text-xs font-semibold tabular-nums ${sp500Last >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {sp500Last >= 0 ? "+" : ""}{sp500Last.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      <div className="h-[200px] md:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="portfolioLineStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#d946ef" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="rgba(255,255,255,0.04)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis 
              dataKey="labelX" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
            />
            <YAxis 
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              width={45}
            />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="2 4" yAxisId="left" />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="portfolio"
              stroke={onlyPortfolio ? "url(#portfolioLineStroke)" : "#a78bfa"}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: onlyPortfolio ? "#06b6d4" : "#a78bfa", stroke: "#09090b", strokeWidth: 2 }}
              isAnimationActive
              animationDuration={600}
            />
            {!onlyPortfolio && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="sp500"
                stroke="#fbbf24"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                activeDot={{ r: 4, fill: "#fbbf24", stroke: "#09090b", strokeWidth: 2 }}
                isAnimationActive
                animationDuration={600}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
