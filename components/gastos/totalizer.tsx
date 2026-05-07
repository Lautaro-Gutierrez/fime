"use client";

import { useEffect, useRef } from "react";
import { animate, motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatARS } from "@/lib/format";
import type { Expense } from "@/hooks/use-expenses";
import { toISODate } from "@/lib/format";
import { PrivateAmount } from "@/components/ui/private-amount";

type Props = {
  expenses: Expense[];
  previousTotal: number | null;
  isViewingCurrentMonth: boolean;
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

export function Totalizer({ expenses, previousTotal, isViewingCurrentMonth }: Props) {
  const today = toISODate(new Date());
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const programado = isViewingCurrentMonth
    ? expenses.filter((e) => e.date > today).reduce((s, e) => s + Number(e.amount), 0)
    : 0;
  const yaPagado = total - programado;

  const delta =
    previousTotal && previousTotal > 0
      ? ((total - previousTotal) / previousTotal) * 100
      : null;
  const deltaUp = delta !== null && delta > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative flex min-h-[240px] flex-col justify-center overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-card/80 via-card/60 to-theme-950/30 p-6 backdrop-blur sm:p-10"
    >
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-theme-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-12 size-48 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.03),transparent_60%)]" />

      <div className="relative flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-theme-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Total del mes
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-gradient-to-br from-white via-white to-white/70 bg-clip-text font-mono text-5xl font-bold leading-none tracking-tight tabular-nums text-transparent sm:text-7xl lg:text-8xl drop-shadow-[0_0_24px_rgba(16,185,129,0.4)]"
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
                  ? "bg-rose-500/10 text-rose-300 ring-rose-500/30"
                  : "bg-theme-500/10 text-theme-300 ring-theme-500/30"
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

          {programado > 0 && (
            <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/5 px-3 py-1 text-[11px] backdrop-blur">
              <span className="text-muted-foreground">
                pagado{" "}
                <span className="font-mono font-semibold tabular-nums text-foreground">
                  <PrivateAmount>{formatARS(yaPagado)}</PrivateAmount>
                </span>
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-muted-foreground">
                programado{" "}
                <span className="font-mono font-semibold tabular-nums text-theme-300">
                  <PrivateAmount>{formatARS(programado)}</PrivateAmount>
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
