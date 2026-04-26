const ARS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const ARS_DECIMAL = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const USD_DECIMAL = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const USD_INTEGER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatARS(amount: number, withDecimals = false) {
  return (withDecimals ? ARS_DECIMAL : ARS).format(amount);
}

export function formatUSD(amount: number, withDecimals = true) {
  return (withDecimals ? USD_DECIMAL : USD_INTEGER).format(amount);
}

// Para cantidades de activos (ej: 0.00123456 BTC, 10 AAPL). Muestra hasta 8 decimales pero trimea ceros innecesarios.
export function formatQuantity(qty: number) {
  if (qty === 0) return "0";
  if (Math.abs(qty) >= 1) {
    return qty.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    });
  }
  return qty.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  });
}

export function formatDelta(current: number, previous: number) {
  if (previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const sign = pct > 0 ? "+" : "";
  return { pct, label: `${sign}${pct.toFixed(1)}%`, isUp: pct > 0 };
}

export function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function isFutureMonth(date: Date) {
  const now = new Date();
  return (
    date.getFullYear() > now.getFullYear() ||
    (date.getFullYear() === now.getFullYear() && date.getMonth() > now.getMonth())
  );
}

export function firstOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function lastOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function toISODate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function fromISODate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
