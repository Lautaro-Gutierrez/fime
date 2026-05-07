"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Shell } from "@/components/layout/shell";
import { FxStrip } from "@/components/inversiones/fx-strip";
import { NewTransactionDialog } from "@/components/inversiones/new-transaction-dialog";
import { TransactionsList } from "@/components/inversiones/transactions-list";
import { Filters, type FilterState } from "@/components/inversiones/filters";
import { useInvestments } from "@/hooks/use-investments";

export default function InversionesPage() {
  const [filters, setFilters] = useState<FilterState>({
    assetTypes: [],
    ticker: "",
  });

  const { data: investments = [], isLoading } = useInvestments();

  const filtered = useMemo(() => {
    return investments.filter((inv) => {
      if (filters.assetTypes.length > 0 && !filters.assetTypes.includes(inv.asset_type)) {
        return false;
      }
      if (filters.ticker.trim()) {
        const needle = filters.ticker.trim().toUpperCase();
        if (!inv.ticker?.toUpperCase().includes(needle)) return false;
      }
      return true;
    });
  }, [investments, filters]);

  const totalOps = investments.length;
  const filteredCount = filtered.length;

  return (
    <Shell>
      <div className="relative flex flex-col gap-6 p-4 pb-10 sm:p-6 md:p-8">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[380px] bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.12),transparent_80%)]" />

        {/* Hero header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-300/80">
              Inversiones
            </span>
            <h1 className="bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-3xl font-bold uppercase tracking-tight text-transparent sm:text-4xl">
              Bitácora
            </h1>
            <p className="text-sm text-muted-foreground">
              Operaciones en orden cronológico · todo normalizado en USD
            </p>
          </div>
          <NewTransactionDialog />
        </motion.div>

        {/* FX strip */}
        <FxStrip />

        {/* Filtros */}
        <Filters state={filters} onChange={setFilters} />

        {/* Contador */}
        {totalOps > 0 && (
          <motion.div
            key={`${filteredCount}-${totalOps}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 px-1 text-xs"
          >
            <div className="flex items-center gap-2 rounded-full border border-white/5 bg-card/40 px-3 py-1 backdrop-blur">
              <span className="size-1.5 rounded-full bg-theme-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="font-mono tabular-nums text-muted-foreground">
                {filteredCount === totalOps
                  ? `${totalOps} ${totalOps === 1 ? "operación" : "operaciones"}`
                  : `${filteredCount} de ${totalOps} operaciones`}
              </span>
            </div>
          </motion.div>
        )}

        {/* Lista */}
        {isLoading ? (
          <div className="flex items-center justify-center rounded-3xl border border-white/5 bg-card/40 p-12 backdrop-blur">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="size-2 animate-pulse rounded-full bg-indigo-400" />
              Cargando operaciones...
            </div>
          </div>
        ) : (
          <TransactionsList investments={filtered} />
        )}
      </div>
    </Shell>
  );
}
