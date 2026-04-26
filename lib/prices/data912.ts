import type { Quote, QuoteMap } from "./types";
import type { AssetType } from "@/types/database";

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
};

async function fetchEndpoint(endpoint: string): Promise<Data912Entry[]> {
  const url = `${DATA912_BASE}/${endpoint}`;
  const res = await fetch(url, {
    next: { revalidate: 180 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`data912 error (${endpoint}): ${res.status}`);
  }
  const data = (await res.json()) as Data912Entry[];
  return Array.isArray(data) ? data : [];
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

// Obtiene quotes de un asset_type AR dado (cedear | stock_ar | bond_ar).
// Si `tickers` está vacío, devuelve todos los disponibles.
export async function getArQuotes(
  assetType: "cedear" | "stock_ar" | "bond_ar",
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

  return out;
}
