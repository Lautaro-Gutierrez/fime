import type { Quote, QuoteMap } from "./types";

// Endpoint público sin API key. Rate limit: ~10-30 req/min (generoso para nuestro uso).
// Docs: https://www.coingecko.com/api/documentation
//
// Para pricing usamos /coins/markets (devuelve price + 24h change en una sola llamada).
// Requiere mapear ticker → coingecko id (bitcoin, ethereum, etc.).

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

// Mapa ticker → coingecko id. Cubre los majors y se expande según uso.
// Ampliar acá cuando el user registre una crypto nueva.
const TICKER_TO_ID: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  USDT: "tether",
  USDC: "usd-coin",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  MATIC: "matic-network",
  LINK: "chainlink",
  TRX: "tron",
  LTC: "litecoin",
  BCH: "bitcoin-cash",
  ATOM: "cosmos",
  NEAR: "near",
  ARB: "arbitrum",
  OP: "optimism",
  UNI: "uniswap",
  AAVE: "aave",
  SUI: "sui",
  APT: "aptos",
  HBAR: "hedera-hashgraph",
  TON: "the-open-network",
};

type CoingeckoMarket = {
  id: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number | null;
};

export function resolveCoingeckoId(ticker: string): string | null {
  const upper = ticker.toUpperCase();
  return TICKER_TO_ID[upper] ?? null;
}

export async function getCryptoQuotes(tickers: string[]): Promise<QuoteMap> {
  if (tickers.length === 0) return {};

  const pairs = tickers
    .map((t) => [t.toUpperCase(), resolveCoingeckoId(t)] as const)
    .filter((p): p is readonly [string, string] => p[1] !== null);

  if (pairs.length === 0) return {};

  const ids = pairs.map(([, id]) => id).join(",");
  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h`;

  const res = await fetch(url, {
    next: { revalidate: 60 },
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`coingecko error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as CoingeckoMarket[];
  const byId = new Map(data.map((d) => [d.id, d]));
  const now = new Date().toISOString();

  const out: QuoteMap = {};
  for (const [ticker, id] of pairs) {
    const entry = byId.get(id);
    if (!entry) continue;
    const quote: Quote = {
      symbol: ticker,
      price: entry.current_price,
      currency: "USD",
      source: "coingecko",
      fetched_at: now,
    };
    if (entry.price_change_percentage_24h !== null) {
      quote.change_pct = entry.price_change_percentage_24h;
    }
    out[ticker] = quote;
  }
  return out;
}
