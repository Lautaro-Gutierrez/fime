"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/components/layout/shell";
import { MonthSelector } from "@/components/ingresos/month-selector";
import { QuickAddIncome } from "@/components/ingresos/quick-add";
import { Totalizer } from "@/components/ingresos/totalizer";
import { ForecastBar } from "@/components/ingresos/forecast-bar";
import { DistributionDonut } from "@/components/ingresos/distribution-donut";
import { IncomesList } from "@/components/ingresos/incomes-list";
import { useIncomes } from "@/hooks/use-incomes";
import { sumExpensesByType, useExpenses } from "@/hooks/use-expenses";
import { createClient } from "@/lib/supabase/client";
import {
  firstOfMonth,
  lastOfMonth,
  monthKey,
  toISODate,
} from "@/lib/format";

export default function IngresosPage() {
  const [month, setMonth] = useState(() => firstOfMonth(new Date()));

  const { data: incomes = [], isLoading } = useIncomes(month);
  const { data: expenses = [] } = useExpenses(month);

  const totalArs = useMemo(
    () => incomes.reduce((s, i) => s + Number(i.amount_ars), 0),
    [incomes],
  );

  // Sumas por type para el Sankey — se recalculan en cada invalidación de la
  // cache de expenses (alta, edición, baja o Realtime).
  const realExpenses = useMemo(() => {
    const sums = sumExpensesByType(expenses);
    return sums.total > 0
      ? { fixed: sums.fixed, variable: sums.variable }
      : undefined;
  }, [expenses]);

  const previousMonth = useMemo(
    () => new Date(month.getFullYear(), month.getMonth() - 1, 1),
    [month],
  );

  const { data: previousTotal = null } = useQuery({
    queryKey: ["incomes-total", monthKey(previousMonth)],
    queryFn: async () => {
      const supabase = createClient();
      const from = toISODate(firstOfMonth(previousMonth));
      const to = toISODate(lastOfMonth(previousMonth));
      const { data, error } = await supabase
        .from("incomes")
        .select("amount_ars")
        .gte("date", from)
        .lte("date", to);
      if (error) throw error;
      return (data ?? []).reduce(
        (sum, row) => sum + Number((row as { amount_ars: number }).amount_ars),
        0,
      );
    },
  });

  return (
    <Shell>
      <div className="relative flex flex-col gap-6 p-4 pb-10 sm:p-6 md:p-8">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[380px] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.08),transparent_65%)]" />

        {/* Hero header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-lime-300/80">
              Ingresos
            </span>
            <h1 className="bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
              Gestión de ingresos
            </h1>
            <p className="text-sm text-muted-foreground">
              Cargá tu salario, freelance y otros ingresos. Distribuilos al instante.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <MonthSelector month={month} onChange={setMonth} />
            <QuickAddIncome />
          </div>
        </motion.div>

        {/* Totalizer + Forecast */}
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Totalizer incomes={incomes} previousTotal={previousTotal} />
          <ForecastBar month={month} incomesTotal={totalArs} />
        </div>

        {/* Distribution donut + Lista */}
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <DistributionDonut incomes={incomes} />
          {isLoading ? (
            <div className="flex items-center justify-center rounded-3xl border border-white/5 bg-card/40 p-12 backdrop-blur">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="size-2 animate-pulse rounded-full bg-lime-400" />
                Cargando ingresos...
              </div>
            </div>
          ) : (
            <IncomesList
              incomes={incomes}
              filterCategory={null}
              realExpenses={realExpenses}
            />
          )}
        </div>
      </div>
    </Shell>
  );
}
