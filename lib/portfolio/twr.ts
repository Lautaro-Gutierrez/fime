import type { Sp500Point } from "@/lib/prices/types";

export type SnapshotPoint = {
  date: string;           // YYYY-MM-DD
  total_usd: number;      // valor total al cierre del día
  cashflow_usd: number;   // dinero que entró (+) / salió (−) ese día
};

export type ReturnPoint = {
  date: string;
  portfolio_pct: number;  // TWR acumulado %
  sp500_pct: number | null;
};

/**
 * Time-Weighted Return acumulado.
 *
 * Fórmula por período (día D):
 *   r_D = (total_end_D - cashflow_D - total_end_D-1) / total_end_D-1
 *
 *   TWR acumulado = Π (1 + r_i) - 1, expresado en %
 *
 * El cashflow del día NO cuenta como rendimiento (es capital externo).
 * Asume que los cashflows ocurren al inicio del día (aprox. conservadora).
 */
export function computeTwr(snapshots: SnapshotPoint[]): Array<{ date: string; twr_pct: number }> {
  // Descartamos snapshots inválidos (total <= 0 o NaN). Esto evita que un
  // snapshot polucionado — ej. guardado antes de que carguen los quotes —
  // corrompa toda la cadena de retornos acumulados.
  const valid = snapshots.filter(
    (s) => isFinite(s.total_usd) && s.total_usd > 0,
  );
  const sorted = [...valid].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return [];

  const out: Array<{ date: string; twr_pct: number }> = [];
  let cumulative = 1;
  let prevTotal: number | null = null;

  for (const s of sorted) {
    if (prevTotal === null) {
      out.push({ date: s.date, twr_pct: 0 });
      prevTotal = s.total_usd;
      continue;
    }
    const denom = prevTotal;
    if (denom > 0) {
      const r = (s.total_usd - s.cashflow_usd - denom) / denom;
      cumulative *= 1 + r;
    }
    out.push({ date: s.date, twr_pct: (cumulative - 1) * 100 });
    prevTotal = s.total_usd;
  }

  return out;
}

/**
 * Serie del SP500 normalizada a % vs fecha base (primera disponible ≥ baseDate).
 */
export function sp500Returns(points: Sp500Point[], baseDate: string): Map<string, number> {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const map = new Map<string, number>();
  const base = sorted.find((p) => p.date >= baseDate) ?? sorted[0];
  if (!base || base.close <= 0) return map;
  for (const p of sorted) {
    map.set(p.date, (p.close / base.close - 1) * 100);
  }
  return map;
}

/**
 * Merge de las dos series en puntos alineados por fecha.
 * Para fechas donde falta SP500 (fin de semana, feriado), se usa último conocido.
 */
export function mergeReturnSeries(
  twr: Array<{ date: string; twr_pct: number }>,
  sp500ByDate: Map<string, number>,
): ReturnPoint[] {
  let lastSp = 0;
  return twr.map((p) => {
    const sp = sp500ByDate.get(p.date);
    if (sp !== undefined) lastSp = sp;
    return {
      date: p.date,
      portfolio_pct: p.twr_pct,
      sp500_pct: sp500ByDate.size > 0 ? lastSp : null,
    };
  });
}
