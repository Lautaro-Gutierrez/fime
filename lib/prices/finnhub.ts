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

type FinnhubCandle = {
  c: number[]; // close
  t: number[]; // timestamp (unix seconds)
  s: "ok" | "no_data";
};

// SP500 via ETF SPY (proxy 1:1, soportado en tier free).
// Devuelve cierres diarios desde `fromDate` hasta hoy.
export async function getSp500Series(fromDate: string): Promise<Sp500Series> {
  const key = getApiKey();
  const from = Math.floor(new Date(fromDate).getTime() / 1000);
  const to = Math.floor(Date.now() / 1000);
  const url = `${FINNHUB_BASE}/stock/candle?symbol=SPY&resolution=D&from=${from}&to=${to}&token=${key}`;

  const res = await fetch(url, {
    next: { revalidate: 3600 },
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`finnhub candle error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as FinnhubCandle;
  const points: Sp500Point[] = [];
  if (data.s === "ok" && Array.isArray(data.c) && Array.isArray(data.t)) {
    for (let i = 0; i < data.c.length; i++) {
      const ts = data.t[i];
      const close = data.c[i];
      if (typeof ts !== "number" || typeof close !== "number") continue;
      const date = new Date(ts * 1000).toISOString().slice(0, 10);
      points.push({ date, close });
    }
  }
  return { points, fetched_at: new Date().toISOString() };
}
