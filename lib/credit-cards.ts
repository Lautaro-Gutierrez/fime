import { lastOfMonth } from "@/lib/format";

export type CardBrand = "visa" | "master" | "amex" | "otros";

export const CARD_BRANDS: { id: CardBrand; label: string }[] = [
  { id: "visa", label: "Visa" },
  { id: "master", label: "Mastercard" },
  { id: "amex", label: "Amex" },
  { id: "otros", label: "Otros" },
];

// Paleta acotada para que las tarjetas se vean prolijas y no termine cualquiera
// metiendo neón fluo. Inspirada en colores corporativos comunes en AR.
export type CardColorId =
  | "amber"
  | "rose"
  | "violet"
  | "blue"
  | "emerald"
  | "slate"
  | "cyan"
  | "orange";

export const CARD_COLORS: {
  id: CardColorId;
  label: string;
  hex: string; // valor persistido en DB
  bgClass: string; // tailwind para chips/icons
  textClass: string;
  ringClass: string;
  gradientClass: string; // gradient para la card visual
}[] = [
  {
    id: "amber",
    label: "Ámbar",
    hex: "#F59E0B",
    bgClass: "bg-amber-500/15",
    textClass: "text-amber-300",
    ringClass: "ring-amber-500/30",
    gradientClass: "from-amber-500/30 via-amber-600/10 to-orange-500/20",
  },
  {
    id: "rose",
    label: "Rojo",
    hex: "#F43F5E",
    bgClass: "bg-rose-500/15",
    textClass: "text-rose-300",
    ringClass: "ring-rose-500/30",
    gradientClass: "from-rose-500/30 via-rose-600/10 to-pink-500/20",
  },
  {
    id: "violet",
    label: "Violeta",
    hex: "#8B5CF6",
    bgClass: "bg-violet-500/15",
    textClass: "text-violet-300",
    ringClass: "ring-violet-500/30",
    gradientClass: "from-violet-500/30 via-violet-600/10 to-fuchsia-500/20",
  },
  {
    id: "blue",
    label: "Azul",
    hex: "#3B82F6",
    bgClass: "bg-blue-500/15",
    textClass: "text-blue-300",
    ringClass: "ring-blue-500/30",
    gradientClass: "from-blue-500/30 via-blue-600/10 to-cyan-500/20",
  },
  {
    id: "emerald",
    label: "Verde",
    hex: "#10B981",
    bgClass: "bg-emerald-500/15",
    textClass: "text-emerald-300",
    ringClass: "ring-emerald-500/30",
    gradientClass: "from-emerald-500/30 via-emerald-600/10 to-teal-500/20",
  },
  {
    id: "slate",
    label: "Negro",
    hex: "#0F172A",
    bgClass: "bg-slate-500/15",
    textClass: "text-slate-300",
    ringClass: "ring-slate-500/30",
    gradientClass: "from-slate-700/40 via-slate-800/20 to-slate-900/30",
  },
  {
    id: "cyan",
    label: "Cian",
    hex: "#06B6D4",
    bgClass: "bg-cyan-500/15",
    textClass: "text-cyan-300",
    ringClass: "ring-cyan-500/30",
    gradientClass: "from-cyan-500/30 via-cyan-600/10 to-sky-500/20",
  },
  {
    id: "orange",
    label: "Naranja",
    hex: "#F97316",
    bgClass: "bg-orange-500/15",
    textClass: "text-orange-300",
    ringClass: "ring-orange-500/30",
    gradientClass: "from-orange-500/30 via-orange-600/10 to-red-500/20",
  },
];

export const CARD_COLORS_BY_HEX = new Map(CARD_COLORS.map((c) => [c.hex, c]));

export function colorFromHex(hex: string | null | undefined) {
  if (!hex) return CARD_COLORS[0];
  return CARD_COLORS_BY_HEX.get(hex) ?? CARD_COLORS[0];
}

export function brandLabel(brand: string | null | undefined) {
  if (!brand) return null;
  return CARD_BRANDS.find((b) => b.id === brand)?.label ?? brand;
}

/**
 * Clamp de día al último día del mes si el mes no llega a ese día
 * (ej: día 31 en febrero → 28/29).
 */
export function clampDayToMonth(year: number, monthIdx: number, day: number) {
  const last = lastOfMonth(new Date(year, monthIdx, 1)).getDate();
  return Math.min(day, last);
}

/**
 * Próximo cierre de la tarjeta a partir de `from`.
 * Si el día de cierre del mes actual ya pasó, retorna el del mes siguiente.
 */
export function nextClosingDate(closingDay: number, from = new Date()) {
  const fromY = from.getFullYear();
  const fromM = from.getMonth();
  const fromD = from.getDate();

  const thisMonthClose = clampDayToMonth(fromY, fromM, closingDay);
  if (thisMonthClose >= fromD) {
    return new Date(fromY, fromM, thisMonthClose);
  }
  return new Date(fromY, fromM + 1, clampDayToMonth(fromY, fromM + 1, closingDay));
}

/**
 * Próximo vencimiento. Vence después del cierre.
 * Si due_day < closing_day, el vencimiento es del mes siguiente al cierre.
 */
export function nextDueDate(closingDay: number, dueDay: number, from = new Date()) {
  const close = nextClosingDate(closingDay, from);
  const closeY = close.getFullYear();
  const closeM = close.getMonth();
  const offset = dueDay < closingDay ? 1 : 0;
  return new Date(
    closeY,
    closeM + offset,
    clampDayToMonth(closeY, closeM + offset, dueDay),
  );
}

/**
 * "Mes de pago" de un gasto X cargado a la tarjeta Y.
 * Devuelve el primero del mes en que vence ese gasto.
 *
 * Lógica: el gasto entra al ciclo cuyo cierre es el primer cierre ≥ fecha_gasto.
 * Ese ciclo se paga en el due del mismo mes (si due ≥ closing) o del mes siguiente.
 */
export function billingMonthForExpense(
  expenseDateISO: string,
  closingDay: number,
  dueDay: number,
): Date {
  const [y, m, d] = expenseDateISO.split("-").map(Number);
  const exp = new Date(y, m - 1, d);
  const close = nextClosingDate(closingDay, exp);
  const due = nextDueDate(closingDay, dueDay, exp);
  // Defensive — si due cayera antes que close por algún edge, devolvemos close.
  return due >= close
    ? new Date(due.getFullYear(), due.getMonth(), 1)
    : new Date(close.getFullYear(), close.getMonth(), 1);
}
