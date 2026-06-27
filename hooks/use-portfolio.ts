"use client";

import { useCallback, useEffect, useId, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useInvestments } from "@/hooks/use-investments";
import { useInitialPositions } from "@/hooks/use-initial-positions";
import { useQuotes, useFxRates, useSp500Series } from "@/hooks/use-prices";
import {
  computeHoldings,
  valueHoldings,
  portfolioTotals,
  txCashflowUsd,
  type ValuedHolding,
} from "@/lib/portfolio/holdings";
import {
  computeTwr,
  sp500Returns,
  mergeReturnSeries,
  type SnapshotPoint,
  type ReturnPoint,
} from "@/lib/portfolio/twr";

export type PortfolioSnapshot = {
  portfolio_id: string;
  user_id: string;
  date: string;
  total_usd: number;
  cashflow_usd: number;
  sp500_close: number | null;
  created_at: string;
  updated_at: string;
};

const SNAPSHOTS_KEY = ["portfolio_snapshots"] as const;

function useSnapshots(portfolioId: string | "ALL") {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const channelId = useId();

  const query = useQuery<PortfolioSnapshot[]>({
    queryKey: [...SNAPSHOTS_KEY, portfolioId],
    queryFn: async () => {
      let q = supabase.from("portfolio_snapshots")
        .select("*")
        .order("date", { ascending: true });
      
      if (portfolioId !== "ALL") {
        q = q.eq("portfolio_id", portfolioId);
      }
      
      const { data, error } = await q;
      if (error) throw error;
      
      if (portfolioId === "ALL") {
        const snapshots = data as PortfolioSnapshot[];
        if (snapshots.length === 0) return [];

        // Obtener fechas únicas ordenadas y lista de IDs de portafolios
        const uniqueDates = Array.from(new Set(snapshots.map((s) => s.date))).sort();
        const portIds = Array.from(new Set(snapshots.map((s) => s.portfolio_id)));

        // Mapear snapshots por portfolio_id y fecha
        const snapMap: Record<string, Record<string, PortfolioSnapshot>> = {};
        snapshots.forEach((s) => {
          snapMap[s.portfolio_id] = snapMap[s.portfolio_id] || {};
          snapMap[s.portfolio_id][s.date] = s;
        });

        const lastKnownValue: Record<string, number> = {};
        const aggregated: PortfolioSnapshot[] = [];

        for (const date of uniqueDates) {
          let total_usd = 0;
          let cashflow_usd = 0;
          let sp500_close: number | null = null;
          const refSnap = snapshots.find((s) => s.date === date);

          for (const portId of portIds) {
            const snap = snapMap[portId]?.[date];
            if (snap) {
              const isFirstAppearance = lastKnownValue[portId] === undefined;
              lastKnownValue[portId] = snap.total_usd;
              total_usd += snap.total_usd;
              cashflow_usd += snap.cashflow_usd;
              
              if (snap.sp500_close !== null) {
                sp500_close = snap.sp500_close;
              }

              if (isFirstAppearance) {
                // Al introducir un nuevo portafolio a la serie consolidada, tratamos su saldo inicial
                // como un flujo de entrada de efectivo (cashflow_usd). Esto evita registrar una
                // ganancia ficticia en el cálculo de TWR del portafolio consolidado.
                cashflow_usd += snap.total_usd;
              }
            } else {
              // Si no hay snapshot este día, arrastramos el último valor conocido de este portafolio
              const lastVal = lastKnownValue[portId] || 0;
              total_usd += lastVal;
            }
          }

          aggregated.push({
            portfolio_id: "ALL",
            user_id: refSnap?.user_id || "",
            date,
            total_usd,
            cashflow_usd,
            sp500_close,
            created_at: refSnap?.created_at || "",
            updated_at: refSnap?.updated_at || "",
          });
        }

        return aggregated;
      }
      
      return data as PortfolioSnapshot[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`portfolio-snapshots-${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "portfolio_snapshots" },
        () => queryClient.invalidateQueries({ queryKey: SNAPSHOTS_KEY }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, channelId]);

  return query;
}

/**
 * Hook principal del módulo Portfolio.
 * Combina investments + initial_positions + quotes + fx → holdings valuados.
 * Además actualiza el snapshot del día y compone la serie TWR vs SP500.
 */
export function usePortfolio(portfolioId: string | "ALL" = "ALL") {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const investmentsQ = useInvestments();
  const initialQ = useInitialPositions();
  const fxQ = useFxRates();
  const snapshotsQ = useSnapshots(portfolioId);

  const investments = useMemo(() => {
    const all = investmentsQ.data ?? [];
    if (portfolioId === "ALL") return all;
    return all.filter((tx) => tx.portfolio_id === portfolioId);
  }, [investmentsQ.data, portfolioId]);

  const initialPositions = useMemo(() => {
    const all = initialQ.data ?? [];
    if (portfolioId === "ALL") return all;
    return all.filter((ip) => ip.portfolio_id === portfolioId);
  }, [initialQ.data, portfolioId]);

  // Holdings derivados (sin precios todavía — solo qty, avg_cost).
  const holdings = useMemo(
    () => computeHoldings(initialPositions, investments),
    [initialPositions, investments],
  );

  // Agrupación de tickers por asset_type (para fetch de quotes eficiente).
  const quoteGroups = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const h of holdings) {
      if (!h.ticker) continue;
      if (h.asset_type === "time_deposit" || h.asset_type === "usd_cash") continue;
      const set = map.get(h.asset_type) ?? new Set<string>();
      set.add(h.ticker.toUpperCase());
      map.set(h.asset_type, set);
    }
    return Array.from(map.entries()).map(([asset_type, tickers]) => ({
      asset_type: asset_type as Parameters<typeof useQuotes>[0][number]["asset_type"],
      tickers: Array.from(tickers),
    }));
  }, [holdings]);

  const quotesQ = useQuotes(quoteGroups);
  const quotes = quotesQ.data ?? {};
  const fxMep = fxQ.data?.mep ?? 0;
  const fxCcl = fxQ.data?.ccl ?? 0;

  // Holdings valuados con precios actuales.
  const valued: ValuedHolding[] = useMemo(
    () => valueHoldings(holdings, quotes, fxMep, fxCcl),
    [holdings, quotes, fxMep, fxCcl],
  );

  const totals = useMemo(() => portfolioTotals(valued), [valued]);

  // Snapshots + TWR + SP500.
  const snapshots = snapshotsQ.data ?? [];
  const baseDate = snapshots[0]?.date ?? null;
  const sp500Q = useSp500Series(baseDate);

  const returnSeries: ReturnPoint[] = useMemo(() => {
    if (snapshots.length === 0) return [];
    const snapPoints: SnapshotPoint[] = snapshots.map((s) => ({
      date: s.date,
      total_usd: s.total_usd,
      cashflow_usd: s.cashflow_usd,
    }));
    const twr = computeTwr(snapPoints);
    const sp = sp500Q.data?.points ?? [];
    const spReturns = sp500Returns(sp, snapshots[0]?.date ?? "");
    return mergeReturnSeries(twr, spReturns);
  }, [snapshots, sp500Q.data]);

  // Upsert del snapshot de hoy (forward-looking, sin backfill).
  //
  // Guardas: (1) todas las queries base deben haber cargado, (2) si hay
  // posiciones, los quotes también (sino el total sería 0/inválido y
  // poluciona la serie), (3) no guardamos totales <= 0.
  useEffect(() => {
    if (!investmentsQ.isSuccess || !initialQ.isSuccess || !fxQ.isSuccess) return;
    const hasPositions = investments.length > 0 || initialPositions.length > 0;
    if (!hasPositions) return;
    if (!quotesQ.isSuccess) return;
    if (!(totals.total_usd > 0)) return;

    const today = new Date().toISOString().slice(0, 10);
    const todayCashflow = investments
      .filter((tx) => tx.date === today)
      .reduce((s, tx) => s + txCashflowUsd(tx), 0);

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      if (portfolioId === "ALL") return; // No upsert en la vista consolidada
      await supabase
        .from("portfolio_snapshots").upsert(
        {
          portfolio_id: portfolioId,
          user_id: user.id,
          date: today,
          total_usd: totals.total_usd,
          cashflow_usd: todayCashflow,
        },
        { onConflict: "portfolio_id,date" },
      );
    })().catch((err) => console.error("Failed to upsert snapshot:", err));
  }, [
    supabase,
    portfolioId,
    totals.total_usd,
    investments,
    initialPositions.length,
    investmentsQ.isSuccess,
    initialQ.isSuccess,
    fxQ.isSuccess,
    quotesQ.isSuccess,
  ]);

  // Reset: borra todo el historial de snapshots del usuario. Útil para
  // limpiar datos polucionados por bugs previos (ej. parseNumber ×100).
  const resetHistory = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      
      let q = supabase.from("portfolio_snapshots").delete().eq("user_id", user.id);
      if (portfolioId !== "ALL") {
        q = q.eq("portfolio_id", portfolioId);
      }
      await q;
      
      await queryClient.invalidateQueries({ queryKey: SNAPSHOTS_KEY });
    } catch (err) {
      console.error("Failed to reset history:", err);
    }
  }, [supabase, portfolioId, queryClient]);

  return {
    holdings: valued,
    totals,
    returnSeries,
    snapshots,
    fxMep,
    fxCcl,
    isLoading:
      investmentsQ.isLoading ||
      initialQ.isLoading ||
      fxQ.isLoading ||
      quotesQ.isLoading,
    isFetchingPrices: quotesQ.isFetching,
    refetchPrices: () => quotesQ.refetch(),
    hasPriceErrors: quotesQ.isError,
    resetHistory,
  };
}
