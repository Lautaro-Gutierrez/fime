export const CEDEAR_RATIOS: Record<string, number> = {
  // Principales índices / ETFs
  SPY: 60,
  QQQ: 20,
  DIA: 20,
  IWM: 20,
  EEM: 5,
  XLE: 2,
  XLF: 2,
  ARKK: 10,
  EWZ: 2,

  // Tecnológicas de gran capitalización
  AAPL: 10,
  MSFT: 30,
  GOOGL: 58,
  GOOG: 58,
  AMZN: 144,
  META: 24,
  TSLA: 15,
  NVDA: 240, // NVDA tuvo split en 2024, el ratio de BYMA actualizó a 240
  AMD: 10,
  INTC: 5,
  NFLX: 48,
  ADBE: 22,
  CRM: 18,
  ORCL: 3,
  CSCO: 5,

  // Comercio electrónico y Fintech
  MELI: 60,
  PYPL: 24,
  V: 18,
  MA: 33,
  BABA: 9,
  JD: 2,

  // Consumo masivo y retail
  KO: 5,
  PEP: 6,
  PG: 5,
  WMT: 18, // WMT split en 2024
  MCD: 18,
  NKE: 6,
  DIS: 12,
  HD: 12,
  SBUX: 4,
  COST: 24,

  // Salud
  JNJ: 15,
  PFE: 2,
  UNH: 33,
  ABBV: 10,
  MRK: 5,
  LLY: 42,

  // Bancos y finanzas
  JPM: 15,
  BAC: 2,
  C: 3,
  WFC: 5,
  GS: 11,
  MS: 5,
  AXP: 5,
  BRKB: 11,

  // Energía e industria
  XOM: 5,
  CVX: 8,
  BA: 6,
  CAT: 10,
  GE: 8,
  MMM: 6,
  UNP: 10,

  // Minería y Materiales
  GOLD: 1,
  VALE: 2,
  BHP: 2,
  HMY: 1,
  RIO: 2,
  PAAS: 1,

  // Telecomunicaciones
  T: 3,
  VZ: 2,

  // Viajes y Transporte
  UBER: 6,
  ABNB: 15,
  BKNG: 150, // Booking
  DAL: 3, // Delta Airlines

  // Cripto relacionadas
  COIN: 15,
  MSTR: 50,
};

/**
 * Obtiene el ratio de conversión para un ticker dado.
 * @param ticker Símbolo del activo (ej: "AAPL")
 * @returns El ratio de conversión si se encuentra, o null si no se conoce.
 */
export function getCedearRatio(ticker: string): number | null {
  const cleanTicker = ticker.trim().toUpperCase();
  return CEDEAR_RATIOS[cleanTicker] || null;
}
