const fs = require('fs');

const FILE_PATH = 'smart-insights-prototype.html';
let html = fs.readFileSync(FILE_PATH, 'utf8');

// --- 1. Dashboard: S&P500 line + Progreso Metas + Liquidez ---
html = html.replace(
  /<!-- Charts Row -->[\s\S]*?(?=<!-- Activity Feed -->)/,
  `<!-- Charts Row -->
  <div class="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-4 mb-7 animate-fade-in delay-3">
    <!-- Metas Principales -->
    <div class="rounded-2xl p-5 border card-hover flex flex-col justify-between" style="background:#1F2229; border-color:rgba(255,255,255,0.06);">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold text-white">Metas Principales</h3>
        <span class="text-[10px] bg-violet-500/15 text-violet-400 px-2 py-0.5 rounded-full font-bold">2 Activas</span>
      </div>
      <div class="space-y-4">
        <div>
          <div class="flex justify-between text-xs mb-1.5">
            <span class="text-white font-medium">Fondo de Emergencia</span>
            <span class="text-emerald-400 font-semibold">75%</span>
          </div>
          <div class="w-full h-1.5 rounded-full bg-white/[0.06]">
            <div class="h-1.5 rounded-full bg-emerald-400" style="width:75%"></div>
          </div>
        </div>
        <div>
          <div class="flex justify-between text-xs mb-1.5">
            <span class="text-white font-medium">Viaje a Europa</span>
            <span class="text-blue-400 font-semibold">35%</span>
          </div>
          <div class="w-full h-1.5 rounded-full bg-white/[0.06]">
            <div class="h-1.5 rounded-full bg-blue-400" style="width:35%"></div>
          </div>
        </div>
      </div>
      <button onclick="navigateTo('metas')" class="mt-4 w-full py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors border border-white/[0.06]">Ver todas</button>
    </div>
    
    <!-- Proyección de Liquidez -->
    <div class="rounded-2xl p-5 border card-hover flex flex-col justify-between relative overflow-hidden" style="background: linear-gradient(135deg, #1F2229, rgba(16,185,129,0.05)); border-color:rgba(255,255,255,0.06);">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold text-white">Liquidez a 30 días</h3>
        <div class="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <svg class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
        </div>
      </div>
      <div class="relative z-10">
        <p class="text-xs text-slate-400 mb-1 font-medium">Sobrante proyectado</p>
        <p class="text-3xl font-extrabold text-white tnum">$1,240.00</p>
        <p class="text-[11px] text-emerald-400 mt-2 font-medium flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg>
          Cobertura de fijos 100% asegurada
        </p>
      </div>
      <div class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-50"></div>
    </div>

    <!-- Line Chart (2 Lines) -->
    <div class="rounded-2xl p-5 border card-hover" style="background:#1F2229; border-color:rgba(255,255,255,0.06);">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold text-white">Rendimiento</h3>
        <div class="flex items-center gap-3 text-[10px]">
          <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-violet-500"></span><span class="text-slate-300 font-medium">Portfolio</span></div>
          <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-slate-500"></span><span class="text-slate-400 font-medium">S&P 500</span></div>
        </div>
      </div>
      <svg viewBox="0 0 400 180" class="w-full">
        <defs>
          <linearGradient id="lineGrad1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <!-- Grid -->
        <line x1="40" y1="20" x2="40" y2="150" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
        <line x1="40" y1="150" x2="380" y2="150" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
        <line x1="40" y1="85" x2="380" y2="85" stroke="rgba(255,255,255,0.04)" stroke-width="1" stroke-dasharray="4"/>
        <line x1="40" y1="52" x2="380" y2="52" stroke="rgba(255,255,255,0.04)" stroke-width="1" stroke-dasharray="4"/>
        <line x1="40" y1="118" x2="380" y2="118" stroke="rgba(255,255,255,0.04)" stroke-width="1" stroke-dasharray="4"/>
        <!-- Axis labels -->
        <text x="40" y="168" fill="#64748b" font-size="9" font-family="Inter">Ene</text>
        <text x="100" y="168" fill="#64748b" font-size="9" font-family="Inter">Feb</text>
        <text x="160" y="168" fill="#64748b" font-size="9" font-family="Inter">Mar</text>
        <text x="220" y="168" fill="#64748b" font-size="9" font-family="Inter">Abr</text>
        <text x="280" y="168" fill="#64748b" font-size="9" font-family="Inter">May</text>
        <text x="340" y="168" fill="#64748b" font-size="9" font-family="Inter">Jun</text>
        <text x="12" y="153" fill="#64748b" font-size="9" font-family="Inter">0%</text>
        <text x="12" y="88" fill="#64748b" font-size="9" font-family="Inter">2%</text>
        <text x="12" y="25" fill="#64748b" font-size="9" font-family="Inter">4%</text>
        <!-- Area Portfolio -->
        <path d="M40,130 L108,115 L176,100 L244,85 L312,60 L380,35 L380,150 L40,150 Z" fill="url(#lineGrad1)"/>
        <!-- Line S&P 500 -->
        <path d="M40,140 L108,130 L176,118 L244,110 L312,95 L380,85" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-draw" stroke-dasharray="4"/>
        <!-- Line Portfolio -->
        <path d="M40,130 L108,115 L176,100 L244,85 L312,60 L380,35" fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="animate-draw"/>
        <!-- Dots -->
        <circle cx="380" cy="35" r="4" fill="#8b5cf6"/>
        <circle cx="380" cy="35" r="8" fill="#8b5cf6" opacity="0.2"/>
        <circle cx="380" cy="85" r="3" fill="#64748b"/>
      </svg>
    </div>
  </div>
  `
);

// --- 2. Gastos: Header Button + Smart Insights ---
html = html.replace(
  /<div class="flex items-center justify-between">\s*<div>\s*<h1 class="text-2xl font-bold text-white mb-1">Egresos de Junio<\/h1>\s*<span class="text-3xl font-extrabold text-white tnum">\$1,909.070<\/span>\s*<\/div>\s*<select[^>]*>[\s\S]*?<\/select>\s*<\/div>/,
  `<div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-white mb-1">Egresos de Junio</h1>
          <span class="text-3xl font-extrabold text-white tnum">$1,909.070</span>
        </div>
        <div class="flex items-center gap-3">
          <select class="bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-slate-300 outline-none focus:border-violet-500/50">
            <option>Junio 2026</option>
            <option>Mayo 2026</option>
          </select>
          <button class="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-rose-500/20">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M12 4v16m8-8H4"/></svg>
            Nuevo Gasto
          </button>
        </div>
      </div>`
);

// Insert Smart Insights before Summary + Calendar
html = html.replace(
  /<!-- Summary \+ Calendar -->/,
  `<!-- Smart Insights Gastos -->
    <div class="relative z-10 mb-7 animate-fade-in delay-1">
      <div class="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
        <div id="insight-g1" class="min-w-[320px] max-w-[340px] rounded-2xl p-4 border card-hover flex-shrink-0 relative" style="background: linear-gradient(135deg, rgba(244,63,94,0.08), rgba(225,29,72,0.04)); border-color: rgba(244,63,94,0.15);">
          <button onclick="dismissInsight('insight-g1')" class="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          <div class="flex items-center gap-2 mb-2.5">
            <div class="w-7 h-7 rounded-lg flex items-center justify-center" style="background: rgba(244,63,94,0.15);">
              <svg class="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
            <span class="text-xs font-bold text-rose-400 uppercase tracking-wider">Alerta Presupuesto</span>
          </div>
          <p class="text-sm text-slate-300 leading-relaxed">Alcanzaste el <span class="text-rose-400 font-semibold">90%</span> de tu presupuesto en Comida. Te quedan $15.000.</p>
        </div>
        <div id="insight-g2" class="min-w-[320px] max-w-[340px] rounded-2xl p-4 border card-hover flex-shrink-0 relative" style="background: linear-gradient(135deg, rgba(16,185,129,0.08), rgba(20,184,166,0.04)); border-color: rgba(16,185,129,0.15);">
          <button onclick="dismissInsight('insight-g2')" class="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          <div class="flex items-center gap-2 mb-2.5">
            <div class="w-7 h-7 rounded-lg flex items-center justify-center" style="background: rgba(16,185,129,0.15);">
              <svg class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <span class="text-xs font-bold text-emerald-400 uppercase tracking-wider">Sugerencia de Ahorro</span>
          </div>
          <p class="text-sm text-slate-300 leading-relaxed">Tus gastos en Transporte bajaron un 15%. Considerá destinar la diferencia al Ahorro.</p>
        </div>
      </div>
    </div>

    <!-- Summary + Calendar -->`
);

// Scale up Gastos Cards
html = html.replace(/<div class="rounded-2xl p-5 border card-hover"/g, '<div class="rounded-2xl p-6 border card-hover"');

// Gastos Donut List update with amounts
html = html.replace(
  /<div class="flex flex-col gap-2 text-xs">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<!-- Movimientos Recientes -->/,
  `<div class="flex flex-col gap-3 flex-1 text-xs">
            <div class="flex items-center justify-between border-b border-white/[0.04] pb-2"><div class="flex items-center gap-2.5"><span class="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span><span class="text-slate-300 font-medium text-sm">Comida</span></div><div class="flex items-center gap-4"><span class="text-slate-500 tnum">32.56%</span><span class="text-white font-bold tnum">$621.500</span></div></div>
            <div class="flex items-center justify-between border-b border-white/[0.04] pb-2"><div class="flex items-center gap-2.5"><span class="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span><span class="text-slate-300 font-medium text-sm">Alquiler</span></div><div class="flex items-center gap-4"><span class="text-slate-500 tnum">29.76%</span><span class="text-white font-bold tnum">$568.100</span></div></div>
            <div class="flex items-center justify-between border-b border-white/[0.04] pb-2"><div class="flex items-center gap-2.5"><span class="w-3 h-3 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]"></span><span class="text-slate-300 font-medium text-sm">Servicios</span></div><div class="flex items-center gap-4"><span class="text-slate-500 tnum">25.33%</span><span class="text-white font-bold tnum">$483.500</span></div></div>
            <div class="flex items-center justify-between border-b border-white/[0.04] pb-2"><div class="flex items-center gap-2.5"><span class="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span><span class="text-slate-300 font-medium text-sm">Transporte</span></div><div class="flex items-center gap-4"><span class="text-slate-500 tnum">17.0%</span><span class="text-white font-bold tnum">$324.500</span></div></div>
            <div class="flex items-center justify-between"><div class="flex items-center gap-2.5"><span class="w-3 h-3 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]"></span><span class="text-slate-300 font-medium text-sm">Otros</span></div><div class="flex items-center gap-4"><span class="text-slate-500 tnum">10.23%</span><span class="text-white font-bold tnum">$195.300</span></div></div>
          </div>
        </div>
      </div>
      <!-- Movimientos Recientes -->`
);

// --- 3. Inversiones: Header Dropdown ---
html = html.replace(
  /<h1 class="text-2xl font-bold text-white">Centro de Inversiones Profesional<\/h1>/,
  `<div class="flex items-center justify-between w-full">
        <h1 class="text-2xl font-bold text-white">Centro de Inversiones Profesional</h1>
        <select class="bg-[#1F2229] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm font-medium text-white outline-none focus:border-violet-500/50 shadow-sm">
          <option>Portfolio Principal</option>
          <option>Criptomonedas</option>
          <option>Renta Fija</option>
        </select>
      </div>`
);

// Inversiones: Big Donut Chart
html = html.replace(
  /<svg viewBox="0 0 240 240" class="w-52 h-52">[\s\S]*?<\/svg>/,
  `<svg viewBox="0 0 320 320" class="w-72 h-72">
            <circle cx="160" cy="160" r="100" fill="none" stroke="#6366f1" stroke-width="36" stroke-dasharray="219.91 408.41" stroke-dashoffset="0" transform="rotate(-90 160 160)" class="donut-segment"/>
            <circle cx="160" cy="160" r="100" fill="none" stroke="#f59e0b" stroke-width="36" stroke-dasharray="175.93 452.39" stroke-dashoffset="-219.91" transform="rotate(-90 160 160)" class="donut-segment"/>
            <circle cx="160" cy="160" r="100" fill="none" stroke="#10b981" stroke-width="36" stroke-dasharray="125.66 502.66" stroke-dashoffset="-395.84" transform="rotate(-90 160 160)" class="donut-segment"/>
            <circle cx="160" cy="160" r="100" fill="none" stroke="#ec4899" stroke-width="36" stroke-dasharray="106.81 521.51" stroke-dashoffset="-521.5" transform="rotate(-90 160 160)" class="donut-segment"/>
            <!-- Labels -->
            <text x="270" y="60" fill="#6366f1" font-size="13" font-weight="700" font-family="Inter">AAPL</text>
            <text x="270" y="78" fill="#94a3b8" font-size="11" font-family="Inter">35%</text>
            <polyline points="230 90 260 70 265 70" fill="none" stroke="#6366f1" stroke-width="1.5" opacity="0.6"/>
            <text x="280" y="250" fill="#f59e0b" font-size="13" font-weight="700" font-family="Inter">BTC</text>
            <text x="280" y="268" fill="#94a3b8" font-size="11" font-family="Inter">28%</text>
            <polyline points="220 230 265 250 275 250" fill="none" stroke="#f59e0b" stroke-width="1.5" opacity="0.6"/>
            <text x="20" y="260" fill="#10b981" font-size="13" font-weight="700" font-family="Inter">VOO</text>
            <text x="20" y="278" fill="#94a3b8" font-size="11" font-family="Inter">20%</text>
            <polyline points="100 240 60 260 50 260" fill="none" stroke="#10b981" stroke-width="1.5" opacity="0.6"/>
            <text x="15" y="70" fill="#ec4899" font-size="13" font-weight="700" font-family="Inter">TSLA</text>
            <text x="15" y="88" fill="#94a3b8" font-size="11" font-family="Inter">17%</text>
            <polyline points="100 80 60 70 50 70" fill="none" stroke="#ec4899" stroke-width="1.5" opacity="0.6"/>
            <!-- Center -->
            <text x="160" y="155" text-anchor="middle" fill="white" font-size="18" font-weight="800" font-family="Inter">$10,500</text>
            <text x="160" y="175" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="Inter">Total invertido</text>
          </svg>`
);

// --- 4. Metas: Redesign to match App ---
html = html.replace(
  /<!-- Quest Board -->[\s\S]*?(?=<!-- ===================== VIEW: CONFIGURACIÓN)/,
  `<!-- Quest Board -->
    <div class="mb-4 animate-fade-in delay-1">
      <div class="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] p-1 w-fit">
        <button class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition bg-violet-500/15 text-violet-300 border-violet-500/25">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          Largo Plazo
          <span class="rounded-full px-1.5 text-[9px] bg-black/30">2</span>
        </button>
        <button class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition border-transparent text-slate-400 hover:text-white">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/></svg>
          Corto Plazo
          <span class="rounded-full px-1.5 text-[9px] bg-white/5">1</span>
        </button>
      </div>
      <p class="mt-2 text-[11px] text-slate-500">Objetivos a largo plazo para asegurar tu futuro financiero.</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 animate-fade-in delay-2">
      <!-- Goal 1 -->
      <div class="rounded-2xl border p-5 flex flex-col justify-between card-hover relative overflow-hidden" style="background:#1F2229; border-color:rgba(255,255,255,0.06); min-height: 220px;">
        <div>
          <div class="flex items-start justify-between mb-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20">
              <span class="text-lg">🛡️</span>
            </div>
            <button class="text-slate-500 hover:text-white transition-colors"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg></button>
          </div>
          <h3 class="text-base font-bold text-white leading-tight">Fondo de Emergencia</h3>
          <p class="text-xs text-slate-500 mt-1 line-clamp-2">Ahorro para cubrir 6 meses de gastos básicos.</p>
        </div>
        <div class="mt-4">
          <div class="flex justify-between items-end mb-2">
            <div>
              <p class="text-lg font-bold text-white tnum">$4,500.00</p>
              <p class="text-[10px] text-slate-500">de $6,000.00</p>
            </div>
            <span class="text-sm font-bold text-violet-400 tnum">75.0%</span>
          </div>
          <div class="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div class="h-full rounded-full bg-violet-500" style="width:75%"></div>
          </div>
        </div>
      </div>

      <!-- Goal 2 -->
      <div class="rounded-2xl border p-5 flex flex-col justify-between card-hover relative overflow-hidden" style="background:#1F2229; border-color:rgba(255,255,255,0.06); min-height: 220px;">
        <div>
          <div class="flex items-start justify-between mb-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
              <span class="text-lg">✈️</span>
            </div>
            <button class="text-slate-500 hover:text-white transition-colors"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg></button>
          </div>
          <h3 class="text-base font-bold text-white leading-tight">Viaje a Europa</h3>
          <p class="text-xs text-slate-500 mt-1 line-clamp-2">Vacaciones soñadas 2027.</p>
        </div>
        <div class="mt-4">
          <div class="flex justify-between items-end mb-2">
            <div>
              <p class="text-lg font-bold text-white tnum">$1,750.00</p>
              <p class="text-[10px] text-slate-500">de $5,000.00</p>
            </div>
            <span class="text-sm font-bold text-emerald-400 tnum">35.0%</span>
          </div>
          <div class="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div class="h-full rounded-full bg-emerald-400" style="width:35%"></div>
          </div>
        </div>
      </div>

      <!-- New Goal Placeholder -->
      <div class="rounded-2xl border border-dashed p-5 flex flex-col items-center justify-center card-hover cursor-pointer text-center" style="background:rgba(255,255,255,0.02); border-color:rgba(255,255,255,0.1); min-height: 220px;">
        <div class="w-12 h-12 rounded-full bg-white/[0.05] flex items-center justify-center mb-3">
          <svg class="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 4v16m8-8H4"/></svg>
        </div>
        <h3 class="text-sm font-bold text-white">Nueva Meta</h3>
        <p class="text-xs text-slate-500 mt-1">Crear un nuevo objetivo</p>
      </div>
    </div>
  </div>
</section>
`
);

// --- 5. Configuración: Redesign ---
html = html.replace(
  /<div class="grid grid-cols-2 gap-6">[\s\S]*?(?=<\/main>)/,
  `<div class="flex gap-8">
      <!-- Left Sidebar Interno -->
      <div class="w-64 flex-shrink-0 animate-fade-in delay-1">
        <div class="flex flex-col gap-1">
          <button class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-white/[0.08] text-white w-full text-left transition-colors">
            <svg class="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            Mi Perfil
          </button>
          <button class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/[0.04] hover:text-white w-full text-left transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            Seguridad y Passkeys
          </button>
          <button class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/[0.04] hover:text-white w-full text-left transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            Notificaciones
          </button>
          <button class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/[0.04] hover:text-white w-full text-left transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
            Tarjetas y Bancos
          </button>
          <button class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/[0.04] hover:text-white w-full text-left transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>
            Apariencia
          </button>
        </div>
      </div>

      <!-- Right Panel -->
      <div class="flex-1 animate-fade-in delay-2">
        <div class="rounded-2xl border bg-[#1F2229] border-white/[0.06] overflow-hidden">
          <div class="p-6 border-b border-white/[0.06]">
            <h2 class="text-lg font-bold text-white">Seguridad y Passkeys</h2>
            <p class="text-sm text-slate-400 mt-1">Protegé tu cuenta con métodos de autenticación avanzados y sin contraseñas.</p>
          </div>
          
          <div class="p-6">
            <!-- Passkeys Section -->
            <div class="mb-8">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h3 class="text-sm font-semibold text-white">Passkeys (Recomendado)</h3>
                  <p class="text-xs text-slate-500">Iniciá sesión usando tu huella, rostro o PIN del dispositivo.</p>
                </div>
                <button class="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-xs font-semibold rounded-lg transition-colors">
                  Agregar Passkey
                </button>
              </div>
              
              <div class="rounded-xl border border-white/[0.08] bg-white/[0.02]">
                <div class="flex items-center justify-between p-4 border-b border-white/[0.04]">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center">
                      <svg class="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-white">iPhone de Lautaro</p>
                      <p class="text-[11px] text-slate-500">Agregado el 15 May 2026</p>
                    </div>
                  </div>
                  <button class="text-slate-500 hover:text-rose-400 transition-colors">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
                <div class="flex items-center justify-between p-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center">
                      <svg class="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-white">MacBook Pro</p>
                      <p class="text-[11px] text-slate-500">Agregado el 12 Abr 2026</p>
                    </div>
                  </div>
                  <button class="text-slate-500 hover:text-rose-400 transition-colors">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Contraseña -->
            <div>
              <h3 class="text-sm font-semibold text-white mb-4">Contraseña Tradicional</h3>
              <div class="flex items-center justify-between p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                <div>
                  <p class="text-sm font-medium text-white">••••••••••••</p>
                  <p class="text-[11px] text-slate-500 mt-1">Última actualización hace 3 meses</p>
                </div>
                <button class="px-4 py-2 border border-white/[0.1] hover:bg-white/[0.04] text-white text-xs font-semibold rounded-lg transition-colors">
                  Cambiar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

</main>`
);

fs.writeFileSync(FILE_PATH, html);
console.log('Done modifying HTML!');
