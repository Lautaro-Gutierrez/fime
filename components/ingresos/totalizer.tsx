"use client";

import { useEffect, useRef } from "react";
import { animate, motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatARS } from "@/lib/format";
import type { Income } from "@/hooks/use-incomes";
import { PrivateAmount } from "@/components/ui/private-amount";

type Props = {
  incomes: Income[];
  previousTotal: number | null;
};

function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const lastValueRef = useRef(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const from = lastValueRef.current;
    const controls = animate(from, value, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (latest) => {
        node.textContent = formatARS(latest);
      },
    });
    lastValueRef.current = value;
    return () => controls.stop();
  }, [value]);

  return <span ref={ref}>{formatARS(value)}</span>;
}

export function Totalizer({ incomes, previousTotal }: Props) {
  const total = incomes.reduce((sum, i) => sum + Number(i.amount_ars), 0);

  const delta =
    previousTotal && previousTotal > 0
      ? ((total - previousTotal) / previousTotal) * 100
      : null;
  // Para ingresos: subir es bueno (verde), bajar es malo (rojo).
  const deltaUp = delta !== null && delta > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative flex min-h-[240px] flex-col justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-br from-card/80 via-card/60 to-emerald-950/30 p-6 backdrop-blur sm:p-10"
    >
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.03),transparent_60%)]" />

      <div className="relative flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Ingresos del mes
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-gradient-to-br from-white via-white to-white/70 bg-clip-text font-mono text-4xl font-bold leading-none tracking-tight tabular-nums [font-feature-settings:'tnum'] text-transparent sm:text-5xl lg:text-6xl"
        >
          <PrivateAmount>
            <AnimatedNumber value={total} />
          </PrivateAmount>
        </motion.div>

        <div className="flex flex-wrap items-center gap-2">
          {delta !== null && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
                deltaUp
                  ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30"
                  : "bg-rose-500/10 text-rose-300 ring-rose-500/30"
              }`}
            >
              {deltaUp ? (
                <ArrowUpRight className="size-3" />
              ) : (
                <ArrowDownRight className="size-3" />
              )}
              {Math.abs(delta).toFixed(1)}% vs mes anterior
            </motion.span>
          )}

          {incomes.length > 0 && (
            <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/5 px-3 py-1 text-[11px] backdrop-blur">
              <span className="text-muted-foreground">
                movimientos{" "}
                <span className="font-mono font-semibold tabular-nums text-foreground">
                  {incomes.length}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
