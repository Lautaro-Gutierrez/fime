"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { TrendingUp, TrendingDown, Wallet, ArrowRight } from "lucide-react";
import { useExpenses } from "@/hooks/use-expenses";
import { formatARS } from "@/lib/format";
import { PrivateAmount } from "@/components/ui/private-amount";

type Props = {
  month: Date;
  incomesTotal: number;
};

// Muestra el flujo libre REAL del mes: ingresos cargados - gastos cargados.
// Se alimenta del módulo Gastos vía useExpenses (cache compartido + Realtime).
export function ForecastBar({ month, incomesTotal }: Props) {
  const { data: expenses = [], isLoading } = useExpenses(month);

  const expensesTotal = useMemo(
    () => expenses.reduce((s, e) => s + Number(e.amount), 0),
    [expenses],
  );

  const freeCash = incomesTotal - expensesTotal;
  const isPositive = freeCash >= 0;
  const used =
    incomesTotal > 0
      ? Math.min((expensesTotal / incomesTotal) * 100, 100)
      : 0;

  const barGradient =
    used > 90
      ? "from-rose-500/70 via-rose-400/70 to-rose-400/70"
      : used > 70
        ? "from-theme-500/70 via-theme-400/70 to-theme-300/70"
        : "from-theme-500/70 via-theme-400/70 to-lime-400/70";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      className="relative overflow-hidden rounded-3xl border border-white/5 bg-card/60 p-5 backdrop-blur"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-lime-500/10 blur-3xl" />

      <div className="relative flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-lime-400 shadow-[0_0_8px_rgba(132,204,22,0.8)]" />
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Flujo libre del mes
        </p>
        <Link
          href="/gastos"
          className="ml-auto inline-flex items-center gap-1 rounded-full border border-white/5 bg-card/60 px-2 py-1 text-[10px] font-semibold text-muted-foreground backdrop-blur transition-colors hover:bg-white/10 hover:text-foreground"
        >
          Ver gastos
          <ArrowRight className="size-3" />
        </Link>
        <div className="flex size-8 items-center justify-center rounded-xl bg-lime-500/15 text-lime-300 ring-1 ring-lime-500/30">
          <Wallet className="size-4" />
        </div>
      </div>

      <div className="relative mt-4 grid gap-3 sm:grid-cols-3">
        {/* Ingresos */}
        <div className="flex flex-col gap-0.5 rounded-xl border border-white/5 bg-card/40 p-3 backdrop-blur">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Ingresos
          </span>
          <span className="font-mono text-xl font-bold tabular-nums text-lime-300">
            <PrivateAmount>{formatARS(incomesTotal)}</PrivateAmount>
          </span>
        </div>

        {/* Gastos */}
        <div className="flex flex-col gap-0.5 rounded-xl border border-white/5 bg-card/40 p-3 backdrop-blur">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Gastos
          </span>
          <span className="font-mono text-xl font-bold tabular-nums text-rose-300">
            <PrivateAmount>{isLoading ? "—" : formatARS(expensesTotal)}</PrivateAmount>
          </span>
        </div>

        {/* Flujo libre */}
        <div className="flex flex-col gap-0.5 rounded-xl border border-lime-500/15 bg-gradient-to-br from-lime-500/10 via-card/40 to-card/40 p-3 backdrop-blur">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Libre
            </span>
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ring-1 ${
                isPositive
                  ? "bg-lime-500/10 text-lime-300 ring-lime-500/30"
                  : "bg-rose-500/10 text-rose-300 ring-rose-500/30"
              }`}
            >
              {isPositive ? (
                <TrendingUp className="size-2.5" />
              ) : (
                <TrendingDown className="size-2.5" />
              )}
              {isPositive ? "Positivo" : "Déficit"}
            </span>
          </div>
          <span
            className={`bg-gradient-to-br ${
              isPositive
                ? "from-white via-white to-lime-200/70"
                : "from-white via-white to-rose-200/70"
            } bg-clip-text font-mono text-xl font-bold tabular-nums text-transparent`}
          >
            <PrivateAmount>{formatARS(freeCash)}</PrivateAmount>
          </span>
        </div>
      </div>

      {/* Barra de consumo */}
      <div className="relative mt-4 flex flex-col gap-1.5">
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${used}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${barGradient}`}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{used.toFixed(0)}% de ingresos consumidos</span>
          {incomesTotal === 0 ? (
            <span className="text-rose-300/70">
              Cargá ingresos para ver el flujo libre
            </span>
          ) : expensesTotal === 0 ? (
            <Link
              href="/gastos"
              className="text-lime-300 underline-offset-2 hover:underline"
            >
              Sin gastos cargados →
            </Link>
          ) : (
            <span>
              Disponible:{" "}
              <span className="font-mono tabular-nums text-foreground/80">
                <PrivateAmount>{formatARS(Math.max(freeCash, 0))}</PrivateAmount>
              </span>
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
