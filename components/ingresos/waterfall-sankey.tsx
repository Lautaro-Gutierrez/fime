"use client";

import { useMemo } from "react";
import { Layer, Rectangle, ResponsiveContainer, Sankey, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { formatARS } from "@/lib/format";
import { DISTRIBUTION_BUCKETS } from "@/lib/income-categories";
import type { IncomeDistribution } from "@/types/database";

type Props = {
  amountArs: number;
  distribution: IncomeDistribution;
  compact?: boolean;
  // Si se pasa, los buckets fixed/variable se derivan de los gastos reales
  // del mes y NO de la distribución guardada. Invest/save se renormalizan al
  // remanente respetando la proporción original del plan.
  realExpenses?: { fixed: number; variable: number };
};

// Resuelve los % efectivos por bucket. Si hay realExpenses > 0, los usa para
// fixed/variable (clampeando a [0,100]) y redistribuye invest/save en el
// remanente proporcionalmente al plan original.
function resolvePcts(
  amountArs: number,
  distribution: IncomeDistribution,
  realExpenses?: { fixed: number; variable: number },
): Record<string, number> {
  const realTotal = realExpenses
    ? realExpenses.fixed + realExpenses.variable
    : 0;
  if (!realExpenses || realTotal <= 0 || amountArs <= 0) {
    return {
      fixed: distribution.fixed_pct,
      variable: distribution.variable_pct,
      invest: distribution.invest_pct,
      save: distribution.save_pct,
    };
  }
  const rawFixedPct = (realExpenses.fixed / amountArs) * 100;
  const rawVariablePct = (realExpenses.variable / amountArs) * 100;
  const fixedPct = Math.min(100, rawFixedPct);
  const variablePct = Math.min(Math.max(0, 100 - fixedPct), rawVariablePct);
  const remainder = Math.max(0, 100 - fixedPct - variablePct);
  const planInvSave = distribution.invest_pct + distribution.save_pct;
  let investPct: number;
  let savePct: number;
  if (planInvSave <= 0) {
    investPct = remainder / 2;
    savePct = remainder - investPct;
  } else {
    investPct = (distribution.invest_pct / planInvSave) * remainder;
    savePct = remainder - investPct;
  }
  return {
    fixed: fixedPct,
    variable: variablePct,
    invest: investPct,
    save: savePct,
  };
}

// Nodo custom: rect + label con monto.
function SankeyNode(
  props: unknown,
) {
  // Recharts passes dynamic shape props; we type-cast defensively.
  const p = props as {
    x: number;
    y: number;
    width: number;
    height: number;
    index: number;
    payload: { name: string; color?: string; value?: number };
    containerWidth: number;
  };
  const { x, y, width, height, index, payload, containerWidth } = p;
  const isSource = index === 0;
  const fill = payload.color ?? "#84CC16";
  const labelX = isSource ? x - 6 : x + width + 6;
  const anchor = isSource ? "end" : "start";

  return (
    <Layer key={`node-${index}`}>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        fillOpacity={0.9}
      />
      <text
        textAnchor={anchor}
        x={labelX}
        y={y + height / 2 - 6}
        fontSize={11}
        fontWeight={600}
        fill="#e5e7eb"
      >
        {payload.name}
      </text>
      <text
        textAnchor={anchor}
        x={labelX}
        y={y + height / 2 + 8}
        fontSize={10}
        fill="#94a3b8"
      >
        {formatARS(payload.value ?? 0)}
      </text>
      {/* Spacing reference to avoid ESLint unused */}
      <text x={containerWidth} y={0} style={{ display: "none" }} />
    </Layer>
  );
}

function SankeyLink(props: unknown) {
  const p = props as {
    sourceX: number;
    targetX: number;
    sourceY: number;
    targetY: number;
    sourceControlX: number;
    targetControlX: number;
    linkWidth: number;
    index: number;
    payload: { target: { color?: string } };
  };
  const {
    sourceX,
    targetX,
    sourceY,
    targetY,
    sourceControlX,
    targetControlX,
    linkWidth,
    index,
    payload,
  } = p;
  const color = payload.target.color ?? "#84CC16";

  return (
    <path
      key={`link-${index}`}
      d={`
        M${sourceX},${sourceY + linkWidth / 2}
        C${sourceControlX},${sourceY + linkWidth / 2}
         ${targetControlX},${targetY + linkWidth / 2}
         ${targetX},${targetY + linkWidth / 2}
        L${targetX},${targetY - linkWidth / 2}
        C${targetControlX},${targetY - linkWidth / 2}
         ${sourceControlX},${sourceY - linkWidth / 2}
         ${sourceX},${sourceY - linkWidth / 2}
        Z
      `}
      fill={color}
      fillOpacity={0.25}
      stroke={color}
      strokeOpacity={0.4}
      strokeWidth={0.5}
    />
  );
}

export function WaterfallSankey({
  amountArs,
  distribution,
  compact = false,
  realExpenses,
}: Props) {
  const data = useMemo(() => {
    const pcts = resolvePcts(amountArs, distribution, realExpenses);
    // Filtramos buckets con 0% — evita que sus labels se superpongan con el
    // bucket siguiente al quedar comprimidos contra el eje.
    const activeBuckets = DISTRIBUTION_BUCKETS.filter(
      (b) => (pcts[b.id] ?? 0) > 0,
    );
    const nodes = [
      { name: "Ingreso", color: "#84CC16", value: amountArs },
      ...activeBuckets.map((b) => ({
        name: b.label,
        color: b.color,
        value: amountArs * ((pcts[b.id] ?? 0) / 100),
      })),
    ];
    const links = activeBuckets.map((b, i) => ({
      source: 0,
      target: i + 1,
      value: amountArs * ((pcts[b.id] ?? 0) / 100),
    }));
    return { nodes, links };
  }, [amountArs, distribution, realExpenses]);

  const height = compact ? 280 : 360;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="w-full"
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={data}
          node={<SankeyNode />}
          link={<SankeyLink />}
          nodePadding={32}
          nodeWidth={8}
          margin={{ top: 16, right: 140, bottom: 16, left: 80 }}
        >
          <Tooltip
            contentStyle={{
              background: "rgba(12,14,20,0.95)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              fontSize: 12,
              color: "#e5e7eb",
              boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
            }}
            itemStyle={{ color: "#e5e7eb" }}
            labelStyle={{ color: "#cbd5e1", fontWeight: 600 }}
            wrapperStyle={{ outline: "none" }}
            formatter={(value) => formatARS(Number(value))}
          />
        </Sankey>
      </ResponsiveContainer>
    </motion.div>
  );
}
