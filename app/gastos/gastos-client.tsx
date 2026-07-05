"use client";

import { useMemo, useState } from "react";
import { Shell } from "@/components/layout/shell";
import dynamic from "next/dynamic";
const QuickAdd = dynamic(() => import("@/components/gastos/quick-add").then((mod) => mod.QuickAdd), { ssr: false });
import { MonthSelector } from "@/components/gastos/month-selector";
import { useExpenses, sumExpensesByType, type Expense } from "@/hooks/use-expenses";
import {
  firstOfMonth,
  formatUSD,
  toISODate
} from "@/lib/format";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ModuleInsightsPanel } from "@/components/module-insights-panel";

function getSubscriptionStyles(name: string): { letter: string; bgStyle: string } {
  const cleanName = name.trim();
  const letter = cleanName ? cleanName.charAt(0).toUpperCase() : "?";
  
  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    "bg-rose-500/10 text-rose-400",
    "bg-blue-500/10 text-blue-400",
    "bg-emerald-500/10 text-emerald-400",
    "bg-amber-500/10 text-amber-400",
    "bg-violet-500/10 text-violet-400",
    "bg-cyan-500/10 text-cyan-400",
    "bg-pink-500/10 text-pink-400"
  ];
  
  const bgStyle = colors[Math.abs(hash) % colors.length];
  return { letter, bgStyle };
}

export default function GastosClient() {
  const [month, setMonth] = useState(() => firstOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const handleDayClick = (day: number) => {
    setSelectedDay(prev => prev === day ? null : day);
  };

  // Controlled modal state
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: expenses = [], isLoading } = useExpenses(month);

  const { fixed, variable, total } = useMemo(() => sumExpensesByType(expenses), [expenses]);
  
  // Mock budget (puedes conectarlo a Supabase más adelante)
  const budgetFijos = 1500000;
  const budgetVariables = 1500000;
  
  const pctFijos = Math.min(100, Math.round((fixed / budgetFijos) * 100));
  const pctVariables = Math.min(100, Math.round((variable / budgetVariables) * 100));

  const handleNewExpense = () => {
    setEditingExpense(null);
    setModalOpen(true);
  };

  const handleEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingExpense(null);
  };

  const quickAddBtn = (
    <button 
      onClick={handleNewExpense}
      className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-rose-500/20"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M12 4v16m8-8H4"/></svg>
      Nuevo Gasto
    </button>
  );

  /* ───── Top 3 Expenses Calculation ───── */
  const displayTopExpenses = useMemo(() => {
    const sorted = [...expenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
      
    if (sorted.length > 0) {
      const fallbacks = [
        { id: "demo-t1", note: "Alquiler Departamento", category: "alquiler", amount: 508000 },
        { id: "demo-t2", note: "Seguro Auto Anual", category: "servicios", amount: 150000 },
        { id: "demo-t3", note: "Supermercado Jumbo", category: "comida", amount: 85200 }
      ];
      while (sorted.length < 3) {
        const item = fallbacks[sorted.length];
        sorted.push({
          id: item.id,
          user_id: "",
          amount: item.amount,
          currency: "ARS",
          category: item.category as any,
          type: "fixed",
          date: "",
          note: item.note,
          card_id: null,
          created_at: "",
          updated_at: "",
          is_subscription: false
        });
      }
      return sorted.map(exp => ({
        ...exp,
        raw: exp.id.startsWith("demo-") ? null : exp
      }));
    }

    return [
      { id: "demo-t1", note: "Alquiler Departamento", category: "alquiler", amount: 508000, raw: null },
      { id: "demo-t2", note: "Seguro Auto Anual", category: "servicios", amount: 150000, raw: null },
      { id: "demo-t3", note: "Supermercado Jumbo", category: "comida", amount: 85200, raw: null }
    ];
  }, [expenses]);

  /* ───── Subscriptions Calculation ───── */
  const subscriptions = useMemo(() => {
    const found = expenses.filter(exp => {
      return exp.is_subscription || exp.category === "suscripciones";
    });
    
    const sorted = [...found].sort((a, b) => b.amount - a.amount);
    
    return sorted.map(exp => {
      const name = exp.note || "Suscripción";
      const { letter, bgStyle } = getSubscriptionStyles(name);
      
      return {
        id: exp.id,
        name,
        category: "Suscripciones",
        amount: exp.amount,
        letter,
        bgStyle,
        raw: exp
      };
    });
  }, [expenses]);

  /* ───── Bills and Calendar Data ───── */
  const allPayments = useMemo(() => {
    if (expenses.length > 0) {
      return [...expenses]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(exp => {
          const dateObj = parseISO(exp.date);
          const day = dateObj.getDate();
          const dayStr = format(dateObj, "dd");
          const monthYear = format(dateObj, "MMM dd", { locale: es });
          const name = exp.note || exp.category.replace(/_/g, " ");
          const todayISO = toISODate(new Date());
          const isFuture = exp.date > todayISO;
          const isPending = exp.type === "fixed" || isFuture;
          const status = isPending ? "Pendiente" : "Pagado";
          const statusClass = isPending ? "bg-rose-500/15 text-rose-400" : "bg-emerald-500/15 text-emerald-400";
          const isUrgent = exp.category === "tarjeta_credito" || exp.category === "alquiler" || exp.category === "imprevistos";
          
          return {
            id: exp.id,
            day,
            dayStr,
            name,
            monthYear,
            amount: exp.amount,
            status,
            statusClass,
            isPending,
            isUrgent,
            raw: exp
          };
        });
    }

    const currentMonthLabel = format(month, "MMM", { locale: es });
    return [
      { id: "demo-b1", day: 20, dayStr: "20", name: "Servicio Electricidad", monthYear: `${currentMonthLabel} 20`, amount: 120000, status: "Pendiente", statusClass: "bg-rose-500/15 text-rose-400", isPending: true, isUrgent: false, raw: null },
      { id: "demo-b2", day: 22, dayStr: "22", name: "Servicio Internet", monthYear: `${currentMonthLabel} 22`, amount: 65000, status: "Pagado", statusClass: "bg-emerald-500/15 text-emerald-400", isPending: false, isUrgent: false, raw: null },
      { id: "demo-b3", day: 25, dayStr: "25", name: "Expensas/Agua", monthYear: `${currentMonthLabel} 25`, amount: 45000, status: "Pagado", statusClass: "bg-emerald-500/15 text-emerald-400", isPending: false, isUrgent: false, raw: null },
      { id: "demo-b4", day: 1, dayStr: "01", name: "Seguro Auto", monthYear: `${currentMonthLabel} 01`, amount: 150000, status: "Pendiente", statusClass: "bg-rose-500/15 text-rose-400", isPending: true, isUrgent: true, raw: null }
    ].sort((a, b) => a.day - b.day);
  }, [expenses, month]);

  const calendarDays = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    
    const days: Array<{ dayNum: number | null; key: string }> = [];
    
    for (let i = 0; i < startOffset; i++) {
      days.push({ dayNum: null, key: `empty-${i}` });
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ dayNum: d, key: `day-${d}` });
    }
    
    return days;
  }, [month]);

  const displayBills = useMemo(() => {
    if (selectedDay === null) {
      return allPayments;
    }
    return allPayments.filter(p => p.day === selectedDay);
  }, [allPayments, selectedDay]);

  /* ───── Expense Distribution (Donut) ───── */
  const distributionData = useMemo(() => {
    if (expenses.length === 0) {
      return [
        { name: "Comida", amount: 621500, pct: 32.56, strokeColor: "#10b981", bgClass: "bg-emerald-500" },
        { name: "Alquiler", amount: 568100, pct: 29.76, strokeColor: "#6366f1", bgClass: "bg-indigo-500" },
        { name: "Servicios", amount: 483500, pct: 25.33, strokeColor: "#0ea5e9", bgClass: "bg-sky-500" },
        { name: "Transporte", amount: 324500, pct: 17.00, strokeColor: "#f59e0b", bgClass: "bg-amber-500" },
        { name: "Otros", amount: 195300, pct: 10.23, strokeColor: "#ec4899", bgClass: "bg-pink-500" }
      ];
    }

    const totalsByCategory = new Map<string, number>();
    let totalSum = 0;
    
    expenses.forEach(exp => {
      const cat = exp.is_subscription ? "suscripciones" : exp.category;
      const current = totalsByCategory.get(cat) ?? 0;
      totalsByCategory.set(cat, current + exp.amount);
      totalSum += exp.amount;
    });

    const categoryColors: Record<string, { stroke: string; bg: string }> = {
      comida: { stroke: "#10b981", bg: "bg-emerald-500" },
      alquiler: { stroke: "#6366f1", bg: "bg-indigo-500" },
      servicios: { stroke: "#0ea5e9", bg: "bg-sky-500" },
      impuestos: { stroke: "#f59e0b", bg: "bg-amber-500" },
      tarjeta_credito: { stroke: "#a855f7", bg: "bg-purple-500" },
      educacion: { stroke: "#14b8a6", bg: "bg-teal-500" },
      imprevistos: { stroke: "#ec4899", bg: "bg-pink-500" },
      suscripciones: { stroke: "#F43F5E", bg: "bg-rose-500" },
    };

    const list = Array.from(totalsByCategory.entries()).map(([cat, amount]) => {
      const color = categoryColors[cat] ?? { stroke: "#94a3b8", bg: "bg-slate-500" };
      const pct = totalSum > 0 ? (amount / totalSum) * 100 : 0;
      
      let name = cat.replace(/_/g, " ");
      name = name.charAt(0).toUpperCase() + name.slice(1);
      if (cat === "comida") name = "Comida";
      if (cat === "alquiler") name = "Alquiler";
      if (cat === "servicios") name = "Servicios";
      if (cat === "impuestos") name = "Impuestos";
      if (cat === "tarjeta_credito") name = "Tarjeta Crédito";
      if (cat === "suscripciones") name = "Suscripciones";
      
      return {
        name,
        amount,
        pct,
        strokeColor: color.stroke,
        bgClass: color.bg
      };
    });

    return list.sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const donutSegments = useMemo(() => {
    const totalCircumference = 2 * Math.PI * 60; // 376.99
    let accumulatedPercent = 0;
    
    return distributionData.map((item) => {
      const segmentLength = (item.pct / 100) * totalCircumference;
      const strokeDashoffset = -(accumulatedPercent / 100) * totalCircumference;
      accumulatedPercent += item.pct;
      
      return {
        ...item,
        strokeDasharray: `${segmentLength.toFixed(1)} ${(totalCircumference - segmentLength).toFixed(1)}`,
        strokeDashoffset: strokeDashoffset.toFixed(1),
      };
    });
  }, [distributionData]);

  /* ───── Recent Movements Calculation ───── */
  const recentMovements = useMemo(() => {
    if (expenses.length > 0) {
      const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
      
      const list: Array<{
        id: string;
        name: string;
        date: string;
        amount: number;
        status: string;
        statusClass: string;
        bgClass: string;
        textClass: string;
        iconSvg: React.ReactNode;
        raw: Expense | null;
      }> = sorted.slice(0, 6).map(exp => {
        const cat = exp.is_subscription ? "suscripciones" : exp.category;
        let bgClass = "bg-indigo-500/10";
        let textClass = "text-indigo-400";
        let iconSvg = (
          <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4"/></svg>
        );

        if (cat === "comida") {
          bgClass = "bg-emerald-500/10";
          textClass = "text-emerald-400";
          iconSvg = (
            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"/></svg>
          );
        } else if (cat === "servicios") {
          bgClass = "bg-sky-500/10";
          textClass = "text-sky-400";
          iconSvg = (
            <svg className="w-3.5 h-3.5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          );
        } else if (cat === "impuestos") {
          bgClass = "bg-amber-500/10";
          textClass = "text-amber-400";
          iconSvg = (
            <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
          );
        } else if (cat === "tarjeta_credito") {
          bgClass = "bg-purple-500/10";
          textClass = "text-purple-400";
          iconSvg = (
            <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
          );
        } else if (cat === "educacion") {
          bgClass = "bg-teal-500/10";
          textClass = "text-teal-400";
          iconSvg = (
            <svg className="w-3.5 h-3.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/></svg>
          );
        } else if (cat === "imprevistos") {
          bgClass = "bg-pink-500/10";
          textClass = "text-pink-400";
          iconSvg = (
            <svg className="w-3.5 h-3.5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          );
        } else if (cat === "suscripciones") {
          bgClass = "bg-rose-500/10";
          textClass = "text-rose-400";
          iconSvg = (
            <svg className="w-3.5 h-3.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          );
        }

        const dateStr = format(parseISO(exp.date), "dd MMM", { locale: es });
        const name = exp.note || cat.replace(/_/g, " ");

        return {
          id: exp.id,
          name,
          date: dateStr,
          amount: exp.amount,
          status: exp.type === "fixed" || exp.date > toISODate(new Date()) ? "Pendiente" : "Pagado",
          statusClass: exp.type === "fixed" || exp.date > toISODate(new Date()) ? "bg-rose-500/15 text-rose-400" : "bg-emerald-500/15 text-emerald-400",
          bgClass,
          textClass,
          iconSvg,
          raw: exp
        };
      });

      const fallbacks = [
        { id: "demo-m1", name: "Alquiler", date: "01 Jun", amount: 508000, status: "Pagado", statusClass: "bg-emerald-500/15 text-emerald-400", bgClass: "bg-indigo-500/10", textClass: "text-indigo-400", iconSvg: <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4"/></svg>, raw: null },
        { id: "demo-m2", name: "Supermercado", date: "31 May", amount: 85200, status: "Pagado", statusClass: "bg-emerald-500/15 text-emerald-400", bgClass: "bg-emerald-500/10", textClass: "text-emerald-400", iconSvg: <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"/></svg>, raw: null },
        { id: "demo-m3", name: "Electricidad", date: "20 May", amount: 120000, status: "Pendiente", statusClass: "bg-rose-500/15 text-rose-400", bgClass: "bg-sky-500/10", textClass: "text-sky-400", iconSvg: <svg className="w-3.5 h-3.5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>, raw: null },
        { id: "demo-m4", name: "Transporte", date: "28 May", amount: 45500, status: "Pagado", statusClass: "bg-emerald-500/15 text-emerald-400", bgClass: "bg-amber-500/10", textClass: "text-amber-400", iconSvg: <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>, raw: null },
        { id: "demo-m5", name: "Netflix", date: "25 May", amount: 15990, status: "Pagado", statusClass: "bg-emerald-500/15 text-emerald-400", bgClass: "bg-pink-500/10", textClass: "text-pink-400", iconSvg: <svg className="w-3.5 h-3.5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>, raw: null },
        { id: "demo-m6", name: "Seguro Auto", date: "01 Jun", amount: 150000, status: "Pendiente", statusClass: "bg-rose-500/15 text-rose-400", bgClass: "bg-violet-500/10", textClass: "text-violet-400", iconSvg: <svg className="w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>, raw: null }
      ];
      while (list.length < 6) {
        list.push(fallbacks[list.length]);
      }
      return list;
    }

    return [
      {
        id: "demo-m1",
        name: "Alquiler",
        date: "01 Jun",
        amount: 508000,
        status: "Pagado",
        statusClass: "bg-emerald-500/15 text-emerald-400",
        bgClass: "bg-indigo-500/10",
        textClass: "text-indigo-400",
        iconSvg: <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4"/></svg>,
        raw: null
      },
      {
        id: "demo-m2",
        name: "Supermercado",
        date: "31 May",
        amount: 85200,
        status: "Pagado",
        statusClass: "bg-emerald-500/15 text-emerald-400",
        bgClass: "bg-emerald-500/10",
        textClass: "text-emerald-400",
        iconSvg: <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"/></svg>,
        raw: null
      },
      {
        id: "demo-m3",
        name: "Electricidad",
        date: "20 May",
        amount: 120000,
        status: "Pendiente",
        statusClass: "bg-rose-500/15 text-rose-400",
        bgClass: "bg-sky-500/10",
        textClass: "text-sky-400",
        iconSvg: <svg className="w-3.5 h-3.5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
        raw: null
      },
      {
        id: "demo-m4",
        name: "Transporte",
        date: "28 May",
        amount: 45500,
        status: "Pagado",
        statusClass: "bg-emerald-500/15 text-emerald-400",
        bgClass: "bg-amber-500/10",
        textClass: "text-amber-400",
        iconSvg: <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>,
        raw: null
      },
      {
        id: "demo-m5",
        name: "Netflix",
        date: "25 May",
        amount: 15990,
        status: "Pagado",
        statusClass: "bg-emerald-500/15 text-emerald-400",
        bgClass: "bg-pink-500/10",
        textClass: "text-pink-400",
        iconSvg: <svg className="w-3.5 h-3.5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
        raw: null
      },
      {
        id: "demo-m6",
        name: "Seguro Auto",
        date: "01 Jun",
        amount: 150000,
        status: "Pendiente",
        statusClass: "bg-rose-500/15 text-rose-400",
        bgClass: "bg-violet-500/10",
        textClass: "text-violet-400",
        iconSvg: <svg className="w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>,
        raw: null
      }
    ];
  }, [expenses]);

  return (
    <Shell>
      <div className="relative z-10 flex flex-col gap-6 p-4 sm:p-6 md:p-8 ambient-glow">
        {/* Header */}
        <div className="animate-fade-in">
          <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-1">EGRESOS</p>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Egresos de {format(month, "MMMM", { locale: es })}</h1>
              <span className="text-3xl font-extrabold text-white tnum">{formatUSD(total, false)}</span>
            </div>
            <div className="flex items-center gap-3">
              <MonthSelector month={month} onChange={(m) => { setMonth(m); setSelectedDay(null); }} />
              {quickAddBtn}
            </div>
          </div>
        </div>

        {/* Smart Insights Gastos */}
        <div className="relative z-10 animate-fade-in delay-1">
          <ModuleInsightsPanel module="gastos" />
        </div>

        {/* Summary + Calendar Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-2 gap-6 animate-fade-in delay-1">
          {/* Gastos Fijos */}
          <div className="rounded-2xl p-6 border card-hover flex flex-col justify-between" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(244,63,94,0.1)" }}><svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg></div>
                <span className="text-xs text-slate-500 font-medium">Gastos Fijos</span>
              </div>
              <p className="text-2xl font-bold text-white tnum">{formatUSD(fixed, false)}</p>
              <p className="text-xs text-slate-500 mt-1">Gastos al vencimiento</p>
            </div>
            <div className="mt-5">
              <div className="flex justify-between text-[11px] mb-2">
                <span className="text-slate-400">Presupuesto mensual</span>
                <span className="text-white font-semibold tnum">{pctFijos}%</span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-2 rounded-full progress-bar" style={{ width: `${pctFijos}%`, background: "linear-gradient(90deg, #f43f5e, #e11d48)" }}></div>
              </div>
              <p className="text-[10px] text-rose-400 mt-1.5 font-medium">{formatUSD(Math.max(0, budgetFijos - fixed), false)} disponibles de {formatUSD(budgetFijos, false)}</p>
            </div>
          </div>

          {/* Gastos Variables */}
          <div className="rounded-2xl p-6 border card-hover flex flex-col justify-between" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,158,11,0.1)" }}><svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/></svg></div>
                <span className="text-xs text-slate-500 font-medium">Gastos Variables</span>
              </div>
              <p className="text-2xl font-bold text-white tnum">{formatUSD(variable, false)}</p>
              <p className="text-xs text-slate-500 mt-1">Incluye extras y ocio</p>
            </div>
            <div className="mt-5">
              <div className="flex justify-between text-[11px] mb-2">
                <span className="text-slate-400">Presupuesto mensual</span>
                <span className="text-white font-semibold tnum">{pctVariables}%</span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-2 rounded-full progress-bar" style={{ width: `${pctVariables}%`, background: "linear-gradient(90deg, #f59e0b, #d97706)" }}></div>
              </div>
              <p className="text-[10px] text-emerald-400 mt-1.5 font-medium">{formatUSD(Math.max(0, budgetVariables - variable), false)} disponibles de {formatUSD(budgetVariables, false)}</p>
            </div>
          </div>

          {/* Calendario de Pagos (Col 3, row-span-2) */}
          <div className="rounded-2xl p-6 border lg:row-span-2 card-hover flex flex-col justify-between" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)", height: "100%" }}>
            <div className="flex-none">
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                Calendario de Pagos
              </h3>
              {/* Mini Cal */}
              <div className="grid grid-cols-7 gap-1.5 text-xs text-center mb-6 bg-white/[0.01] rounded-xl p-3 border border-white/[0.02]">
                <span className="text-slate-500 font-semibold mb-2">Lu</span>
                <span className="text-slate-500 font-semibold mb-2">Ma</span>
                <span className="text-slate-500 font-semibold mb-2">Mi</span>
                <span className="text-slate-500 font-semibold mb-2">Ju</span>
                <span className="text-slate-500 font-semibold mb-2">Vi</span>
                <span className="text-slate-500 font-semibold mb-2">Sá</span>
                <span className="text-slate-500 font-semibold mb-2">Do</span>

                {calendarDays.map((item) => {
                  if (item.dayNum === null) {
                    return <span key={item.key} className="py-2"></span>;
                  }

                  const day = item.dayNum;
                  const isSelected = selectedDay === day;
                  
                  const pendingPaymentsForDay = allPayments.filter(p => p.day === day && p.isPending);
                  const hasPending = pendingPaymentsForDay.length > 0;
                  const hasUrgent = pendingPaymentsForDay.some(p => p.isUrgent);

                  let dayClassName = "py-2 rounded-lg cursor-pointer transition-all duration-200 select-none ";

                  if (isSelected) {
                    dayClassName += "ring-2 ring-cyan-400 bg-white/[0.1] font-bold ";
                    if (hasPending) {
                      dayClassName += hasUrgent ? "text-rose-400" : "text-emerald-400";
                    } else {
                      dayClassName += "text-white";
                    }
                  } else if (hasPending) {
                    dayClassName += hasUrgent 
                      ? "text-rose-400 font-bold bg-rose-500/10 shadow-sm hover:bg-rose-500/20"
                      : "text-emerald-400 font-bold bg-emerald-500/10 shadow-sm hover:bg-emerald-500/20";
                  } else {
                    const hasAnyPayment = allPayments.some(p => p.day === day);
                    if (hasAnyPayment) {
                      dayClassName += "text-slate-300 hover:bg-white/[0.05]";
                    } else {
                      dayClassName += "text-slate-500 hover:bg-white/[0.03]";
                    }
                  }

                  return (
                    <span
                      key={item.key}
                      onClick={() => handleDayClick(day)}
                      className={dayClassName}
                    >
                      {day}
                    </span>
                  );
                })}
              </div>
            </div>
            
            {/* Bills - Dynamic mapped from expenses */}
            <div className="flex flex-col justify-start flex-1 gap-3 overflow-y-auto max-h-[300px] pr-1">
              {isLoading ? (
                <div className="text-center text-slate-500 text-sm mt-4">Cargando...</div>
              ) : displayBills.length === 0 ? (
                selectedDay !== null ? (
                  <div className="flex flex-col items-center justify-center flex-1 py-8 text-center px-4">
                    <svg className="w-10 h-10 text-slate-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
                    </svg>
                    <p className="text-xs text-slate-400 font-medium">No tenés vencimientos programados para el {selectedDay} de este mes</p>
                    <button 
                      onClick={() => setSelectedDay(null)}
                      className="mt-3 text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors underline underline-offset-4"
                    >
                      Ver todos los vencimientos
                    </button>
                  </div>
                ) : (
                  <div className="text-center text-slate-500 text-sm mt-4">No hay vencimientos registrados</div>
                )
              ) : (
                displayBills.map(bill => {
                  const isClickeable = !!bill.raw;
                  return (
                    <div 
                      key={bill.id}
                      onClick={() => isClickeable && handleEditExpense(bill.raw!)}
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-xl border border-transparent transition-colors",
                        isClickeable ? "cursor-pointer hover:bg-white/[0.04] hover:border-white/[0.04]" : ""
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/[0.03] flex items-center justify-center border border-white/[0.05]">
                          <p className="text-xs font-bold text-slate-300">{bill.dayStr}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-200 font-medium capitalize truncate max-w-[120px]">{bill.name}</p>
                          <p className="text-[11px] text-slate-500">{bill.monthYear}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-white tnum font-bold">{formatUSD(bill.amount, false)}</p>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold mt-1 inline-block ${bill.statusClass}`}>{bill.status}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Top 3 Gastos del Mes (Col 1, row 2) */}
          <div className="rounded-2xl p-6 border card-hover" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/></svg>
              Top 3 Gastos del Mes
            </h3>
            <div className="flex flex-col gap-3">
              {displayTopExpenses.map((exp, idx) => {
                const bgStyles = [
                  "bg-indigo-500/10 text-indigo-400",
                  "bg-emerald-500/10 text-emerald-400",
                  "bg-sky-500/10 text-sky-400"
                ];
                const styleClass = bgStyles[idx] || "bg-slate-500/10 text-slate-400";
                const catLabel = exp.category.replace(/_/g, " ");
                const noteLabel = exp.note || catLabel;
                const isClickeable = !!exp.raw;
                return (
                  <div 
                    key={exp.id} 
                    onClick={() => isClickeable && handleEditExpense(exp.raw!)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] transition-colors",
                      isClickeable && "cursor-pointer hover:bg-white/[0.06] border-white/[0.08]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${styleClass}`}>
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white capitalize truncate max-w-[140px]">{noteLabel}</p>
                        <p className="text-[11px] text-slate-500 capitalize">{catLabel}</p>
                      </div>
                    </div>
                    <span className="text-base font-bold text-rose-400 tnum">-{formatUSD(exp.amount, false)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Suscripciones Activas (Col 2, row 2) */}
          <div className="rounded-2xl p-6 border card-hover flex flex-col" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
              Suscripciones Activas
            </h3>
            <div className="flex flex-col gap-3 flex-1">
              {subscriptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 py-8 text-center">
                  <p className="text-xs text-slate-500">No hay suscripciones registradas.</p>
                </div>
              ) : (
                subscriptions.map((sub) => {
                  const isClickeable = !!sub.raw;
                  return (
                    <div 
                      key={sub.id} 
                      onClick={() => isClickeable && handleEditExpense(sub.raw!)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] transition-colors",
                        isClickeable && "cursor-pointer hover:bg-white/[0.06] border-white/[0.08]"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${sub.bgStyle}`}>
                          {sub.letter}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white truncate max-w-[140px]">{sub.name}</p>
                          <p className="text-[11px] text-slate-500 capitalize">{sub.category}</p>
                        </div>
                      </div>
                      <span className="text-base font-bold text-white tnum">{formatUSD(sub.amount, false)}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Distribution + Movimientos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in delay-2">
          {/* Distribución de Egresos */}
          <div id="gastos-donut" className="rounded-2xl p-6 border card-hover" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
            <h3 className="text-sm font-semibold text-white mb-4">Distribución de Egresos</h3>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <svg viewBox="0 0 160 160" className="w-36 h-36 flex-shrink-0">
                {donutSegments.map((seg, idx) => (
                  <circle
                    key={idx}
                    cx="80"
                    cy="80"
                    r="60"
                    fill="none"
                    stroke={seg.strokeColor}
                    strokeWidth="20"
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    transform="rotate(-90 80 80)"
                    className="transition-all duration-500 ease-out"
                  />
                ))}
              </svg>
              <div className="flex flex-col gap-3 flex-1 text-xs w-full">
                {donutSegments.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-white/[0.04] pb-2 last:border-b-0 last:pb-0">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-3 h-3 rounded-full ${item.bgClass}`} style={{ boxShadow: `0 0 8px ${item.strokeColor}80` }} />
                      <span className="text-slate-300 font-medium text-sm">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <span className="text-slate-500 tnum">{item.pct.toFixed(1)}%</span>
                      <span className="text-white font-bold tnum">{formatUSD(item.amount, false)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Movimientos Recientes */}
          <div className="rounded-2xl p-6 border card-hover" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
            <h3 className="text-sm font-semibold text-white mb-4">Movimientos Recientes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {recentMovements.map((mov) => {
                const isClickeable = !!mov.raw;
                return (
                  <div 
                    key={mov.id} 
                    onClick={() => isClickeable && handleEditExpense(mov.raw!)}
                    className={cn(
                      "flex items-center gap-2.5 py-2 border-b border-white/[0.04] last:border-0 transition-colors",
                      isClickeable && "cursor-pointer hover:bg-white/[0.04] px-2 rounded-xl -mx-2"
                    )}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${mov.bgClass}`}>
                      {mov.iconSvg}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-white font-medium truncate capitalize">{mov.name}</p>
                      <p className="text-[10px] text-slate-600">{mov.date}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-rose-400 font-semibold tnum">-{formatUSD(mov.amount, false)}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${mov.statusClass}`}>
                        {mov.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Unified Gasto Modal (Nuevo/Editar) */}
        <QuickAdd
          open={modalOpen}
          onOpenChange={setModalOpen}
          expenseToEdit={editingExpense}
          onClose={handleCloseModal}
        />
      </div>
    </Shell>
  );
}
