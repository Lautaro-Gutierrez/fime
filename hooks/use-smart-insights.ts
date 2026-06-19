"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useExpenses } from "./use-expenses";
import { useIncomes } from "./use-incomes";
import { useInvestments } from "./use-investments";
import { useGoals } from "./use-goals";
import { useCreditCards } from "./use-credit-cards";
import { usePortfolio } from "./use-portfolio";
import { useQueryClient } from "@tanstack/react-query";
import { computeGoalProgress, type GoalProgress, type ProgressContext } from "@/lib/goals/progress";
import { evaluateInsights } from "@/lib/insights/engine";
import { dashboardRules } from "@/lib/insights/rules/dashboard";
import { gastosRules } from "@/lib/insights/rules/gastos";
import { inversionesRules } from "@/lib/insights/rules/inversiones";
import { ingresosRules } from "@/lib/insights/rules/ingresos";
import { metasRules } from "@/lib/insights/rules/metas";
import type { InsightModule, SmartInsight, InsightContext } from "@/lib/insights/types";
import { format, subMonths, getDaysInMonth, getDate } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { firstOfMonth, lastOfMonth, monthKey, toISODate } from "@/lib/format";
import { useUserId } from "@/components/providers/user-provider";
import { DEFAULT_DISTRIBUTION } from "@/lib/income-categories";

const ALL_RULES = [
  ...dashboardRules,
  ...gastosRules,
  ...inversionesRules,
  ...ingresosRules,
  ...metasRules,
];

const MAX_PER_MODULE: Record<InsightModule, number> = {
  dashboard: 3,
  gastos: 2,
  inversiones: 2,
  ingresos: 2,
  metas: 2,
};

export function useSmartInsights(module?: InsightModule) {
  const queryClient = useQueryClient();
  const userId = useUserId();
  const supabase = useMemo(() => createClient(), []);

  // Time context
  const today = useMemo(() => new Date(), []);
  const currentMonth = useMemo(() => firstOfMonth(today), [today]);
  const prevMonth = useMemo(() => subMonths(currentMonth, 1), [currentMonth]);
  const daysInMonth = getDaysInMonth(currentMonth);
  const dayOfMonth = getDate(today);

  // Queries for current month
  const expensesQ = useExpenses(currentMonth);
  const incomesQ = useIncomes(currentMonth);
  const investmentsQ = useInvestments();
  const goalsQ = useGoals();
  const cardsQ = useCreditCards();
  const portfolioQ = usePortfolio("ALL");

  // Fetch prev month data on-demand client-side to avoid blocking SSR
  const [expensesPrevMonth, setExpensesPrevMonth] = useState<any[]>([]);
  const [incomesPrevMonth, setIncomesPrevMonth] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;
    const fetchPrevData = async () => {
      const from = toISODate(firstOfMonth(prevMonth));
      const to = toISODate(lastOfMonth(prevMonth));

      // Use queryClient to cache it but fetch it manually if not there
      const expData = await queryClient.fetchQuery({
        queryKey: ["expenses", userId, monthKey(prevMonth)],
        queryFn: async () => {
          const { data } = await supabase
            .from("expenses")
            .select("*")
            .gte("date", from)
            .lte("date", to);
          return data || [];
        },
      });
      setExpensesPrevMonth(expData);

      const incData = await queryClient.fetchQuery({
        queryKey: ["incomes", userId, monthKey(prevMonth)],
        queryFn: async () => {
          const { data } = await supabase
            .from("incomes")
            .select("*")
            .gte("date", from)
            .lte("date", to);
          return data || [];
        },
      });
      setIncomesPrevMonth(incData);
    };
    fetchPrevData();
  }, [userId, prevMonth, queryClient, supabase]);

  // Loading state
  const isLoading =
    expensesQ.isLoading ||
    incomesQ.isLoading ||
    investmentsQ.isLoading ||
    goalsQ.isLoading ||
    cardsQ.isLoading ||
    portfolioQ.isLoading;

  // Composite Distribution calculated from actual incomes of the month that have a custom distribution
  const compositeDistribution = useMemo(() => {
    const incomes = incomesQ.data || [];
    const incomesWithDist = incomes.filter((i) => i.distribution !== null);

    if (incomesWithDist.length === 0) {
      return DEFAULT_DISTRIBUTION;
    }

    const totalAmountWithDist = incomesWithDist.reduce((sum, i) => sum + (i.amount_ars || 0), 0);
    if (totalAmountWithDist === 0) {
      return DEFAULT_DISTRIBUTION;
    }

    let fixed = 0;
    let variable = 0;
    let invest = 0;
    let save = 0;

    for (const i of incomesWithDist) {
      const dist = i.distribution!;
      const weight = (i.amount_ars || 0) / totalAmountWithDist;
      fixed += dist.fixed_pct * weight;
      variable += dist.variable_pct * weight;
      invest += dist.invest_pct * weight;
      save += dist.save_pct * weight;
    }

    const roundedFixed = Math.round(fixed);
    const roundedVariable = Math.round(variable);
    const roundedInvest = Math.round(invest);
    const roundedSave = 100 - roundedFixed - roundedVariable - roundedInvest;

    return {
      fixed_pct: roundedFixed,
      variable_pct: roundedVariable,
      invest_pct: roundedInvest,
      save_pct: roundedSave,
    };
  }, [incomesQ.data]);

  // Goal progresses
  const goalProgresses = useMemo(() => {
    const map = new Map<string, GoalProgress>();
    if (!goalsQ.data) return map;

    // Build ctx for progress
    const expensesByCategory = expensesQ.data?.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>) || {};

    const expensesTotal = expensesQ.data?.reduce((acc, e) => acc + e.amount, 0) || 0;
    const incomesTotalArs = incomesQ.data?.reduce((acc, i) => acc + i.amount_ars, 0) || 0;

    const pCtx: ProgressContext = {
      portfolioTotalUsd: portfolioQ.totals?.total_usd,
      valuedHoldings: portfolioQ.holdings,
      expensesCurrentMonth: {
        byCategory: expensesByCategory,
        total: expensesTotal,
      },
      incomesCurrentMonthArs: incomesTotalArs,
      snapshots: portfolioQ.snapshots,
    };

    for (const g of goalsQ.data) {
      map.set(g.id, computeGoalProgress(g, pCtx));
    }
    return map;
  }, [goalsQ.data, expensesQ.data, incomesQ.data, portfolioQ.totals, portfolioQ.holdings, portfolioQ.snapshots]);

  // Dismiss logic
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const monthStr = format(currentMonth, "yyyy-MM");
  const storageKey = `fime-dismissed-insights-${monthStr}`;

  useEffect(() => {
    // Load dismissed from localStorage
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setDismissed(new Set(JSON.parse(stored)));
      }
    } catch (e) {
      console.error("Failed to load dismissed insights", e);
    }
  }, [storageKey]);

  const dismiss = useCallback(
    (insightId: string) => {
      setDismissed((prev) => {
        const next = new Set(prev);
        next.add(insightId);
        try {
          localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
        } catch (e) {
          console.error("Failed to save dismissed insights", e);
        }
        return next;
      });
    },
    [storageKey]
  );

  // Evaluate
  const rawCtx = useMemo<InsightContext>(() => {
    return {
      expenses: expensesQ.data || [],
      expensesPrevMonth,
      incomes: incomesQ.data || [],
      incomesPrevMonth,
      compositeDistribution,
      holdings: portfolioQ.holdings || [],
      portfolioTotals: portfolioQ.totals || {
        total_usd: 0,
        cost_basis_usd: 0,
        unrealized_pnl_pct: null,
        realized_pnl_usd: 0,
      },
      returnSeries: portfolioQ.returnSeries || [],
      investments: investmentsQ.data || [],
      goals: goalsQ.data || [],
      goalProgresses,
      creditCards: cardsQ.data || [],
      today,
      currentMonth,
      daysInMonth,
      dayOfMonth,
    };
  }, [
    expensesQ.data,
    expensesPrevMonth,
    incomesQ.data,
    incomesPrevMonth,
    compositeDistribution,
    portfolioQ.holdings,
    portfolioQ.totals,
    portfolioQ.returnSeries,
    investmentsQ.data,
    goalsQ.data,
    goalProgresses,
    cardsQ.data,
    today,
    currentMonth,
    daysInMonth,
    dayOfMonth,
  ]);

  const allInsights = useMemo(() => {
    if (isLoading) return null;
    return evaluateInsights(rawCtx, ALL_RULES, dismissed, MAX_PER_MODULE);
  }, [isLoading, rawCtx, dismissed]);

  return {
    insights: module && allInsights ? allInsights[module] : [],
    allInsights: allInsights || {
      dashboard: [],
      gastos: [],
      inversiones: [],
      ingresos: [],
      metas: [],
    },
    dismiss,
    isLoading,
    rawCtx,
  };
}
