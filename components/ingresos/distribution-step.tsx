"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, RotateCcw, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DISTRIBUTION_BUCKETS,
  DEFAULT_DISTRIBUTION,
  type DistributionBucket,
} from "@/lib/income-categories";
import type { IncomeDistribution } from "@/types/database";

type BucketConfig = (typeof DISTRIBUTION_BUCKETS)[number];

const AMOUNT_FORMATTER = new Intl.NumberFormat("es-AR");

type RealExpenses = { fixed: number; variable: number };

type Props = {
  amountArs: number;
  initial?: IncomeDistribution | null;
  onBack: () => void;
  onConfirm: (dist: IncomeDistribution) => void;
  isSaving?: boolean;
  // Si viene y suma > 0, fixed_pct y variable_pct se derivan de los gastos
  // reales del mes y quedan locked. Solo invest/save son editables.
  realExpenses?: RealExpenses;
};

const KEY_BY_BUCKET: Record<DistributionBucket, keyof IncomeDistribution> = {
  fixed: "fixed_pct",
  variable: "variable_pct",
  invest: "invest_pct",
  save: "save_pct",
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

// Cuando hay gastos reales, derivamos fixed/variable desde montos reales y
// distribuimos el remanente entre invest/save respetando la proporción del
// plan inicial.
function computeLockedDist(
  amountArs: number,
  realExpenses: RealExpenses,
  base: IncomeDistribution,
): IncomeDistribution {
  if (amountArs <= 0) return base;
  const rawFixed = (realExpenses.fixed / amountArs) * 100;
  const rawVariable = (realExpenses.variable / amountArs) * 100;
  const fixed = clamp(Math.round(rawFixed));
  const variable = clamp(Math.round(rawVariable), 0, 100 - fixed);
  const remainder = Math.max(0, 100 - fixed - variable);
  const planInvSave = base.invest_pct + base.save_pct;
  let invest: number;
  let save: number;
  if (planInvSave <= 0) {
    invest = Math.floor(remainder / 2);
    save = remainder - invest;
  } else {
    invest = Math.round((base.invest_pct / planInvSave) * remainder);
    save = remainder - invest;
  }
  return {
    fixed_pct: fixed,
    variable_pct: variable,
    invest_pct: invest,
    save_pct: save,
  };
}

// Al mover un slider, redistribuye el resto proporcionalmente para mantener suma = 100.
function rebalance(
  prev: IncomeDistribution,
  changed: DistributionBucket,
  newValue: number,
): IncomeDistribution {
  const v = clamp(Math.round(newValue));
  const changedKey = KEY_BY_BUCKET[changed];

  const others = DISTRIBUTION_BUCKETS.filter((b) => b.id !== changed);
  const otherKeys = others.map((b) => KEY_BY_BUCKET[b.id]);
  const otherTotal = otherKeys.reduce((s, k) => s + prev[k], 0);
  const remaining = 100 - v;

  const next = { ...prev, [changedKey]: v };

  if (otherTotal === 0) {
    const share = Math.floor(remaining / otherKeys.length);
    otherKeys.forEach((k) => {
      next[k] = share;
    });
    // Ajuste final para asegurar suma 100 exacta.
    const drift = 100 - (v + share * otherKeys.length);
    next[otherKeys[0]] += drift;
  } else {
    let assigned = 0;
    otherKeys.forEach((k, i) => {
      if (i < otherKeys.length - 1) {
        const val = Math.round((prev[k] / otherTotal) * remaining);
        next[k] = val;
        assigned += val;
      } else {
        // El último absorbe el remainder para garantizar suma exacta.
        next[k] = remaining - assigned;
      }
    });
  }

  return next;
}

export function DistributionStep({
  amountArs,
  initial,
  onBack,
  onConfirm,
  isSaving,
  realExpenses,
}: Props) {
  const hasRealExpenses =
    !!realExpenses && realExpenses.fixed + realExpenses.variable > 0;

  const [dist, setDist] = useState<IncomeDistribution>(() => {
    const base: IncomeDistribution = {
      ...DEFAULT_DISTRIBUTION,
      ...(initial ?? {}),
    };
    return hasRealExpenses
      ? computeLockedDist(amountArs, realExpenses!, base)
      : base;
  });

  // Si los gastos reales o el monto cambian externamente, resincronizamos los
  // buckets locked. Invest/save del estado se recalculan al remanente.
  useEffect(() => {
    if (!hasRealExpenses) return;
    setDist((prev) => computeLockedDist(amountArs, realExpenses!, prev));
  }, [amountArs, realExpenses, hasRealExpenses]);

  const sum = useMemo(
    () => dist.fixed_pct + dist.variable_pct + dist.invest_pct + dist.save_pct,
    [dist],
  );

  function handleChange(bucket: DistributionBucket, value: number) {
    if (hasRealExpenses) {
      // fixed/variable están locked — los ignoramos.
      if (bucket === "fixed" || bucket === "variable") return;
      setDist((prev) => {
        const v = clamp(Math.round(value));
        const lockedSum = prev.fixed_pct + prev.variable_pct;
        const remainder = Math.max(0, 100 - lockedSum);
        const capped = Math.min(v, remainder);
        if (bucket === "invest") {
          return { ...prev, invest_pct: capped, save_pct: remainder - capped };
        }
        return { ...prev, save_pct: capped, invest_pct: remainder - capped };
      });
      return;
    }
    setDist((prev) => rebalance(prev, bucket, value));
  }

  function handleReset() {
    if (hasRealExpenses) {
      setDist((prev) => {
        const remainder = Math.max(
          0,
          100 - prev.fixed_pct - prev.variable_pct,
        );
        const invest = Math.floor(remainder / 2);
        return {
          ...prev,
          invest_pct: invest,
          save_pct: remainder - invest,
        };
      });
      return;
    }
    setDist({ ...DEFAULT_DISTRIBUTION });
  }

  const pctByBucket: Record<DistributionBucket, number> = {
    fixed: dist.fixed_pct,
    variable: dist.variable_pct,
    invest: dist.invest_pct,
    save: dist.save_pct,
  };

  const lockedBuckets: Partial<Record<DistributionBucket, boolean>> =
    hasRealExpenses ? { fixed: true, variable: true } : {};

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="relative flex flex-col gap-5 p-6"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(132,204,22,0.1),transparent_60%)]" />

      {/* Header */}
      <div className="relative flex items-start gap-3">
        <button
          onClick={onBack}
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/5 bg-card/60 text-muted-foreground backdrop-blur transition-colors hover:bg-white/10 hover:text-foreground"
          aria-label="Volver"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-lime-300/80">
            Paso 2 · Distribución
          </span>
          <h2 className="text-lg font-semibold tracking-tight">
            ¿Cómo repartís este ingreso?
          </h2>
        </div>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-1 rounded-full border border-white/5 bg-card/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur transition-colors hover:bg-white/10 hover:text-foreground"
        >
          <RotateCcw className="size-3" />
          Default
        </button>
      </div>

      {hasRealExpenses && (
        <div className="relative flex items-start gap-2 rounded-xl border border-lime-500/15 bg-lime-500/5 p-3 text-[11px]">
          <Lock className="mt-0.5 size-3.5 shrink-0 text-lime-300" />
          <p className="text-muted-foreground">
            Gastos fijos y variables vienen de los{" "}
            <span className="text-foreground">gastos reales del mes</span>.
            Ajustalos cargando/editando gastos. Solo{" "}
            <span className="text-foreground">Inversiones</span> y{" "}
            <span className="text-foreground">Ahorro</span> son editables acá.
          </p>
        </div>
      )}

      {/* Barra preview — 4 segmentos coloreados */}
      <div className="relative flex h-3 w-full overflow-hidden rounded-full ring-1 ring-white/10">
        {DISTRIBUTION_BUCKETS.map((b) => {
          const pct = pctByBucket[b.id];
          if (pct === 0) return null;
          return (
            <motion.div
              key={b.id}
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.25 }}
              style={{ backgroundColor: b.color }}
              className="h-full"
            />
          );
        })}
      </div>

      {/* Sliders */}
      <div className="relative flex flex-col gap-3">
        {DISTRIBUTION_BUCKETS.map((b) => (
          <BucketRow
            key={b.id}
            bucket={b}
            pct={pctByBucket[b.id]}
            amountArs={amountArs}
            onPctChange={(v) => handleChange(b.id, v)}
            locked={!!lockedBuckets[b.id]}
          />
        ))}
      </div>

      {/* Sum indicator */}
      <div className="relative flex items-center justify-between rounded-xl border border-white/5 bg-card/40 px-3 py-2 text-[11px] backdrop-blur">
        <span className="text-muted-foreground">Total</span>
        <span
          className={`font-mono font-bold tabular-nums ${
            sum === 100 ? "text-lime-300" : "text-amber-300"
          }`}
        >
          {sum}%
        </span>
      </div>

      {/* Actions */}
      <div className="relative flex items-center gap-2">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isSaving}
          className="h-11 flex-1 rounded-xl border-white/5 bg-card/40 hover:bg-card/60"
        >
          Atrás
        </Button>
        <Button
          onClick={() => onConfirm(dist)}
          disabled={isSaving || sum !== 100}
          className="h-11 flex-1 gap-2 rounded-xl bg-gradient-to-br from-lime-500 to-green-600 text-white shadow-lg shadow-lime-500/25 transition-all hover:from-lime-400 hover:to-green-500 hover:shadow-lime-500/40 disabled:opacity-50"
        >
          <Check className="size-4" />
          {isSaving ? "Guardando..." : "Confirmar"}
        </Button>
      </div>

    </motion.div>
  );
}

// Fila por bucket — permite editar % o monto. El monto se convierte a % y se
// reenvía a `rebalance` del parent. La granularidad queda en 1% (el monto se
// redondea al % entero más cercano tras el commit).
function BucketRow({
  bucket,
  pct,
  amountArs,
  onPctChange,
  locked = false,
}: {
  bucket: BucketConfig;
  pct: number;
  amountArs: number;
  onPctChange: (newPct: number) => void;
  locked?: boolean;
}) {
  const amount = amountArs * (pct / 100);
  const [rawAmount, setRawAmount] = useState(() => String(Math.round(amount)));
  const [isAmountFocused, setIsAmountFocused] = useState(false);

  // Cuando el pct cambia externamente (rebalance, reset, otro slider), resync.
  useEffect(() => {
    if (!isAmountFocused) {
      setRawAmount(String(Math.round(amount)));
    }
  }, [amount, isAmountFocused]);

  const displayedAmount = isAmountFocused
    ? rawAmount
    : AMOUNT_FORMATTER.format(Math.round(amount));

  function commitAmount() {
    setIsAmountFocused(false);
    if (amountArs <= 0) {
      setRawAmount(String(Math.round(amount)));
      return;
    }
    const v = Number(rawAmount);
    if (!Number.isFinite(v) || v < 0) {
      setRawAmount(String(Math.round(amount)));
      return;
    }
    const newPct = clamp((v / amountArs) * 100);
    onPctChange(newPct);
  }

  const amountDisabled = amountArs <= 0 || locked;
  const pctDisabled = locked;

  return (
    <div className={`flex flex-col gap-1.5 ${locked ? "opacity-80" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="size-2 rounded-full"
            style={{
              backgroundColor: bucket.color,
              boxShadow: `0 0 8px ${bucket.color}60`,
            }}
          />
          <span className="text-sm font-semibold tracking-tight">
            {bucket.label}
          </span>
          {locked && (
            <Lock className="size-3 text-muted-foreground" aria-label="Bloqueado por gastos reales" />
          )}
        </div>
        <div className="flex items-baseline gap-1.5">
          {/* % input */}
          <div
            className={`flex items-baseline rounded-md border border-white/5 bg-card/60 px-1.5 py-0.5 backdrop-blur transition-colors ${
              pctDisabled
                ? "opacity-60"
                : "focus-within:border-lime-500/40 focus-within:ring-1 focus-within:ring-lime-500/20"
            }`}
          >
            <input
              type="number"
              min={0}
              max={100}
              value={pct}
              disabled={pctDisabled}
              readOnly={pctDisabled}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) onPctChange(v);
              }}
              onFocus={(e) => e.currentTarget.select()}
              aria-label={`Porcentaje ${bucket.label}`}
              className="w-9 bg-transparent text-right font-mono text-sm font-bold tabular-nums outline-none disabled:cursor-not-allowed [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="font-mono text-sm font-bold text-muted-foreground">
              %
            </span>
          </div>
          {/* $ input */}
          <div
            className={`flex items-baseline gap-0.5 rounded-md border border-white/5 bg-card/60 px-1.5 py-0.5 backdrop-blur transition-colors ${
              amountDisabled
                ? "opacity-50"
                : "focus-within:border-lime-500/40 focus-within:ring-1 focus-within:ring-lime-500/20"
            }`}
          >
            <span className="font-mono text-[10px] font-semibold text-muted-foreground">
              $
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={displayedAmount}
              disabled={amountDisabled}
              readOnly={locked}
              onChange={(e) => {
                // Solo dígitos — el formato se aplica en blur.
                const v = e.target.value.replace(/\D/g, "");
                setRawAmount(v);
              }}
              onFocus={(e) => {
                const target = e.currentTarget;
                setIsAmountFocused(true);
                setRawAmount(String(Math.round(amount)));
                requestAnimationFrame(() => target.select());
              }}
              onBlur={commitAmount}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                } else if (e.key === "Escape") {
                  setRawAmount(String(Math.round(amount)));
                  e.currentTarget.blur();
                }
              }}
              aria-label={`Monto ${bucket.label}`}
              className="w-24 bg-transparent text-right font-mono text-[11px] tabular-nums text-foreground outline-none disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={pct}
        disabled={locked}
        onChange={(e) => onPctChange(Number(e.target.value))}
        className={`h-2 w-full appearance-none rounded-full bg-white/5 outline-none ${
          locked
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer"
        } [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-black/20 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-black/20 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg`}
        style={{
          background: `linear-gradient(to right, ${bucket.color} 0%, ${bucket.color} ${pct}%, rgba(255,255,255,0.05) ${pct}%, rgba(255,255,255,0.05) 100%)`,
        }}
      />
    </div>
  );
}
