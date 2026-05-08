"use client";

import { useQuery } from "@tanstack/react-query";
import type { AssetType } from "@/types/database";
import type { QuoteMap, Sp500Series } from "@/lib/prices/types";

// Polling confirmado: 60s crypto, 120s US, 180s AR.
const POLL_MS: Record<AssetType, number> = {
  crypto: 60_000,
  stock_us: 120_000,
  cedear: 180_000,
  stock_ar: 180_000,
  bond_ar: 180_000,
  time_deposit: 0,
  usd_cash: 0,
  on: 180_000,
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

// Agrupa tickers por asset_type y hace un fetch por endpoint.
export function useQuotes(
  groups: { asset_type: AssetType; tickers: string[] }[],
) {
  // Dedup por (asset_type, ticker) y normalizamos uppercase.
  const normalized = groups
    .map((g) => ({
      asset_type: g.asset_type,
      tickers: Array.from(new Set(g.tickers.map((t) => t.toUpperCase()).filter(Boolean))),
    }))
    .filter((g) => g.tickers.length > 0);

  const key = normalized
    .map((g) => `${g.asset_type}:${g.tickers.join(",")}`)
    .join("|");

  return useQuery<QuoteMap>({
    queryKey: ["quotes", key],
    queryFn: async () => {
      const combined: QuoteMap = {};
      await Promise.all(
        normalized.map(async (g) => {
          let url: string;
          if (g.asset_type === "crypto") {
            url = `/api/prices/crypto?symbols=${g.tickers.join(",")}`;
          } else if (g.asset_type === "stock_us") {
            url = `/api/prices/stocks-us?symbols=${g.tickers.join(",")}`;
          } else if (
            g.asset_type === "cedear" ||
            g.asset_type === "stock_ar" ||
            g.asset_type === "bond_ar" ||
            g.asset_type === "on"
          ) {
            url = `/api/prices/ar?type=${g.asset_type}&symbols=${g.tickers.join(",")}`;
          } else {
            return;
          }
          try {
            const data = await fetchJson<QuoteMap>(url);
            Object.assign(combined, data);
          } catch {
            // swallow — UI muestra "—" para quotes faltantes
          }
        }),
      );
      return combined;
    },
    refetchInterval: () => {
      // Usamos el intervalo más agresivo entre los asset types pedidos.
      const intervals = normalized.map((g) => POLL_MS[g.asset_type]).filter((n) => n > 0);
      return intervals.length > 0 ? Math.min(...intervals) : false;
    },
    staleTime: 30_000,
  });
}

export type FxRatesResponse = {
  mep: number;
  ccl: number;
  blue: number;
  oficial: number;
  fetched_at: string;
};

export function useFxRates() {
  return useQuery<FxRatesResponse>({
    queryKey: ["fx-rates"],
    queryFn: async () => fetchJson<FxRatesResponse>("/api/prices/fx"),
    refetchInterval: 300_000,
    staleTime: 240_000,
  });
}

export function useSp500Series(fromDate: string | null) {
  return useQuery<Sp500Series>({
    queryKey: ["sp500", fromDate],
    queryFn: async () => {
      if (!fromDate) throw new Error("missing fromDate");
      return fetchJson<Sp500Series>(`/api/prices/sp500?from=${fromDate}`);
    },
    enabled: !!fromDate,
    staleTime: 3_600_000,
  });
}
