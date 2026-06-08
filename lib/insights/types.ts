import type { Expense } from "@/hooks/use-expenses";
import type { Income } from "@/hooks/use-incomes";
import type { Investment } from "@/hooks/use-investments";
import type { Goal } from "@/hooks/use-goals";
import type { CreditCard } from "@/hooks/use-credit-cards";
import type { ValuedHolding } from "@/lib/portfolio/holdings";
import type { ReturnPoint } from "@/lib/portfolio/twr";
import type { IncomeDistribution } from "@/types/database";
import type { GoalProgress } from "@/lib/goals/progress";

export type InsightCategory =
  | "tip"
  | "reminder"
  | "opportunity"
  | "warning"
  | "achievement";

export type InsightModule =
  | "dashboard"
  | "gastos"
  | "inversiones"
  | "ingresos"
  | "metas";

export type InsightPriority = "critical" | "high" | "medium" | "low";

export interface SmartInsight {
  id: string; // Unique: "{ruleId}-{hash(params)}"
  ruleId: string; // e.g. "gastos-daily-pace"
  module: InsightModule; // Target module
  category: InsightCategory; // Visual type (color + icon)
  priority: InsightPriority; // For sorting
  title: string; // Short title (max ~40 chars)
  message: string; // Description with interpolated data
  href?: string; // Deep link to relevant module
  icon?: string; // Lucide icon name override
  dismissible: boolean; // Can it be dismissed?
  createdAt: string; // ISO date
}

// Result of portfolioTotals
export interface PortfolioTotalsData {
  total_usd: number;
  cost_basis_usd: number;
  unrealized_pnl_pct: number | null;
  realized_pnl_usd: number;
}

// Context to evaluate rules
export interface InsightContext {
  // Expenses
  expenses: Expense[];
  expensesPrevMonth: Expense[];

  // Incomes
  incomes: Income[];
  incomesPrevMonth: Income[];
  compositeDistribution: IncomeDistribution | null;

  // Investments / Portfolio
  holdings: ValuedHolding[];
  portfolioTotals: PortfolioTotalsData;
  returnSeries: ReturnPoint[];
  investments: Investment[];

  // Goals
  goals: Goal[];
  goalProgresses: Map<string, GoalProgress>;

  // Cards
  creditCards: CreditCard[];

  // Dates
  today: Date;
  currentMonth: Date;
  daysInMonth: number;
  dayOfMonth: number;
}

export type InsightRule = {
  id: string;
  module: InsightModule;
  evaluate: (ctx: InsightContext) => SmartInsight | null;
};
