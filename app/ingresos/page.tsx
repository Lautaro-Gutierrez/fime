"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Sliders } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/components/layout/shell";
import { MonthSelector } from "@/components/ingresos/month-selector";
import { QuickAddIncome } from "@/components/ingresos/quick-add";
import { Totalizer } from "@/components/ingresos/totalizer";
import { ForecastBar } from "@/components/ingresos/forecast-bar";
import { WaterfallSankey } from "@/components/ingresos/waterfall-sankey";
import { DistributionStep } from "@/components/ingresos/distribution-step";
import { IncomesList } from "@/components/ingresos/incomes-list";
import { useIncomes, useUpdateIncome } from "@/hooks/use-incomes";
import { createClient } from "@/lib/supabase/client";
import {
  firstOfMonth,
  lastOfMonth,
  monthKey,
  toISODate,
} from "@/lib/format";

export default function IngresosPage() {
  const [month, setMonth] = useState(() => firstOfMonth(new Date()));
  const [editingDistribution, setEditingDistribution] = useState(false);
  const [isSavingDist, setIsSavingDist] = useState(false);

  const { data: incomes = [], isLoading } = useIncomes(month);
  const updateIncome = useUpdateIncome();

  const totalArs = useMemo(
    () => incomes.reduce((s, i) => s + Number(i.amount_ars), 0),
    [incomes],
  );



  const compositeDistribution = useMemo(() => {
    if (totalArs === 0) return { fixed_pct: 50, variable_pct: 30, invest_pct: 10, save_pct: 10 };
    return incomes.reduce(
      (acc, i) => {
        if (!i.distribution) return acc;
        const w = Number(i.amount_ars) / totalArs;
        acc.fixed_pct += i.distribution.fixed_pct * w;
        acc.variable_pct += i.distribution.variable_pct * w;
        acc.invest_pct += i.distribution.invest_pct * w;
        acc.save_pct += i.distribution.save_pct * w;
        return acc;
      },
      { fixed_pct: 0, variable_pct: 0, invest_pct: 0, save_pct: 0 }
    );
  }, [incomes, totalArs]);

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

  const handleBulkUpdateDistribution = async (dist: { fixed_pct: number, variable_pct: number, invest_pct: number, save_pct: number }) => {
    setIsSavingDist(true);
    try {
      await Promise.all(
        incomes.map((inc) => 
          updateIncome.mutateAsync({ id: inc.id, patch: { distribution: dist } })
        )
      );
      toast.success("Distribución de ingresos actualizada");
      setEditingDistribution(false);
    } catch (error) {
      toast.error("Hubo un error al guardar la distribución");
    } finally {
      setIsSavingDist(false);
    }
  };

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

        {/* Sankey grande (Teórico) + Lista */}
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-6 backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-lime-400" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Distribución Teórica
                </p>
              </div>
              {totalArs > 0 && !editingDistribution && (
                <button
                  onClick={() => setEditingDistribution(true)}
                  className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-white/10 hover:text-foreground"
                  aria-label="Modificar distribución total"
                >
                  <Sliders className="size-3.5" />
                </button>
              )}
            </div>
            {totalArs === 0 ? (
              <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                Sin ingresos este mes
              </div>
            ) : editingDistribution ? (
              <div className="-mx-6 -mb-6">
                <DistributionStep
                  amountArs={totalArs}
                  initial={compositeDistribution}
                  onBack={() => setEditingDistribution(false)}
                  onConfirm={handleBulkUpdateDistribution}
                  isSaving={isSavingDist}
                />
              </div>
            ) : (
              <WaterfallSankey
                amountArs={totalArs}
                distribution={compositeDistribution}
              />
            )}
          </div>
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
            />
          )}
        </div>
      </div>
    </Shell>
  );
}
