import type { AssetType } from "@/types/database";
import type { Investment } from "@/hooks/use-investments";
import type { InitialPosition } from "@/hooks/use-initial-positions";
import type { QuoteMap } from "@/lib/prices/types";
import { getCedearRatio } from "@/lib/portfolio/cedear-ratios";

function adjustCedearInvestment(tx: Investment): Investment {
  if (tx.asset_type !== "cedear" || !tx.ticker) return tx;
  const currentRatio = getCedearRatio(tx.ticker);
  const txRatio = tx.metadata && tx.metadata.ratio ? parseFloat(String(tx.metadata.ratio)) : null;
  const hasValidRatio = txRatio !== null && !isNaN(txRatio) && txRatio > 0;

  if (currentRatio && hasValidRatio && currentRatio !== txRatio) {
    const factor = currentRatio / txRatio;
    return {
      ...tx,
      quantity: tx.quantity * factor,
      price_usd: tx.price_usd !== null ? tx.price_usd / factor : null,
    };
  }
  return tx;
}

function adjustCedearInitialPosition(ip: InitialPosition): InitialPosition {
  if (ip.asset_type !== "cedear" || !ip.ticker) return ip;
  const currentRatio = getCedearRatio(ip.ticker);
  const ipRatio = ip.metadata && ip.metadata.ratio ? parseFloat(String(ip.metadata.ratio)) : null;
  const hasValidRatio = ipRatio !== null && !isNaN(ipRatio) && ipRatio > 0;

  if (currentRatio && hasValidRatio && currentRatio !== ipRatio) {
    const factor = currentRatio / ipRatio;
    return {
      ...ip,
      quantity: ip.quantity * factor,
      avg_cost_usd: ip.avg_cost_usd / factor,
    };
  }
  return ip;
}

// Método de costeo: Average Cost (confirmado en M2).
// Excluimos bond_ar de V1 (pendiente para V2 con residual factor).

export type Holding = {
  key: string;
  asset_type: AssetType;
  ticker: string | null;
  label: string;
  quantity: number;
  avg_cost_usd: number;
  cost_basis_usd: number;
  realized_pnl_usd: number;
  metadata: Record<string, unknown>;
};

export type ValuedHolding = Holding & {
  current_price_usd: number | null;
  current_value_usd: number;
  unrealized_pnl_pct: number | null;
  change_24h_pct: number | null;
  weight_pct: number;
};

export function positionKey(assetType: AssetType, ticker: string | null): string {
  if (assetType === "usd_cash") return "usd_cash";
  if (assetType === "time_deposit") return "time_deposit";
  return `${assetType}:${(ticker ?? "").toUpperCase()}`;
}

function positionLabel(assetType: AssetType, ticker: string | null): string {
  if (assetType === "usd_cash") return "USD Cash";
  if (assetType === "time_deposit") return "Plazo Fijo";
  return (ticker ?? "").toUpperCase();
}

/**
 * Cantidad efectiva: para ONs, los precios y costos se expresan cada 100 VN.
 */
export function effectiveQty(assetType: AssetType, quantity: number): number {
  return assetType === "on" ? quantity / 100 : quantity;
}

// Costo USD de una tx (tanto buy/deposit como sell/withdraw usan la misma fórmula para "valor USD").
function usdValueOfTx(tx: Investment): number {
  if (tx.asset_type === "usd_cash") return tx.quantity;
  if (tx.asset_type === "time_deposit") {
    const currency = String(tx.metadata?.currency ?? "ARS").toUpperCase();
    if (currency === "USD") return tx.quantity;
    if (tx.fx_rate && tx.fx_rate > 0) return tx.quantity / tx.fx_rate;
    return 0;
  }
  return effectiveQty(tx.asset_type, tx.quantity) * (tx.price_usd ?? 0);
}

/**
 * Calcula holdings actuales aplicando initial_positions + todas las txs con Average Cost.
 * Retorna solo posiciones con quantity > 0 (filtra las cerradas).
 */
export function computeHoldings(
  initialPositions: InitialPosition[],
  investments: Investment[],
): Holding[] {
  const adjustedIps = initialPositions.map(adjustCedearInitialPosition);
  const adjustedTxs = investments.map(adjustCedearInvestment);

  const map = new Map<string, Holding>();

  // 1) Seed con initial_positions.
  for (const ip of adjustedIps) {
    if (ip.asset_type === "bond_ar") continue; // V1 skip (mantener excluido bond_ar, incluir 'on')
    const key = positionKey(ip.asset_type, ip.ticker);
    const existing = map.get(key);
    if (existing) {
      const newQty = existing.quantity + ip.quantity;
      const newCost = existing.cost_basis_usd + effectiveQty(ip.asset_type, ip.quantity) * ip.avg_cost_usd;
      existing.quantity = newQty;
      existing.cost_basis_usd = newCost;
      existing.avg_cost_usd = newQty > 0 ? newCost / effectiveQty(ip.asset_type, newQty) : 0;
      existing.metadata = { ...existing.metadata, ...ip.metadata };
    } else {
      map.set(key, {
        key,
        asset_type: ip.asset_type,
        ticker: ip.ticker,
        label: positionLabel(ip.asset_type, ip.ticker),
        quantity: ip.quantity,
        avg_cost_usd: ip.avg_cost_usd,
        cost_basis_usd: effectiveQty(ip.asset_type, ip.quantity) * ip.avg_cost_usd,
        realized_pnl_usd: 0,
        metadata: { ...ip.metadata },
      });
    }
  }

  // 2) Aplicar txs cronológicamente.
  const sorted = [...adjustedTxs].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return a.created_at.localeCompare(b.created_at);
  });

  for (const tx of sorted) {
    if (tx.asset_type === "bond_ar") continue; // V1 skip (incluir 'on')

    const key = positionKey(tx.asset_type, tx.ticker);
    const existing: Holding = map.get(key) ?? {
      key,
      asset_type: tx.asset_type,
      ticker: tx.ticker,
      label: positionLabel(tx.asset_type, tx.ticker),
      quantity: 0,
      avg_cost_usd: 0,
      cost_basis_usd: 0,
      realized_pnl_usd: 0,
      metadata: { ...(tx.metadata ?? {}) },
    };

    const valueUsd = usdValueOfTx(tx);

    if (tx.tx_type === "buy" || tx.tx_type === "deposit") {
      const newQty = existing.quantity + tx.quantity;
      const newCost = existing.cost_basis_usd + valueUsd + tx.fees_usd;
      existing.quantity = newQty;
      existing.cost_basis_usd = newCost;
      existing.avg_cost_usd = newQty > 0 ? newCost / effectiveQty(tx.asset_type, newQty) : 0;
      if (tx.metadata && Object.keys(tx.metadata).length > 0) {
        existing.metadata = { ...existing.metadata, ...tx.metadata };
      }
    } else if (tx.tx_type === "sell" || tx.tx_type === "withdraw") {
      const costRemoved = existing.avg_cost_usd * effectiveQty(tx.asset_type, tx.quantity);
      const pnl = valueUsd - costRemoved - tx.fees_usd;
      existing.realized_pnl_usd += pnl;
      existing.quantity = Math.max(0, existing.quantity - tx.quantity);
      existing.cost_basis_usd = Math.max(0, existing.cost_basis_usd - costRemoved);
      // avg_cost no cambia en sells (convención Average Cost)
    }

    map.set(key, existing);
  }

  // 3) Filtrar posiciones cerradas.
  return Array.from(map.values()).filter((h) => h.quantity > 1e-9);
}

/**
 * Valúa un holding usando quotes actuales + MEP para assets ARS-denominados.
 * Retorna null en current_price_usd si no hay quote disponible (caller muestra "—").
 */
export function valueHoldings(
  holdings: Holding[],
  quotes: QuoteMap,
  fxMep: number,
  fxCcl: number,
): ValuedHolding[] {
  const valued = holdings.map((h): Omit<ValuedHolding, "weight_pct"> => {
    const ticker = (h.ticker ?? "").toUpperCase();
    const quote = ticker ? quotes[ticker] : undefined;
    let priceUsd: number | null = null;
    let change24h: number | null = quote?.change_pct ?? null;

    if (h.asset_type === "crypto" || h.asset_type === "stock_us") {
      priceUsd = quote?.price ?? null;
    } else if (h.asset_type === "cedear") {
      if (quote?.price && fxCcl > 0) {
        priceUsd = quote.price / fxCcl;
      }
    } else if (h.asset_type === "on") {
      // ONs: cotizan en ARS por cada 100 VN, se convierten con MEP
      if (quote?.price && fxMep > 0) {
        priceUsd = quote.price / fxMep;  // precio por 100 VN en USD
      }
    } else if (h.asset_type === "stock_ar") {
      // Acciones AR: cotizan en ARS por unidad
      if (quote?.price && fxMep > 0) {
        priceUsd = quote.price / fxMep;
      }
    } else if (h.asset_type === "usd_cash") {
      priceUsd = 1;
      change24h = 0;
    } else if (h.asset_type === "time_deposit") {
      // V1: sin accrued interest. Valor = capital USD original.
      priceUsd = h.avg_cost_usd;
      change24h = 0;
    }

    const currentValue = priceUsd !== null ? effectiveQty(h.asset_type, h.quantity) * priceUsd : 0;
    const pnlPct =
      h.avg_cost_usd > 0 && priceUsd !== null
        ? ((priceUsd - h.avg_cost_usd) / h.avg_cost_usd) * 100
        : null;

    return {
      ...h,
      current_price_usd: priceUsd,
      current_value_usd: currentValue,
      unrealized_pnl_pct: pnlPct,
      change_24h_pct: change24h,
    };
  });

  const total = valued.reduce((s, h) => s + h.current_value_usd, 0);
  return valued.map((h) => ({
    ...h,
    weight_pct: total > 0 ? (h.current_value_usd / total) * 100 : 0,
  }));
}

/**
 * Totaliza el portfolio (valor USD + % unrealized ponderado por cost_basis).
 */
export function portfolioTotals(valued: ValuedHolding[]): {
  total_usd: number;
  cost_basis_usd: number;
  unrealized_pnl_pct: number | null;
  realized_pnl_usd: number;
} {
  const total_usd = valued.reduce((s, h) => s + h.current_value_usd, 0);
  const cost_basis_usd = valued.reduce((s, h) => s + h.cost_basis_usd, 0);
  const realized_pnl_usd = valued.reduce((s, h) => s + h.realized_pnl_usd, 0);
  const unrealized_pnl_pct =
    cost_basis_usd > 0 ? ((total_usd - cost_basis_usd) / cost_basis_usd) * 100 : null;
  return { total_usd, cost_basis_usd, unrealized_pnl_pct, realized_pnl_usd };
}

/**
 * Cashflow USD de una tx — capital externo que entra/sale del portfolio.
 * Buy/deposit = ingreso de capital (+), sell/withdraw = retiro de capital (−).
 * El TWR usa este valor para neutralizar movimientos de capital y aislar el
 * rendimiento real de los activos.
 */
export function txCashflowUsd(tx: Investment): number {
  const value = usdValueOfTx(tx);
  if (tx.tx_type === "buy" || tx.tx_type === "deposit") return value;
  if (tx.tx_type === "sell" || tx.tx_type === "withdraw") return -value;
  return 0;
}
