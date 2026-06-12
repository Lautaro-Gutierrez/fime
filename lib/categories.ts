import {
  Home,
  Zap,
  FileText,
  UtensilsCrossed,
  CreditCard,
  GraduationCap,
  AlertTriangle,
  Play,
  type LucideIcon,
} from "lucide-react";
import type { ExpenseCategory } from "@/types/database";

export type CategoryConfig = {
  id: ExpenseCategory | "suscripciones";
  label: string;
  short: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  icon: LucideIcon;
};

export const CATEGORIES: CategoryConfig[] = [
  {
    id: "alquiler",
    label: "Alquiler",
    short: "Alquiler",
    color: "#3B82F6",
    bgClass: "bg-blue-500/15",
    textClass: "text-blue-400",
    borderClass: "border-blue-500/30",
    icon: Home,
  },
  {
    id: "servicios",
    label: "Servicios",
    short: "Servicios",
    color: "#F59E0B",
    bgClass: "bg-amber-500/15",
    textClass: "text-amber-400",
    borderClass: "border-amber-500/30",
    icon: Zap,
  },
  {
    id: "impuestos",
    label: "Impuestos",
    short: "Impuestos",
    color: "#EF4444",
    bgClass: "bg-red-500/15",
    textClass: "text-red-400",
    borderClass: "border-red-500/30",
    icon: FileText,
  },
  {
    id: "comida",
    label: "Comida",
    short: "Comida",
    color: "#10B981",
    bgClass: "bg-emerald-500/15",
    textClass: "text-emerald-400",
    borderClass: "border-emerald-500/30",
    icon: UtensilsCrossed,
  },
  {
    id: "tarjeta_credito",
    label: "Tarjeta de Crédito",
    short: "Tarjeta",
    color: "#8B5CF6",
    bgClass: "bg-violet-500/15",
    textClass: "text-violet-400",
    borderClass: "border-violet-500/30",
    icon: CreditCard,
  },
  {
    id: "educacion",
    label: "Educación",
    short: "Educación",
    color: "#06B6D4",
    bgClass: "bg-cyan-500/15",
    textClass: "text-cyan-400",
    borderClass: "border-cyan-500/30",
    icon: GraduationCap,
  },
  {
    id: "imprevistos",
    label: "Gastos no previstos",
    short: "Imprevistos",
    color: "#EC4899",
    bgClass: "bg-pink-500/15",
    textClass: "text-pink-400",
    borderClass: "border-pink-500/30",
    icon: AlertTriangle,
  },
  {
    id: "suscripciones",
    label: "Suscripciones",
    short: "Suscrip.",
    color: "#F43F5E",
    bgClass: "bg-rose-500/15",
    textClass: "text-rose-400",
    borderClass: "border-rose-500/30",
    icon: Play,
  },
];

export const CATEGORIES_BY_ID: Record<ExpenseCategory | "suscripciones", CategoryConfig> =
  Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
    ExpenseCategory | "suscripciones",
    CategoryConfig
  >;
