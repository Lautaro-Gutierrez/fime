"use client";

import { useMemo } from "react";
import { usePortfolio } from "@/hooks/use-portfolio";
import { usePrefsContext } from "@/components/providers/preferences-provider";
import { formatUSD } from "@/lib/format";
import { Cell, Pie, PieChart, LineChart, Line, ResponsiveContainer } from "recharts";
import { ArrowRight, TrendingUp } from "lucide-react";
import Link from "next/link";

const PALETTE = [
  "#10B981", "#6366F1", "#F59E0B", "#EC4899", "#0EA5E9",
  "#84CC16", "#F43F5E", "#EAB308", "#14B8A6", "#3B82F6",
];

export function PortfolioSnapshot() {
  const { stealthMode: isStealthMode } = usePrefsContext();
  const portfolio = usePortfolio();

  const donutData = useMemo(() => {
    return portfolio.holdings
      .filter((h) => h.current_value_usd > 0)
      .map((h, i) => ({
        id: h.key,
        label: h.label,
        value: h.current_value_usd,
        color: h.key === 'GOOGL' || h.label === 'GOOGL' ? '#22C55E' : PALETTE[i % PALETTE.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // top 5 para el minidonut
  }, [portfolio.holdings]);

  const twrData = useMemo(() => {
    if (!portfolio.returnSeries) return [];
    return portfolio.returnSeries.slice(-30).map(s => ({
      value: s.portfolio_pct
    }));
  }, [portfolio.returnSeries]);

  const lastTwr = twrData.length > 0 ? twrData[twrData.length - 1].value : 0;
  const isPositive = lastTwr >= 0;

  if (portfolio.isLoading) {
    return <div className="rounded-3xl border border-white/5 bg-card/60 backdrop-blur p-6 h-full min-h-[320px] animate-pulse" />;
  }

  return (
    <div className="rounded-3xl border border-white/5 bg-card/60 backdrop-blur p-6 h-full flex flex-col relative overflow-hidden group hover:border-white/10 transition-colors">
      <Link href="/portfolio" className="absolute inset-0 z-10">
        <span className="sr-only">Go to Portfolio</span>
      </Link>
      
      {/* Background glow para la card */}
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Portfolio Snapshot
          </h3>
          <div className="text-3xl font-semibold mt-1">
            {isStealthMode ? "******" : formatUSD(portfolio.totals.total_usd, false)}
          </div>
        </div>
        <div className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowRight className="w-5 h-5" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 flex-1 items-center">
        {/* Minidonut + Legend */}
        <div className="flex flex-col xl:flex-row items-center xl:items-start justify-center gap-3">
          <div className="h-[80px] w-[80px] shrink-0 relative">
            {donutData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={35}
                    dataKey="value"
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {donutData.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground text-center leading-tight">
                Sin datos
              </div>
            )}
          </div>
          
          {/* Leyenda del Top 5 */}
          {donutData.length > 0 && (
            <div className="flex flex-col gap-1 text-[10px] xl:text-xs">
              {donutData.map(d => (
                <div key={d.id} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground truncate w-[60px] xl:w-[75px]">{d.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mini TWR Chart (30d) */}
        <div className="flex flex-col justify-center gap-2 h-[120px]">
          <div className="text-xs text-muted-foreground">TWR (30d)</div>
          <div className="h-[60px] w-full">
            {twrData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={twrData}>
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke={isPositive ? "#10B981" : "#EF4444"} 
                    strokeWidth={2} 
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center text-xs text-muted-foreground">
                No data
              </div>
            )}
          </div>
          <div className={`text-sm font-medium ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
            {isStealthMode ? "***" : `${isPositive ? "+" : ""}${lastTwr.toFixed(2)}%`}
          </div>
        </div>
      </div>
    </div>
  );
}
