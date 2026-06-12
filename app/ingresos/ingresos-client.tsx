"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Sliders, CircleDollarSign } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/components/layout/shell";
import { MonthSelector } from "@/components/ingresos/month-selector";
import dynamic from "next/dynamic";
const QuickAddIncome = dynamic(() => import("@/components/ingresos/quick-add").then(mod => mod.QuickAddIncome), { ssr: false });
const EditIncomeDialog = dynamic(() => import("@/components/ingresos/edit-income-dialog").then((mod) => mod.EditIncomeDialog), { ssr: false });
import { useIncomes, type Income } from "@/hooks/use-incomes";
import { useExpenses, sumExpensesByType } from "@/hooks/use-expenses";
import { createClient } from "@/lib/supabase/client";
import {
  firstOfMonth,
  lastOfMonth,
  monthKey,
  toISODate,
  fromISODate,
  formatARS,
  formatUSD,
} from "@/lib/format";
import { PrivateAmount } from "@/components/ui/private-amount";
import { INCOME_CATEGORIES_BY_ID } from "@/lib/income-categories";
import type { IncomeCategory } from "@/types/database";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

const INCOME_CATEGORY_STYLES: Record<IncomeCategory, { inactive: string; active: string }> = {
  sueldo: {
    inactive: "bg-emerald-500/10 text-emerald-400 border-white/[0.06] hover:bg-emerald-500/15",
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
  },
  freelance: {
    inactive: "bg-[#8B5CF6]/10 text-[#8B5CF6] border-white/[0.06] hover:bg-[#8B5CF6]/15",
    active: "bg-[#8B5CF6]/20 text-[#8B5CF6] border-[#8B5CF6]/50",
  },
  alquiler_cobrado: {
    inactive: "bg-blue-500/10 text-blue-400 border-white/[0.06] hover:bg-blue-500/15",
    active: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  },
  dividendos: {
    inactive: "bg-amber-500/10 text-amber-400 border-white/[0.06] hover:bg-amber-500/15",
    active: "bg-amber-500/20 text-amber-400 border-amber-500/50",
  },
  venta: {
    inactive: "bg-orange-500/10 text-orange-400 border-white/[0.06] hover:bg-orange-500/15",
    active: "bg-orange-500/20 text-orange-400 border-orange-500/50",
  },
  bono: {
    inactive: "bg-indigo-500/10 text-indigo-400 border-white/[0.06] hover:bg-indigo-500/15",
    active: "bg-indigo-500/20 text-indigo-400 border-indigo-500/50",
  },
  otros: {
    inactive: "bg-slate-500/10 text-slate-400 border-white/[0.06] hover:bg-slate-500/15",
    active: "bg-slate-500/20 text-slate-400 border-slate-500/50",
  },
};

const formatAxisLabel = (val: number) => {
  if (val === 0) return "$0";
  if (val >= 1000000) {
    const millions = val / 1000000;
    return `$${millions.toFixed(millions % 1 === 0 ? 0 : 1)}M`;
  }
  if (val >= 1000) {
    const thousands = val / 1000;
    return `$${thousands.toFixed(thousands % 1 === 0 ? 0 : 1)}k`;
  }
  return `$${val}`;
};

const formatBarLabel = (val: number) => {
  if (val === 0) return "$0";
  return `$${Math.round(val / 1000).toLocaleString("es-AR")}k`;
};

const getTopAxisValue = (maxVal: number) => {
  if (maxVal <= 0) return 3000000;
  const order = Math.pow(10, Math.floor(Math.log10(maxVal)));
  const ratio = maxVal / order;
  let factor = 10;
  if (ratio <= 1.5) factor = 1.5;
  else if (ratio <= 2) factor = 2;
  else if (ratio <= 3) factor = 3;
  else if (ratio <= 4) factor = 4;
  else if (ratio <= 5) factor = 5;
  else if (ratio <= 7.5) factor = 7.5;
  return order * factor;
};

export default function IngresosClient() {
  const [month, setMonth] = useState(() => firstOfMonth(new Date()));
  const [editing, setEditing] = useState<Income | null>(null);

  // Global income distribution state (customizable, otherwise derived from real expenses vs incomes)
  const [globalDist, setGlobalDist] = useState<{
    fixed_pct: number;
    variable_pct: number;
    invest_pct: number;
    save_pct: number;
  } | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("fime_global_income_distribution");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (
            typeof parsed.fixed_pct === "number" &&
            typeof parsed.variable_pct === "number" &&
            typeof parsed.invest_pct === "number" &&
            typeof parsed.save_pct === "number" &&
            parsed.fixed_pct + parsed.variable_pct + parsed.invest_pct + parsed.save_pct === 100
          ) {
            return parsed;
          }
        } catch (e) {}
      }
    }
    return null;
  });

  // Sync custom global distribution to localStorage
  useEffect(() => {
    if (globalDist) {
      localStorage.setItem("fime_global_income_distribution", JSON.stringify(globalDist));
    } else {
      localStorage.removeItem("fime_global_income_distribution");
    }
  }, [globalDist]);

  const { data: incomes = [], isLoading } = useIncomes(month);
  const { data: expenses = [] } = useExpenses(month);

  const realExpenses = useMemo(() => sumExpensesByType(expenses), [expenses]);
  const hasData = incomes.length > 0;

  // Derive dynamic expenses limits
  const fixedExpensesAmt = useMemo(() => {
    return hasData ? realExpenses.fixed : 1000000;
  }, [hasData, realExpenses.fixed]);

  const variableExpensesAmt = useMemo(() => {
    return hasData ? realExpenses.variable : 909070;
  }, [hasData, realExpenses.variable]);

  // Fallback mock incomes for visual demonstration matching prototype total of $6,000,000
  const mockIncomes = useMemo<Income[]>(() => {
    const monthYearStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    return [
      {
        id: "mock-1",
        amount: 3800000,
        amount_ars: 3800000,
        currency: "ARS",
        category: "sueldo",
        source: "Sueldo YPF",
        date: `${monthYearStr}-02`,
        note: "Nómina mensual",
        distribution: null,
        created_at: "",
        user_id: "",
        fx_rate: null,
      },
      {
        id: "mock-2",
        amount: 1500000,
        amount_ars: 1500000,
        currency: "ARS",
        category: "dividendos",
        source: "Rendimientos Inversiones",
        date: `${monthYearStr}-02`,
        note: "Rentabilidades trimestrales",
        distribution: null,
        created_at: "",
        user_id: "",
        fx_rate: null,
      },
      {
        id: "mock-3",
        amount: 700000,
        amount_ars: 700000,
        currency: "ARS",
        category: "venta",
        source: "Venta particular",
        date: `${monthYearStr}-02`,
        note: "Venta sillón",
        distribution: null,
        created_at: "",
        user_id: "",
        fx_rate: null,
      },
    ] as unknown as Income[];
  }, [month]);

  const activeIncomes = hasData ? incomes : mockIncomes;

  const totalIncomes = useMemo(() => {
    return activeIncomes.reduce((s, i) => s + Number(i.amount_ars), 0);
  }, [activeIncomes]);

  const totalExpenses = useMemo(() => {
    if (hasData) {
      return realExpenses.total;
    }
    return 1909070; // Fallback mock expenses
  }, [hasData, realExpenses.total]);

  // Dynamic distribution configuration: fixed_pct and variable_pct are derived from actual/mock expenses.
  // invest_pct and save_pct are configured by the user (or split 62.5% / 37.5% of the remainder).
  const activeDist = useMemo(() => {
    const fixed_pct = totalIncomes > 0 ? Math.min(100, Math.round((fixedExpensesAmt / totalIncomes) * 100)) : 40;
    const variable_pct = totalIncomes > 0 ? Math.min(100 - fixed_pct, Math.round((variableExpensesAmt / totalIncomes) * 100)) : 20;
    const remainder = 100 - fixed_pct - variable_pct;

    if (globalDist) {
      const customSum = (globalDist.invest_pct || 0) + (globalDist.save_pct || 0);
      if (customSum > 0) {
        const ratioInvest = globalDist.invest_pct / customSum;
        const invest_pct = Math.max(0, Math.round(remainder * ratioInvest));
        const save_pct = Math.max(0, remainder - invest_pct);
        return { fixed_pct, variable_pct, invest_pct, save_pct };
      }
    }

    const invest_pct = Math.max(0, Math.round(remainder * 0.625));
    const save_pct = Math.max(0, remainder - invest_pct);
    return { fixed_pct, variable_pct, invest_pct, save_pct };
  }, [globalDist, totalIncomes, fixedExpensesAmt, variableExpensesAmt]);

  // Config modal state
  const [openConfig, setOpenConfig] = useState(false);
  const [tempFixed, setTempFixed] = useState(activeDist.fixed_pct);
  const [tempVariable, setTempVariable] = useState(activeDist.variable_pct);
  const [tempInvest, setTempInvest] = useState<number | "">(activeDist.invest_pct);
  const [tempSave, setTempSave] = useState<number | "">(activeDist.save_pct);

  // Sync temporary variables when modal opens
  useEffect(() => {
    if (openConfig) {
      setTempFixed(activeDist.fixed_pct);
      setTempVariable(activeDist.variable_pct);
      setTempInvest(activeDist.invest_pct);
      setTempSave(activeDist.save_pct);
    }
  }, [openConfig, activeDist]);

  const maxAllowed = Math.max(0, 100 - tempFixed - tempVariable);

  const handleInvestChange = (valStr: string) => {
    if (valStr === "") {
      setTempInvest("");
      setTempSave(maxAllowed);
      return;
    }
    const val = Number(valStr);
    const cleanVal = isNaN(val) ? 0 : val;
    const newInvest = Math.min(maxAllowed, Math.max(0, cleanVal));
    setTempInvest(newInvest);
    setTempSave(maxAllowed - newInvest);
  };

  const handleSaveChange = (valStr: string) => {
    if (valStr === "") {
      setTempSave("");
      setTempInvest(maxAllowed);
      return;
    }
    const val = Number(valStr);
    const cleanVal = isNaN(val) ? 0 : val;
    const newSave = Math.min(maxAllowed, Math.max(0, cleanVal));
    setTempSave(newSave);
    setTempInvest(maxAllowed - newSave);
  };

  const totalSum = (Number(tempFixed) || 0) + (Number(tempVariable) || 0) + (Number(tempInvest) || 0) + (Number(tempSave) || 0);

  const handleSaveConfig = () => {
    if (totalSum !== 100) return;
    setGlobalDist({
      fixed_pct: Number(tempFixed),
      variable_pct: Number(tempVariable),
      invest_pct: Number(tempInvest) || 0,
      save_pct: Number(tempSave) || 0,
    });
    setOpenConfig(false);
    toast.success("Distribución global configurada con éxito");
  };

  const libre = useMemo(() => {
    return Math.max(0, totalIncomes - totalExpenses);
  }, [totalIncomes, totalExpenses]);

  const percentageConsumed = useMemo(() => {
    if (totalIncomes === 0) return 0;
    return Math.min(100, Math.round((totalExpenses / totalIncomes) * 100));
  }, [totalIncomes, totalExpenses]);

  const previousMonth = useMemo(
    () => new Date(month.getFullYear(), month.getMonth() - 1, 1),
    [month],
  );

  const { data: previousTotal = null } = useQuery({
    queryKey: ["incomes-total", monthKey(previousMonth)],
    queryFn: async () => {
      const supabase = createClient();
      const from = toISODate(firstOfMonth(previousMonth));
      const to = toISODate(lastOfMonth(previousMonth));
      const { data, error } = await supabase
        .from("incomes")
        .select("amount_ars")
        .gte("date", from)
        .lte("date", to);
      if (error) throw error;
      return (data ?? []).reduce(
        (sum, row) => sum + Number((row as { amount_ars: number }).amount_ars),
        0,
      );
    },
  });

  const deltaStr = useMemo(() => {
    if (!hasData) return "+8% vs mes anterior";
    if (previousTotal === null || previousTotal === 0) return "Nuevo este mes";
    const pct = Math.round(((totalIncomes - previousTotal) / previousTotal) * 100);
    return `${pct >= 0 ? "+" : ""}${pct}% vs mes anterior`;
  }, [hasData, totalIncomes, previousTotal]);

  // Dynamic distribution: totalIncomes * activeDist percentage
  const barValues = useMemo(() => {
    return {
      invest: Math.round(totalIncomes * (activeDist.invest_pct / 100)),
      save: Math.round(totalIncomes * (activeDist.save_pct / 100)),
      fixed: Math.round(totalIncomes * (activeDist.fixed_pct / 100)),
      variable: Math.round(totalIncomes * (activeDist.variable_pct / 100)),
    };
  }, [totalIncomes, activeDist]);

  const maxBarVal = Math.max(barValues.invest, barValues.save, barValues.fixed, barValues.variable);
  const topAxisVal = getTopAxisValue(maxBarVal);

  const hInvest = topAxisVal > 0 ? (barValues.invest / topAxisVal) * 150 : 0;
  const yInvest = 175 - hInvest;

  const hSave = topAxisVal > 0 ? (barValues.save / topAxisVal) * 150 : 0;
  const ySave = 175 - hSave;

  const hFixed = topAxisVal > 0 ? (barValues.fixed / topAxisVal) * 150 : 0;
  const yFixed = 175 - hFixed;

  const hVar = topAxisVal > 0 ? (barValues.variable / topAxisVal) * 150 : 0;
  const yVar = 175 - hVar;

  // Grouping list items by localized date, e.g. "2 De Junio"
  const groupedIncomes = useMemo(() => {
    const groups: Record<string, typeof activeIncomes> = {};
    activeIncomes.forEach((inc) => {
      const d = fromISODate(inc.date);
      const day = d.getDate();
      const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
      ];
      const monthName = monthNames[d.getMonth()];
      const formattedDate = `${day} De ${monthName}`;
      if (!groups[formattedDate]) {
        groups[formattedDate] = [];
      }
      groups[formattedDate].push(inc);
    });
    return Object.entries(groups).map(([dateStr, items]) => {
      const dayTotal = items.reduce((sum, item) => sum + Number(item.amount_ars), 0);
      return {
        dateStr,
        dayTotal,
        items,
      };
    }).sort((a, b) => {
      const dateA = fromISODate(a.items[0].date).getTime();
      const dateB = fromISODate(b.items[0].date).getTime();
      return dateB - dateA;
    });
  }, [activeIncomes]);

  return (
    <Shell>
      <div className="relative flex flex-col gap-6 p-4 pb-10 sm:p-6 md:p-8">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[380px] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_80%)]" />

        {/* Header */}
        <div className="mb-7 animate-fade-in">
          <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-1">INGRESOS</p>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Gestión de Ingresos</h1>
            <div className="flex items-center gap-3">
              <MonthSelector month={month} onChange={setMonth} />
              <QuickAddIncome />
            </div>
          </div>
        </div>

        {/* Row 1: Ingresos del Mes + Flujo Libre */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-7 animate-fade-in delay-1">
          {/* Ingresos del Mes Card */}
          <div className="rounded-2xl p-6 border bg-[#1F2229] border-white/[0.06] transition-all duration-300">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs text-slate-500 font-medium">Ingresos del Mes</span>
            </div>
            <p className="text-4xl font-extrabold text-white tnum">
              <PrivateAmount>{formatARS(totalIncomes)}</PrivateAmount>
            </p>
            <p className="text-xs text-emerald-400 mt-2 font-medium">{deltaStr}</p>
          </div>

          {/* Flujo Libre del Mes Card */}
          <div className="rounded-2xl p-6 border bg-[#1F2229] border-white/[0.06] transition-all duration-300">
            <h3 className="text-sm font-semibold text-white mb-4">Flujo Libre del Mes</h3>
            <div className="flex gap-4 mb-4">
              {/* Ingresos sub-card */}
              <div className="flex-1 rounded-xl p-3 text-center bg-[rgba(20,184,166,0.08)] border border-[rgba(20,184,166,0.15)]">
                <p className="text-[10px] text-teal-400 font-semibold uppercase mb-1">Ingresos</p>
                <p className="text-lg font-bold text-teal-400 tnum">
                  <PrivateAmount>{formatARS(totalIncomes)}</PrivateAmount>
                </p>
              </div>
              {/* Gastos sub-card */}
              <div className="flex-1 rounded-xl p-3 text-center bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.15)]">
                <p className="text-[10px] text-amber-400 font-semibold uppercase mb-1">Gastos</p>
                <p className="text-lg font-bold text-amber-400 tnum">
                  <PrivateAmount>{formatARS(totalExpenses)}</PrivateAmount>
                </p>
              </div>
              {/* Libre sub-card */}
              <div className="flex-1 rounded-xl p-3 text-center bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)]">
                <p className="text-[10px] text-slate-300 font-semibold uppercase mb-1">Libre</p>
                <p className="text-lg font-bold text-white tnum">
                  <PrivateAmount>{formatARS(libre)}</PrivateAmount>
                </p>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="mb-2">
              <div className="w-full h-2.5 rounded-full bg-white/[0.06]">
                <div
                  className="h-2.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${percentageConsumed}%`,
                    background: "linear-gradient(90deg, #f59e0b, #ef4444)",
                  }}
                />
              </div>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-amber-400 font-medium">{percentageConsumed}% de ingresos consumidos</span>
              <span className="text-slate-400">
                Disponible:{" "}
                <span className="text-white font-semibold tnum">
                  <PrivateAmount>{formatARS(libre)}</PrivateAmount>
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: Distribución Teórica + Movimientos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in delay-2">
          {/* Distribución Teórica Card */}
          <div className="rounded-2xl p-6 border bg-[#1F2229] border-white/[0.06] transition-all duration-300 flex flex-col justify-between min-h-[300px]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Distribución Teórica</h3>
              <button
                onClick={() => setOpenConfig(true)}
                className="rounded-lg p-1.5 text-slate-400 transition-all hover:bg-white/10 hover:text-white cursor-pointer"
                title="Configurar distribución global"
              >
                <Sliders className="size-3.5" />
              </button>
            </div>

            {totalIncomes === 0 ? (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
                Sin ingresos este mes
              </div>
            ) : (
              <div className="w-full flex items-center justify-center flex-1">
                <svg viewBox="0 0 380 220" className="w-full">
                  {/* Y axis labels */}
                  <text x="5" y="30" fill="#64748b" fontSize="9" fontFamily="Inter">{formatAxisLabel(topAxisVal)}</text>
                  <text x="5" y="80" fill="#64748b" fontSize="9" fontFamily="Inter">{formatAxisLabel(topAxisVal * 2 / 3)}</text>
                  <text x="5" y="130" fill="#64748b" fontSize="9" fontFamily="Inter">{formatAxisLabel(topAxisVal * 1 / 3)}</text>
                  <text x="5" y="180" fill="#64748b" fontSize="9" fontFamily="Inter">$0</text>
                  {/* Grid lines */}
                  <line x1="40" y1="25" x2="370" y2="25" stroke="rgba(255,255,255,0.04)" strokeWidth="1" stroke-dasharray="4"/>
                  <line x1="40" y1="75" x2="370" y2="75" stroke="rgba(255,255,255,0.04)" strokeWidth="1" stroke-dasharray="4"/>
                  <line x1="40" y1="125" x2="370" y2="125" stroke="rgba(255,255,255,0.04)" strokeWidth="1" stroke-dasharray="4"/>
                  <line x1="40" y1="175" x2="370" y2="175" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
                  
                  {/* Bars */}
                  {/* Inversiones */}
                  <rect x="55" y={yInvest} width="55" height={hInvest} rx="6" fill="#10b981" opacity="0.8"/>
                  <text x="82" y="205" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="Inter">Inversiones</text>
                  <text x="82" y={yInvest - 5} textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="600" fontFamily="Inter">{formatBarLabel(barValues.invest)}</text>
                  
                  {/* Ahorro */}
                  <rect x="135" y={ySave} width="55" height={hSave} rx="6" fill="#3b82f6" opacity="0.8"/>
                  <text x="162" y="205" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="Inter">Ahorro</text>
                  <text x="162" y={ySave - 5} textAnchor="middle" fill="#3b82f6" fontSize="9" fontWeight="600" fontFamily="Inter">{formatBarLabel(barValues.save)}</text>
                  
                  {/* Gastos Fijos */}
                  <rect x="215" y={yFixed} width="55" height={hFixed} rx="6" fill="#ef4444" opacity="0.8"/>
                  <text x="242" y="205" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="Inter">G. Fijos</text>
                  <text x="242" y={yFixed - 5} textAnchor="middle" fill="#ef4444" fontSize="9" fontWeight="600" fontFamily="Inter">{formatBarLabel(barValues.fixed)}</text>
                  
                  {/* Gastos Variables */}
                  <rect x="295" y={yVar} width="55" height={hVar} rx="6" fill="#f97316" opacity="0.8"/>
                  <text x="322" y="205" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="Inter">G. Var.</text>
                  <text x="322" y={yVar - 5} textAnchor="middle" fill="#f97316" fontSize="9" fontWeight="600" fontFamily="Inter">{formatBarLabel(barValues.variable)}</text>
                </svg>
              </div>
            )}
          </div>

          {/* Movimientos Card */}
          <div className="rounded-2xl p-6 border bg-[#1F2229] border-white/[0.06] transition-all duration-300 flex flex-col min-h-[300px]">
            <h3 className="text-sm font-semibold text-white mb-4">Movimientos</h3>
            <div className="flex flex-col gap-5 overflow-y-auto flex-1 max-h-[350px] pr-1">
              {groupedIncomes.length === 0 ? (
                <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
                  Sin movimientos cargados
                </div>
              ) : (
                groupedIncomes.map((group) => (
                  <div key={group.dateStr} className="mb-2">
                    <div className="flex items-center justify-between mb-3 border-b border-white/[0.04] pb-1">
                      <span className="text-xs text-slate-500 font-medium">{group.dateStr}</span>
                      <span className="text-xs text-emerald-400 font-bold tnum">
                        <PrivateAmount>{formatARS(group.dayTotal)}</PrivateAmount>
                      </span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {group.items.map((item) => {
                        const catConfig = INCOME_CATEGORIES_BY_ID[item.category];
                        const CatIcon = catConfig?.icon || CircleDollarSign;
                        const style = INCOME_CATEGORY_STYLES[item.category];
                        const isUsdOriginal = item.currency === "USD";
                        const isMock = item.id.startsWith("mock-");

                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              if (!isMock) {
                                setEditing(item as Income);
                              } else {
                                toast.info("Este es un ingreso de prueba. Registrá un nuevo ingreso para poder editarlo.");
                              }
                            }}
                            className={cn(
                              "flex items-center justify-between py-2 transition-all rounded-xl px-2 -mx-2",
                              !isMock ? "cursor-pointer hover:bg-white/[0.04]" : "opacity-80"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-transparent",
                                style?.inactive
                              )}>
                                <CatIcon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm text-white font-medium truncate">
                                  {item.source || catConfig?.label}
                                </p>
                                <p className="text-xs text-slate-500 truncate">
                                  {item.note || catConfig?.short || "Ingreso registrado"}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end shrink-0">
                              <span className="text-sm font-bold text-emerald-400 tnum">
                                <PrivateAmount>{formatARS(Number(item.amount_ars))}</PrivateAmount>
                              </span>
                              {isUsdOriginal && (
                                <span className="font-mono text-[9px] tabular-nums text-lime-300/80">
                                  <PrivateAmount>{formatUSD(Number(item.amount), true)}</PrivateAmount>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <EditIncomeDialog
          open={!!editing}
          income={editing}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Global distribution configuration modal */}
      <Dialog open={openConfig} onOpenChange={setOpenConfig}>
        <DialogContent className="max-w-md overflow-hidden bg-[#1F2229] border border-white/[0.06] rounded-[24px] p-6 shadow-2xl">
          <DialogTitle className="text-lg font-semibold tracking-tight text-white mb-2">
            Configurar Distribución Global
          </DialogTitle>
          <p className="text-xs text-slate-400 mb-6">
            Los porcentajes de Gastos Fijos y Variables se derivan automáticamente de tus gastos reales cargados del mes y no se pueden modificar. Podés ajustar cómo distribuir el resto entre Inversiones y Ahorro.
          </p>

          <div className="flex flex-col gap-4">
            {/* G. Fijos */}
            <div className="flex items-center justify-between bg-[#1A1D24] px-4 py-3 rounded-xl border border-white/[0.04]">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-[#ef4444]" />
                <span className="text-sm font-semibold text-slate-200">G. Fijos</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  disabled
                  value={`${tempFixed}`}
                  className="w-16 h-9 rounded-lg bg-[#1F2229]/50 border border-white/[0.04] text-center text-sm font-mono text-slate-500 cursor-not-allowed opacity-50 focus:outline-none"
                />
                <span className="text-slate-400 text-sm font-mono">%</span>
              </div>
            </div>

            {/* G. Variables */}
            <div className="flex items-center justify-between bg-[#1A1D24] px-4 py-3 rounded-xl border border-white/[0.04]">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-[#f97316]" />
                <span className="text-sm font-semibold text-slate-200">G. Variables</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  disabled
                  value={`${tempVariable}`}
                  className="w-16 h-9 rounded-lg bg-[#1F2229]/50 border border-white/[0.04] text-center text-sm font-mono text-slate-500 cursor-not-allowed opacity-50 focus:outline-none"
                />
                <span className="text-slate-400 text-sm font-mono">%</span>
              </div>
            </div>

            {/* Inversiones */}
            <div className="flex items-center justify-between bg-[#1A1D24] px-4 py-3 rounded-xl border border-white/[0.04]">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-[#10b981]" />
                <span className="text-sm font-semibold text-slate-200">Inversiones</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max={maxAllowed}
                  value={tempInvest}
                  onChange={(e) => handleInvestChange(e.target.value)}
                  className="w-16 h-9 rounded-lg bg-[#1F2229] border border-white/[0.06] text-center text-sm font-mono text-white focus:outline-none focus:border-fuchsia-500"
                />
                <span className="text-slate-400 text-sm font-mono">%</span>
              </div>
            </div>

            {/* Ahorro */}
            <div className="flex items-center justify-between bg-[#1A1D24] px-4 py-3 rounded-xl border border-white/[0.04]">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-[#3b82f6]" />
                <span className="text-sm font-semibold text-slate-200">Ahorro</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max={maxAllowed}
                  value={tempSave}
                  onChange={(e) => handleSaveChange(e.target.value)}
                  className="w-16 h-9 rounded-lg bg-[#1F2229] border border-white/[0.06] text-center text-sm font-mono text-white focus:outline-none focus:border-fuchsia-500"
                />
                <span className="text-slate-400 text-sm font-mono">%</span>
              </div>
            </div>
          </div>

          {/* Sum total and validation */}
          <div className="mt-6 flex items-center justify-between px-1">
            <span className="text-xs text-slate-400">Suma de Porcentajes:</span>
            <span className={cn(
              "text-sm font-mono font-bold px-2.5 py-1 rounded-lg",
              totalSum === 100
                ? "text-emerald-400 bg-emerald-500/10"
                : "text-rose-400 bg-rose-500/10"
            )}>
              {totalSum}% {totalSum === 100 ? "✓ Suma 100%" : `≠ 100%`}
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-7 pt-4 border-t border-white/[0.06]">
            <Button
              variant="outline"
              onClick={() => {
                setOpenConfig(false);
              }}
              className="h-10 rounded-xl border-white/[0.06] bg-transparent hover:bg-white/[0.04] text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              disabled={totalSum !== 100}
              onClick={handleSaveConfig}
              className="h-10 rounded-xl bg-gradient-to-r from-[#d946ef] to-[#06b6d4] hover:opacity-90 text-white font-semibold shadow-lg shadow-fuchsia-500/20 transition-all border-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Guardar Configuración
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
