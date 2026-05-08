"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  totalUsd: number;
  unrealizedPct: number | null;
  dailyPct: number | null;
  isFetching: boolean;
  onRefresh: () => void;
  holdingsCount?: number;
};

export function PortfolioHeader({
  totalUsd,
  unrealizedPct,
  dailyPct,
  isFetching,
  onRefresh,
  holdingsCount = 0,
}: Props) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const totalReturn = unrealizedPct ?? 0;
  const todayChange = dailyPct ?? 0;

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 glass-card rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl">
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm text-white/50 font-medium tracking-wide uppercase">
            Valor Total de Portfolio
          </p>
          <h1 className="text-5xl font-bold tracking-tight tabular-nums text-white">
            {formatCurrency(totalUsd)}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {unrealizedPct !== null && (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold tabular-nums ${
                totalReturn >= 0
                  ? "bg-violet-500/20 text-violet-400"
                  : "bg-rose-500/20 text-rose-400"
              }`}
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                {totalReturn >= 0 ? (
                  <path
                    d="M7 17L17 7M17 7H7M17 7V17"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <path
                    d="M7 7L17 17M17 17H7M17 17V7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
              {totalReturn >= 0 ? "+" : ""}
              {totalReturn.toFixed(2)}%
            </span>
          )}
          {dailyPct !== null && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 text-white/70 text-sm font-medium tabular-nums border border-white/10">
              Hoy {todayChange >= 0 ? "+" : ""}
              {todayChange.toFixed(2)}%
            </span>
          )}
        </div>

        <p className="text-sm text-white/40">
          {holdingsCount} {holdingsCount === 1 ? "posición activa" : "posiciones activas"}
        </p>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isFetching}
        className="bg-white/[0.03] border-white/[0.08] text-white/70 hover:bg-white/[0.06] hover:text-white hover:border-white/[0.12] transition-all"
      >
        <RefreshCw
          className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
        />
        {isFetching ? "Actualizando..." : "Actualizar"}
      </Button>
    </div>
  );
}
