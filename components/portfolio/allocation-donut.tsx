"use client";

import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector } from "recharts";
import { PieChart as PieIcon } from "lucide-react";
import type { ValuedHolding } from "@/lib/portfolio/holdings";

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

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;

  return (
    <g>
      <text x={cx} y={cy - 12} textAnchor="middle" fill="#fff" className="text-2xl font-bold tabular-nums">
        {payload.weight.toFixed(1)}%
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fill="rgba(255,255,255,0.6)" className="text-sm font-medium">
        {payload.label}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,0.2))" }}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 4}
        outerRadius={innerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.4}
      />
    </g>
  );
};

export function AllocationDonut({ holdings }: Props) {
  const [activeIndex, setActiveIndex] = useState<number>(-1);

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

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(-1);
  };

  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div className="rounded-2xl p-6 h-full flex flex-col items-center justify-center gap-3 bg-[#1F2229] border border-white/[0.06]">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-fuchsia-500/15 ring-1 ring-fuchsia-500/30">
          <PieIcon className="size-5 text-fuchsia-300" />
        </div>
        <p className="text-sm text-muted-foreground">Sin tenencias todavía</p>
        <p className="max-w-xs text-center text-xs text-muted-foreground/70">
          Cargá posiciones iniciales o registrá transacciones en el blotter
        </p>
      </div>
    );
  }

  // Create a 3-column grid for the legend based on the V0 design
  const itemsPerColumn = Math.ceil(data.length / 3);
  const legendColumns = [
    data.slice(0, itemsPerColumn),
    data.slice(itemsPerColumn, itemsPerColumn * 2),
    data.slice(itemsPerColumn * 2),
  ];

  return (
    <div className="rounded-2xl p-6 h-full bg-[#1F2229] border border-white/[0.06]">
      <div className="h-[180px] md:h-[240px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="80%"
              paddingAngle={2}
              dataKey="value"
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              stroke="transparent"
              shape={(props: any) => {
                if (props.index === activeIndex) {
                  return renderActiveShape(props);
                }
                return (
                  <Sector
                    cx={props.cx}
                    cy={props.cy}
                    innerRadius={props.innerRadius}
                    outerRadius={props.outerRadius}
                    startAngle={props.startAngle}
                    endAngle={props.endAngle}
                    fill={props.fill}
                  />
                );
              }}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${entry.id}`} 
                  fill={entry.color}
                  style={{ 
                    cursor: "pointer",
                    transition: "all 0.2s ease-out"
                  }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        {activeIndex === -1 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-2xl font-bold text-white tabular-nums">{data.length}</p>
              <p className="text-xs text-white/50">Activos</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Responsive legend grid */}
      <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-3 md:text-sm mt-4">
        {data.map((holding, globalIndex) => (
          <div 
            key={holding.id} 
            className="flex items-center gap-2 group cursor-pointer"
            onMouseEnter={() => setActiveIndex(globalIndex)}
            onMouseLeave={() => setActiveIndex(-1)}
          >
            <div 
              className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform group-hover:scale-125"
              style={{ backgroundColor: holding.color }}
            />
            <span className="text-white/60 group-hover:text-white transition-colors truncate">
              {holding.label}
            </span>
            <span className="text-white/40 tabular-nums ml-auto pl-1">
              {holding.weight.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
