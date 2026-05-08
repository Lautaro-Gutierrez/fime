import {
  PiggyBank,
  ShoppingBag,
  ShieldCheck,
  TrendingUp,
  Percent,
  CreditCard,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { GoalType, QuestType } from "@/types/database";

// Tipos de fuente para auto-tracking del progreso.
//   portfolio_total          → suma USD de todo el portfolio (M3)
//   portfolio_subset         → suma USD solo de los linked_asset_keys (M3)
//   expense_category_monthly → suma ARS de gastos del mes en una categoría (M1)
//   expense_total_monthly    → suma ARS de todos los gastos del mes (M1)
//   income_monthly           → suma ARS de ingresos del mes (M4)
//   savings_rate_monthly     → (ingresos - gastos) / ingresos del mes
//   passive_income_monthly   → Δ portfolio mensual menos cashflows (M3)
export type SourceTypeId =
  | "portfolio_total"
  | "portfolio_subset"
  | "expense_category_monthly"
  | "expense_total_monthly"
  | "income_monthly"
  | "savings_rate_monthly"
  | "passive_income_monthly";

export type GoalCurrency = "USD" | "ARS";

export type GoalConfig = {
  id: GoalType;
  label: string;
  short: string;
  description: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  glowClass: string;
  icon: LucideIcon;
  defaultCurrency: GoalCurrency | null;
  supportedCurrencies: GoalCurrency[];
  supportsAssetLink: boolean;
  defaultQuestType: QuestType;
  availableSourceTypes: SourceTypeId[];
  isPercentage: boolean;
};

export const GOALS: GoalConfig[] = [
  {
    id: "savings",
    label: "Ahorro",
    short: "Ahorro",
    description: "Llegar a un capital objetivo. Auto-tracked desde portfolio o subset.",
    color: "#F59E0B",
    bgClass: "bg-amber-500/15",
    textClass: "text-amber-400",
    borderClass: "border-amber-500/30",
    glowClass: "",
    icon: PiggyBank,
    defaultCurrency: "USD",
    supportedCurrencies: ["USD", "ARS"],
    supportsAssetLink: true,
    defaultQuestType: "main",
    availableSourceTypes: ["portfolio_total", "portfolio_subset"],
    isPercentage: false,
  },
  {
    id: "purchase",
    label: "Compra",
    short: "Compra",
    description: "Juntar para una compra puntual (viaje, hardware, etc.).",
    color: "#F97316",
    bgClass: "bg-orange-500/15",
    textClass: "text-orange-400",
    borderClass: "border-orange-500/30",
    glowClass: "",
    icon: ShoppingBag,
    defaultCurrency: "USD",
    supportedCurrencies: ["USD", "ARS"],
    supportsAssetLink: true,
    defaultQuestType: "side",
    availableSourceTypes: ["portfolio_total", "portfolio_subset"],
    isPercentage: false,
  },
  {
    id: "expense_cap",
    label: "Tope de gasto",
    short: "Tope",
    description: "Mantener gasto mensual por debajo de X (categoría o total).",
    color: "#F43F5E",
    bgClass: "bg-rose-500/15",
    textClass: "text-rose-400",
    borderClass: "border-rose-500/30",
    glowClass: "",
    icon: ShieldCheck,
    defaultCurrency: "ARS",
    supportedCurrencies: ["ARS"],
    supportsAssetLink: false,
    defaultQuestType: "main",
    availableSourceTypes: ["expense_category_monthly", "expense_total_monthly"],
    isPercentage: false,
  },
  {
    id: "income_target",
    label: "Ingreso mensual",
    short: "Ingreso",
    description: "Alcanzar X de ingresos por mes (M4).",
    color: "#84CC16",
    bgClass: "bg-lime-500/15",
    textClass: "text-lime-400",
    borderClass: "border-lime-500/30",
    glowClass: "",
    icon: TrendingUp,
    defaultCurrency: "ARS",
    supportedCurrencies: ["ARS", "USD"],
    supportsAssetLink: false,
    defaultQuestType: "main",
    availableSourceTypes: ["income_monthly"],
    isPercentage: false,
  },
  {
    id: "savings_rate",
    label: "Tasa de ahorro",
    short: "Tasa",
    description: "Ahorrar al menos X% de los ingresos del mes.",
    color: "#EAB308",
    bgClass: "bg-yellow-500/15",
    textClass: "text-yellow-400",
    borderClass: "border-yellow-500/30",
    glowClass: "",
    icon: Percent,
    defaultCurrency: null,
    supportedCurrencies: [],
    supportsAssetLink: false,
    defaultQuestType: "main",
    availableSourceTypes: ["savings_rate_monthly"],
    isPercentage: true,
  },
  {
    id: "debt_payoff",
    label: "Cancelar deuda",
    short: "Deuda",
    description: "Saldar una deuda (manual, current_amount editable).",
    color: "#EF4444",
    bgClass: "bg-red-500/15",
    textClass: "text-red-400",
    borderClass: "border-red-500/30",
    glowClass: "",
    icon: CreditCard,
    defaultCurrency: "ARS",
    supportedCurrencies: ["ARS", "USD"],
    supportsAssetLink: false,
    defaultQuestType: "side",
    availableSourceTypes: [],
    isPercentage: false,
  },
  {
    id: "passive_income_target",
    label: "Ingreso pasivo",
    short: "Pasivo",
    description: "Retornos mensuales del portfolio (excluye aportes propios).",
    color: "#D946EF",
    bgClass: "bg-fuchsia-500/15",
    textClass: "text-fuchsia-400",
    borderClass: "border-fuchsia-500/30",
    glowClass: "",
    icon: Sparkles,
    defaultCurrency: "USD",
    supportedCurrencies: ["USD"],
    supportsAssetLink: false,
    defaultQuestType: "main",
    availableSourceTypes: ["passive_income_monthly"],
    isPercentage: false,
  },
];

export const GOALS_BY_ID: Record<GoalType, GoalConfig> = Object.fromEntries(
  GOALS.map((g) => [g.id, g]),
) as Record<GoalType, GoalConfig>;

export const QUEST_LABELS: Record<QuestType, string> = {
  main: "Largo Plazo",
  side: "Corto Plazo",
};

export const QUEST_DESCRIPTIONS: Record<QuestType, string> = {
  main: "Objetivos persistentes de largo alcance",
  side: "Objetivos de corto plazo",
};

export const SOURCE_TYPE_LABELS: Record<SourceTypeId, string> = {
  portfolio_total: "Portfolio total (M3)",
  portfolio_subset: "Activos seleccionados",
  expense_category_monthly: "Categoría de gasto del mes",
  expense_total_monthly: "Gasto total del mes",
  income_monthly: "Ingresos del mes",
  savings_rate_monthly: "Tasa de ahorro mensual",
  passive_income_monthly: "Retorno mensual del portfolio",
};

// Milestones visuales en el anillo de progreso (sin toasts/popups).
export const MILESTONES = [25, 50, 75] as const;
