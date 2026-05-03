"use client";

import { useMemo } from "react";
import { useIncomes } from "@/hooks/use-incomes";
import { useExpenses } from "@/hooks/use-expenses";
import { usePortfolio } from "@/hooks/use-portfolio";
import { usePreferences } from "@/hooks/use-preferences";
import { Sankey, Tooltip as RechartsTooltip, ResponsiveContainer, Layer, Rectangle } from "recharts";
import { formatUSD } from "@/lib/format";
import { Network } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  Ingresos: "#10B981", // emerald
  Déficit: "#EF4444", // red
  Ahorro: "#3B82F6", // blue
  alquiler: "#8B5CF6", // violet
  servicios: "#0EA5E9", // sky
  impuestos: "#F43F5E", // rose
  comida: "#F59E0B", // amber
  tarjeta_credito: "#D946EF", // fuchsia
  educacion: "#06B6D4", // cyan
  imprevistos: "#EC4899", // pink
};

function CustomNode({ x, y, width, height, index, payload, containerWidth }: any) {
  const isOut = x + width + 50 > containerWidth;
  return (
    <Layer key={`CustomNode${index}`}>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={CATEGORY_COLORS[payload.name] || "#6366F1"}
        fillOpacity={0.9}
        radius={4}
      />
      <text
        textAnchor={isOut ? "end" : "start"}
        x={isOut ? x - 6 : x + width + 6}
        y={y + height / 2 + 4}
        fontSize="12"
        fill="#A1A1AA"
        className="capitalize pointer-events-none"
      >
        {payload.name}
      </text>
    </Layer>
  );
}

export function CashflowSankey() {
  const { isStealthMode } = usePreferences();
  const portfolio = usePortfolio();
  
  const currentMonth = useMemo(() => new Date(), []);
  const incomesQ = useIncomes(currentMonth);
  const expensesQ = useExpenses(currentMonth);

  const fxMep = portfolio.fxMep > 0 ? portfolio.fxMep : 1000;

  const sankeyData = useMemo(() => {
    const totalIncomesUsd = (incomesQ.data ?? []).reduce((acc, inc) => {
      return acc + (inc.currency === "USD" ? inc.amount : inc.amount / fxMep);
    }, 0);

    const expensesByCategory = (expensesQ.data ?? []).reduce((acc, exp) => {
      const amountUsd = exp.currency === "USD" ? exp.amount : exp.amount / fxMep;
      acc[exp.category] = (acc[exp.category] || 0) + amountUsd;
      return acc;
    }, {} as Record<string, number>);

    const totalExpensesUsd = Object.values(expensesByCategory).reduce((a, b) => a + b, 0);

    if (totalIncomesUsd === 0 && totalExpensesUsd === 0) {
      return null;
    }

    const nodes = [{ name: "Ingresos" }];
    const links = [];
    let nodeIndex = 1;

    if (totalIncomesUsd >= totalExpensesUsd) {
      // Hay ahorro
      Object.entries(expensesByCategory).forEach(([cat, amount]) => {
        nodes.push({ name: cat });
        links.push({ source: 0, target: nodeIndex, value: amount });
        nodeIndex++;
      });
      
      const savings = totalIncomesUsd - totalExpensesUsd;
      if (savings > 0) {
        nodes.push({ name: "Ahorro" });
        links.push({ source: 0, target: nodeIndex, value: savings });
      }
    } else {
      // Déficit
      nodes.push({ name: "Déficit" });
      const deficitNode = 1;
      nodeIndex = 2;
      
      let incomeLeft = totalIncomesUsd;
      
      Object.entries(expensesByCategory).forEach(([cat, amount]) => {
        nodes.push({ name: cat });
        const targetNode = nodeIndex;
        nodeIndex++;
        
        if (incomeLeft >= amount) {
          links.push({ source: 0, target: targetNode, value: amount });
          incomeLeft -= amount;
        } else if (incomeLeft > 0) {
          links.push({ source: 0, target: targetNode, value: incomeLeft });
          const deficitAmount = amount - incomeLeft;
          links.push({ source: deficitNode, target: targetNode, value: deficitAmount });
          incomeLeft = 0;
        } else {
          links.push({ source: deficitNode, target: targetNode, value: amount });
        }
      });
    }

    // El Sankey de recharts requiere que haya links válidos.
    if (links.length === 0) return null;

    return { nodes, links };
  }, [incomesQ.data, expensesQ.data, fxMep]);

  const isLoading = incomesQ.isLoading || expensesQ.isLoading;

  if (isLoading) {
    return <div className="rounded-3xl border border-white/5 bg-card/60 backdrop-blur p-6 h-full min-h-[320px] animate-pulse" />;
  }

  return (
    <div className="rounded-3xl border border-white/5 bg-card/60 backdrop-blur p-6 h-full min-h-[320px] flex flex-col relative overflow-hidden group hover:border-white/10 transition-colors">
      <div className="absolute -top-20 -left-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center gap-2 mb-6">
        <Network className="w-5 h-5 text-emerald-400" />
        <h3 className="text-lg font-medium text-foreground/80">Cashflow Sankey</h3>
      </div>

      <div className="flex-1 w-full min-h-[250px]">
        {sankeyData ? (
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={sankeyData}
              node={<CustomNode containerWidth={1000} />} // passed to get width approx
              nodePadding={20}
              margin={{ top: 10, right: 80, bottom: 10, left: 20 }}
              link={{ stroke: "#ffffff", strokeOpacity: 0.1 }}
            >
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0];
                    // Dependiendo de si se hoverea un nodo o un link, el payload cambia
                    const value = data.value;
                    const name = data.name || `${data.source?.name} → ${data.target?.name}`;
                    return (
                      <div className="rounded-lg border border-white/10 bg-card/90 p-3 shadow-xl backdrop-blur-md">
                        <div className="text-sm font-medium capitalize mb-1">{name}</div>
                        <div className="text-lg font-semibold tabular-nums text-emerald-400">
                          {isStealthMode ? "******" : formatUSD(value, false)}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </Sankey>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Aún no hay ingresos ni gastos este mes
          </div>
        )}
      </div>
    </div>
  );
}
