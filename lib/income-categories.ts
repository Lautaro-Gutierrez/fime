import {
  Briefcase,
  Laptop,
  Home,
  Coins,
  ShoppingBag,
  Gift,
  CircleDollarSign,
  type LucideIcon,
} from "lucide-react";
import type { IncomeCategory } from "@/types/database";

export type IncomeCategoryConfig = {
  id: IncomeCategory;
  label: string;
  short: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  icon: LucideIcon;
};

// Identidad del módulo: lime/green (CTAs, glows, dots).
// Cada categoría mantiene color distinto para que el donut sea legible.
export const INCOME_CATEGORIES: IncomeCategoryConfig[] = [
  {
    id: "sueldo",
    label: "Sueldo",
    short: "Sueldo",
    color: "#84CC16",
    bgClass: "bg-lime-500/15",
    textClass: "text-lime-400",
    borderClass: "border-lime-500/30",
    icon: Briefcase,
  },
  {
    id: "freelance",
    label: "Freelance / Honorarios",
    short: "Freelance",
    color: "#0EA5E9",
    bgClass: "bg-sky-500/15",
    textClass: "text-sky-400",
    borderClass: "border-sky-500/30",
    icon: Laptop,
  },
  {
    id: "alquiler_cobrado",
    label: "Alquiler cobrado",
    short: "Alquiler",
    color: "#3B82F6",
    bgClass: "bg-blue-500/15",
    textClass: "text-blue-400",
    borderClass: "border-blue-500/30",
    icon: Home,
  },
  {
    id: "dividendos",
    label: "Dividendos / Cupones",
    short: "Dividendos",
    color: "#F59E0B",
    bgClass: "bg-amber-500/15",
    textClass: "text-amber-400",
    borderClass: "border-amber-500/30",
    icon: Coins,
  },
  {
    id: "venta",
    label: "Ventas",
    short: "Ventas",
    color: "#F97316",
    bgClass: "bg-orange-500/15",
    textClass: "text-orange-400",
    borderClass: "border-orange-500/30",
    icon: ShoppingBag,
  },
  {
    id: "bono",
    label: "Bonos / Aguinaldo",
    short: "Bono",
    color: "#FB7185",
    bgClass: "bg-rose-500/15",
    textClass: "text-rose-400",
    borderClass: "border-rose-500/30",
    icon: Gift,
  },
  {
    id: "otros",
    label: "Otros ingresos",
    short: "Otros",
    color: "#64748B",
    bgClass: "bg-slate-500/15",
    textClass: "text-slate-300",
    borderClass: "border-slate-500/30",
    icon: CircleDollarSign,
  },
];

export const INCOME_CATEGORIES_BY_ID: Record<IncomeCategory, IncomeCategoryConfig> =
  Object.fromEntries(INCOME_CATEGORIES.map((c) => [c.id, c])) as Record<
    IncomeCategory,
    IncomeCategoryConfig
  >;

// Buckets del Waterfall Distributor (Feature 1). Fijos.
export type DistributionBucket = "fixed" | "variable" | "invest" | "save";

export type BucketConfig = {
  id: DistributionBucket;
  label: string;
  short: string;
  color: string;
  bgClass: string;
  textClass: string;
};

export const DISTRIBUTION_BUCKETS: BucketConfig[] = [
  {
    id: "fixed",
    label: "Gastos fijos",
    short: "Fijos",
    color: "#EF4444",
    bgClass: "bg-red-500/15",
    textClass: "text-red-400",
  },
  {
    id: "variable",
    label: "Gastos variables",
    short: "Variables",
    color: "#F59E0B",
    bgClass: "bg-amber-500/15",
    textClass: "text-amber-400",
  },
  {
    id: "invest",
    label: "Inversiones",
    short: "Inversiones",
    color: "#6366F1",
    bgClass: "bg-indigo-500/15",
    textClass: "text-indigo-400",
  },
  {
    id: "save",
    label: "Ahorro",
    short: "Ahorro",
    color: "#22C55E",
    bgClass: "bg-green-500/15",
    textClass: "text-green-400",
  },
];

// Defaults del Waterfall (editable por el user en cada ingreso).
export const DEFAULT_DISTRIBUTION = {
  fixed_pct: 40,
  variable_pct: 20,
  invest_pct: 25,
  save_pct: 15,
} as const;

// Templates one-click (Feature 3). Fijos en V1.
export type IncomeTemplate = {
  id: string;
  label: string;
  category: IncomeCategory;
};

export const INCOME_TEMPLATES: IncomeTemplate[] = [
  { id: "sueldo_base", label: "Sueldo base", category: "sueldo" },
  { id: "aguinaldo", label: "Aguinaldo", category: "bono" },
];
