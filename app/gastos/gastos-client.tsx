"use client";

import { useMemo, useState } from "react";
import { Shell } from "@/components/layout/shell";
import dynamic from "next/dynamic";
const QuickAdd = dynamic(() => import("@/components/gastos/quick-add").then((mod) => mod.QuickAdd), { ssr: false });
import { MonthSelector } from "@/components/gastos/month-selector";
import { useExpenses, sumExpensesByType } from "@/hooks/use-expenses";
import {
  firstOfMonth,
  toISODate,
  formatUSD
} from "@/lib/format";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export default function GastosClient() {
  const [month, setMonth] = useState(() => firstOfMonth(new Date()));

  const { data: expenses = [], isLoading } = useExpenses(month);

  const { fixed, variable, total } = useMemo(() => sumExpensesByType(expenses), [expenses]);
  
  // Mock budget (puedes conectarlo a Supabase más adelante)
  const budgetFijos = 1500000;
  const budgetVariables = 1500000;
  
  const pctFijos = Math.min(100, Math.round((fixed / budgetFijos) * 100));
  const pctVariables = Math.min(100, Math.round((variable / budgetVariables) * 100));

  const quickAddBtn = (
    <button className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-rose-500/20">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4"/></svg>
      Nuevo Gasto
    </button>
  );

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
              <MonthSelector month={month} onChange={setMonth} />
              <QuickAdd customTrigger={quickAddBtn} />
            </div>
          </div>
        </div>

        {/* Smart Insights Gastos */}
        <div className="relative z-10 animate-fade-in delay-1">
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
            <div id="insight-g1" className="min-w-[320px] max-w-[340px] rounded-2xl p-4 border card-hover flex-shrink-0 relative" style={{ background: "linear-gradient(135deg, rgba(244,63,94,0.08), rgba(225,29,72,0.04))", borderColor: "rgba(244,63,94,0.15)" }}>
              <button className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(244,63,94,0.15)" }}>
                  <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                </div>
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Alerta Presupuesto</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">Alcanzaste el <span className="text-rose-400 font-semibold">90%</span> de tu presupuesto en Comida. Te quedan $15.000.</p>
            </div>
            <div id="insight-g2" className="min-w-[320px] max-w-[340px] rounded-2xl p-4 border card-hover flex-shrink-0 relative" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(20,184,166,0.04))", borderColor: "rgba(16,185,129,0.15)" }}>
              <button className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Sugerencia de Ahorro</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">Tus gastos en Transporte bajaron un 15%. Considerá destinar la diferencia al Ahorro.</p>
            </div>
          </div>
        </div>

        {/* Summary + Calendar */}
        <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-6 animate-fade-in delay-1">
          {/* Gastos Fijos */}
          <div className="rounded-2xl p-6 border card-hover flex flex-col justify-between" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)" }}>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(244,63,94,0.1)" }}><svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg></div>
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
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,158,11,0.1)" }}><svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/></svg></div>
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

          {/* Calendario de Pagos */}
          <div className="rounded-2xl p-6 border md:row-span-2 card-hover flex flex-col" style={{ background: "#1F2229", borderColor: "rgba(255,255,255,0.06)", height: "100%" }}>
            <div className="flex-none">
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                Calendario de Pagos
              </h3>
              {/* Mini Cal estático (como en HTML) */}
              <div className="grid grid-cols-7 gap-1.5 text-xs text-center mb-6 bg-white/[0.01] rounded-xl p-3 border border-white/[0.02]">
                <span className="text-slate-500 font-semibold mb-2">Lu</span><span className="text-slate-500 font-semibold mb-2">Ma</span><span className="text-slate-500 font-semibold mb-2">Mi</span><span className="text-slate-500 font-semibold mb-2">Ju</span><span className="text-slate-500 font-semibold mb-2">Vi</span><span className="text-slate-500 font-semibold mb-2">Sá</span><span className="text-slate-500 font-semibold mb-2">Do</span>
                <span className="text-slate-500 py-2">1</span><span className="text-slate-500 py-2">2</span><span className="text-slate-500 py-2">3</span><span className="text-slate-500 py-2">4</span><span className="text-slate-500 py-2">5</span><span className="text-slate-500 py-2">6</span><span className="text-slate-500 py-2">7</span>
                <span className="text-slate-500 py-2">8</span><span className="text-slate-500 py-2">9</span><span className="text-slate-500 py-2">10</span><span className="text-slate-500 py-2">11</span><span className="text-slate-500 py-2">12</span><span className="text-slate-500 py-2">13</span><span className="text-slate-500 py-2">14</span>
                <span className="text-rose-400 font-bold py-2 bg-rose-500/10 rounded-lg shadow-sm">15</span><span className="text-slate-500 py-2">16</span><span className="text-slate-500 py-2">17</span><span className="text-slate-500 py-2">18</span><span className="text-slate-500 py-2">19</span><span className="text-emerald-400 font-bold py-2 bg-emerald-500/10 rounded-lg shadow-sm">20</span><span className="text-slate-500 py-2">21</span>
                <span className="text-emerald-400 font-bold py-2 bg-emerald-500/10 rounded-lg shadow-sm">22</span><span className="text-slate-500 py-2">23</span><span className="text-slate-500 py-2">24</span><span className="text-emerald-400 font-bold py-2 bg-emerald-500/10 rounded-lg shadow-sm">25</span><span className="text-slate-500 py-2">26</span><span className="text-slate-500 py-2">27</span><span className="text-slate-500 py-2">28</span>
                <span className="text-slate-500 py-2">29</span><span className="text-slate-500 py-2">30</span><span className="py-2"></span><span className="py-2"></span><span className="py-2"></span><span className="py-2"></span><span className="py-2"></span>
              </div>
            </div>
            
            {/* Bills - Dynamic mapped from expenses */}
            <div className="flex flex-col justify-between flex-1 gap-3">
              {isLoading ? (
                <div className="text-center text-slate-500 text-sm mt-4">Cargando...</div>
              ) : expenses.length === 0 ? (
                <div className="text-center text-slate-500 text-sm mt-4">No hay pagos registrados.</div>
              ) : (
                expenses.slice(0, 4).map(exp => (
                  <div key={exp.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/[0.04]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/[0.03] flex items-center justify-center border border-white/[0.05]">
                        <p className="text-xs font-bold text-slate-300">{format(parseISO(exp.date), "dd")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-200 font-medium capitalize">{exp.category.replace(/_/g, " ")}</p>
                        <p className="text-[11px] text-slate-500">{format(parseISO(exp.date), "MMM dd")}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white tnum font-bold">{formatUSD(exp.amount, false)}</p>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 mt-1 inline-block">Pagado</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
