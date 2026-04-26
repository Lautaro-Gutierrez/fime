export type FxRates = {
  mep: number;
  ccl: number;
  blue: number;
  oficial: number;
  fetched_at: string;
};

// Quote genérico normalizado de cualquier fuente.
// price es SIEMPRE en la moneda nativa del asset:
//   - crypto / stock_us: USD
//   - cedear / stock_ar / bond_ar: ARS
// El caller decide si convertir a USD con fx.
export type Quote = {
  symbol: string;        // ticker canónico (uppercase)
  price: number;         // precio en moneda nativa
  change_pct?: number;   // % variación intradía (si disponible)
  currency: "USD" | "ARS";
  source: string;        // "coingecko" | "finnhub" | "data912"
  fetched_at: string;    // ISO
};

// Set de quotes indexado por symbol (para búsqueda O(1) en cliente).
export type QuoteMap = Record<string, Quote>;

// Snapshot de rendimiento del SP500 (para comparar contra el portfolio).
export type Sp500Point = {
  date: string;   // YYYY-MM-DD
  close: number;
};

export type Sp500Series = {
  points: Sp500Point[];
  fetched_at: string;
};
