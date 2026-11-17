import type { Quote, QuoteMap, Sp500Point, Sp500Series } from "./types";

// Docs: https://finnhub.io/docs/api
// Free tier: 60 req/min. Key en FINNHUB_API_KEY (server-side only).

const FINNHUB_BASE = "https://finnhub.io/api/v1";

function getApiKey(): string {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error("FINNHUB_API_KEY no está configurada");
  return key;
}

type FinnhubQuote = {
  c: number;  // current price
  d: number | null;  // change
  dp: number | null; // percent change
  h: number; // high
  l: number; // low
  o: number; // open
  pc: number; // previous close
  t: number; // timestamp
};

export async function getStockUsQuote(ticker: string): Promise<Quote | null> {
  const key = getApiKey();
  const url = `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(ticker.toUpperCase())}&token=${key}`;

  const res = await fetch(url, {
    next: { revalidate: 120 },
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`finnhub error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as FinnhubQuote;
  if (!data || !data.c) return null;

  const quote: Quote = {
    symbol: ticker.toUpperCase(),
    price: data.c,
    currency: "USD",
    source: "finnhub",
    fetched_at: new Date().toISOString(),
  };
  if (data.dp !== null && data.dp !== undefined) {
    quote.change_pct = data.dp;
  }
  return quote;
}

export async function getStockUsQuotes(tickers: string[]): Promise<QuoteMap> {
  if (tickers.length === 0) return {};
  // Finnhub no tiene batch endpoint en tier free → paralelizamos con límite.
  const unique = Array.from(new Set(tickers.map((t) => t.toUpperCase())));
  const results = await Promise.allSettled(unique.map((t) => getStockUsQuote(t)));
  const out: QuoteMap = {};
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) {
      out[unique[i]] = r.value;
    }
  });
  return out;
}

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
    }>;
    error?: { description?: string } | null;
  };
};

// S&P 500 histórico (^GSPC) vía Yahoo Finance chart API (gratuita y sin plan pago).
// Finnhub /stock/candle devuelve 403 en el tier gratuito.
export async function getSp500Series(fromDate: string): Promise<Sp500Series> {
  const parsedFrom = Date.parse(`${fromDate}T00:00:00Z`);
  const period1 = Number.isFinite(parsedFrom)
    ? Math.floor(parsedFrom / 1000)
    : Math.floor((Date.now() - 365 * 86400 * 1000) / 1000);
  const period2 = Math.floor(Date.now() / 1000) + 86400;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d&period1=${period1}&period2=${period2}`;

  const res = await fetch(url, {
    next: { revalidate: 3600 },
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!res.ok) {
    throw new Error(`yahoo chart error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as YahooChartResponse;
  const result = data.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];

  const byDate = new Map<string, number>();
  for (let i = 0; i < timestamps.length; i++) {
    const ts = timestamps[i];
    const close = closes[i];
    if (typeof ts !== "number" || typeof close !== "number" || !Number.isFinite(close)) {
      continue;
    }
    const date = new Date(ts * 1000).toISOString().slice(0, 10);
    byDate.set(date, close);
  }

  const points: Sp500Point[] = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, close]) => ({ date, close }));

  return { points, fetched_at: new Date().toISOString() };
}
