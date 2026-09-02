import type { Quote, QuoteMap } from "./types";
import type { AssetType } from "@/types/database";
import { getCedearRatio, CEDEAR_RATIOS } from "../portfolio/cedear-ratios";
import { getFxRates } from "./dolarapi";
import { getStockUsQuote } from "./finnhub";

// data912.com — API pública argentina. Sin key, sin auth.
// Endpoints:
//   /live/arg_stocks   → acciones AR (panel líder + general)
//   /live/arg_cedears  → CEDEARs
//   /live/arg_bonds    → bonos soberanos
//   /live/arg_notes    → letras / notas
//   /live/arg_corp     → corporativos
//
// Shape típico:
//   { symbol: "GGAL", px_bid, px_ask, c: lastPrice, pct_change, ... }

const DATA912_BASE = "https://data912.com/live";

type Data912Entry = {
  symbol: string;
  c?: number;           // último precio
  close?: number;       // algunos endpoints usan `close`
  px_ask?: number;
  px_bid?: number;
  pct_change?: number;
  variation?: number;   // algunos endpoints usan `variation`
};

const ENDPOINT_BY_ASSET: Record<
  Exclude<AssetType, "crypto" | "stock_us" | "time_deposit" | "usd_cash">,
  string[]
> = {
  cedear: ["arg_cedears"],
  stock_ar: ["arg_stocks"],
  bond_ar: ["arg_bonds", "arg_notes"],
  on: ["arg_corp"],
};

async function fetchEndpoint(endpoint: string): Promise<Data912Entry[]> {
  try {
    const url = `${DATA912_BASE}/${endpoint}`;
    const res = await fetch(url, {
      next: { revalidate: 180 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return [];
    }
    const data = (await res.json()) as Data912Entry[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function normalize(entry: Data912Entry): number | null {
  if (typeof entry.c === "number") return entry.c;
  if (typeof entry.close === "number") return entry.close;
  if (typeof entry.px_ask === "number" && typeof entry.px_bid === "number") {
    return (entry.px_ask + entry.px_bid) / 2;
  }
  return null;
}

function changePct(entry: Data912Entry): number | undefined {
  if (typeof entry.pct_change === "number") return entry.pct_change;
  if (typeof entry.variation === "number") return entry.variation;
  return undefined;
}

// Obtiene quotes de un asset_type AR dado (cedear | stock_ar | bond_ar | on).
// Si `tickers` está vacío, devuelve todos los disponibles.
export async function getArQuotes(
  assetType: "cedear" | "stock_ar" | "bond_ar" | "on",
  tickers: string[] = [],
): Promise<QuoteMap> {
  const endpoints = ENDPOINT_BY_ASSET[assetType];
  const all = (await Promise.all(endpoints.map(fetchEndpoint))).flat();

  const wanted = new Set(tickers.map((t) => t.toUpperCase()));
  const now = new Date().toISOString();
  const out: QuoteMap = {};

  for (const entry of all) {
    if (!entry.symbol) continue;
    const symbol = entry.symbol.toUpperCase();
    if (wanted.size > 0 && !wanted.has(symbol)) continue;
    const price = normalize(entry);
    if (price === null || price <= 0) continue;
    const quote: Quote = {
      symbol,
      price,
      currency: "ARS",
      source: "data912",
      fetched_at: now,
    };
    const chg = changePct(entry);
    if (chg !== undefined) quote.change_pct = chg;
    out[symbol] = quote;
  }

  // Fallback especial para CEDEARs:
  // Si un CEDEAR no cotizó en BYMA hoy o data912 no lo incluye en arg_cedears,
  // buscamos el subyacente en USA (data912 usa_stocks / usa_adrs / Finnhub)
  // y lo convertimos a ARS usando el CCL y su ratio de conversión.
  if (assetType === "cedear") {
    const missing = wanted.size > 0
      ? Array.from(wanted).filter((t) => !out[t])
      : Object.keys(CEDEAR_RATIOS).filter((t) => !out[t]);

    if (missing.length > 0) {
      try {
        const [fx, usaStocks, usaAdrs] = await Promise.all([
          getFxRates().catch(() => ({ ccl: 1590, mep: 1530, blue: 1540, oficial: 1500, fetched_at: now })),
          fetchEndpoint("usa_stocks").catch(() => []),
          fetchEndpoint("usa_adrs").catch(() => []),
        ]);

        const ccl = fx.ccl > 0 ? fx.ccl : (fx.mep > 0 ? fx.mep : 1590);
        const usaCombined = [...usaStocks, ...usaAdrs];

        for (const entry of usaCombined) {
          if (!entry.symbol) continue;
          const sym = entry.symbol.toUpperCase();
          if (missing.includes(sym) && !out[sym]) {
            const usPrice = normalize(entry);
            if (usPrice !== null && usPrice > 0) {
              const ratio = getCedearRatio(sym) || 1;
              const cedearPriceArs = (usPrice / ratio) * ccl;
              out[sym] = {
                symbol: sym,
                price: cedearPriceArs,
                currency: "ARS",
                source: "data912/usa",
                fetched_at: now,
              };
              const chg = changePct(entry);
              if (chg !== undefined) out[sym].change_pct = chg;
            }
          }
        }

        // Si todavía faltan (ej. ETFs como SPY o activos que solo están en Finnhub),
        // consultamos Finnhub con la key configurada.
        const stillMissing = missing.filter((s) => !out[s]);
        if (stillMissing.length > 0) {
          await Promise.allSettled(
            stillMissing.map(async (sym) => {
              try {
                const fh = await getStockUsQuote(sym);
                if (fh && fh.price > 0) {
                  const ratio = getCedearRatio(sym) || 1;
                  const cedearPriceArs = (fh.price / ratio) * ccl;
                  out[sym] = {
                    symbol: sym,
                    price: cedearPriceArs,
                    currency: "ARS",
                    source: "finnhub",
                    fetched_at: now,
                  };
                  if (fh.change_pct !== undefined) {
                    out[sym].change_pct = fh.change_pct;
                  }
                }
              } catch {
                // Ignore per-symbol finnhub failures
              }
            }),
          );
        }
      } catch (err) {
        console.warn("Failed to fetch CEDEAR fallback quotes:", err);
      }
    }
  }

  return out;
}
