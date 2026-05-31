"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/components/layout/shell";
import { Totalizer } from "@/components/gastos/totalizer";
import { DistributionDonut } from "@/components/gastos/distribution-donut";
import { CategoryCards } from "@/components/gastos/category-cards";
import { ExpensesList, type ViewMode } from "@/components/gastos/expenses-list";
import { QuickAdd } from "@/components/gastos/quick-add";
import { MonthSelector } from "@/components/gastos/month-selector";
import { useExpenses } from "@/hooks/use-expenses";
import { useCreditCards } from "@/hooks/use-credit-cards";
import { createClient } from "@/lib/supabase/client";
import {
  firstOfMonth,
  lastOfMonth,
  monthKey,
  toISODate,
} from "@/lib/format";

export default function GastosClient() {
  const [month, setMonth] = useState(() => firstOfMonth(new Date()));
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");

  const { data: expenses = [], isLoading } = useExpenses(month);
  const { data: cards = [] } = useCreditCards();

  // Total del mes anterior para calcular el delta
  const previousMonth = useMemo(
    () => new Date(month.getFullYear(), month.getMonth() - 1, 1),
    [month],
  );

  const { data: previousTotal = null } = useQuery({
    queryKey: ["expenses-total", monthKey(previousMonth)],
    queryFn: async () => {
      const supabase = createClient();
      const from = toISODate(firstOfMonth(previousMonth));
      const to = toISODate(lastOfMonth(previousMonth));
      const { data, error } = await supabase
        .from("expenses")
        .select("amount")
        .gte("date", from)
        .lte("date", to);
      if (error) throw error;
      return (data ?? []).reduce(
        (sum, row) => sum + Number((row as { amount: number }).amount),
        0,
      );
    },
  });

  const isViewingCurrentMonth =
    month.getFullYear() === new Date().getFullYear() &&
    month.getMonth() === new Date().getMonth();

  return (
    <Shell>
      <div className="relative flex flex-col gap-6 p-4 pb-10 sm:p-6 md:p-8">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[380px] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_80%)]" />

        {/* Hero header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-theme-300/80">
              Gastos
            </span>
            <h1 className="bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
              Egresos
            </h1>
            <p className="text-sm text-muted-foreground">
              Registrá y categorizá tus gastos del mes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <MonthSelector month={month} onChange={setMonth} />
            <QuickAdd />
          </div>
        </motion.div>

        {/* Totalizer + Donut */}
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Totalizer
            expenses={expenses}
            previousTotal={previousTotal}
            isViewingCurrentMonth={isViewingCurrentMonth}
          />
          <DistributionDonut expenses={expenses} />
        </div>

        {/* Categorías + Lista */}
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <CategoryCards
            expenses={expenses}
            activeCategory={activeCategory}
            onSelect={setActiveCategory}
          />
          {isLoading ? (
            <div className="flex items-center justify-center rounded-xl border border-white/5 bg-card/40 p-12 backdrop-blur">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="size-2 animate-pulse rounded-full bg-theme-400" />
                Cargando gastos...
              </div>
            </div>
          ) : (
            <ExpensesList
              expenses={expenses}
              filterCategory={activeCategory}
              cards={cards}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          )}
        </div>
      </div>
    </Shell>
  );
}
