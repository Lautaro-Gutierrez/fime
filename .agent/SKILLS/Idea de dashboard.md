\# FiMe — Módulo 0: Dashboard (Financial Command Center)



\## Contexto



Estás trabajando sobre FiMe, una app de finanzas personales ya construida con los siguientes módulos:



\* M1: Gastos (`useExpenses`)

\* M2: Inversiones (`useInvestments`)

\* M3: Portfolio (`usePortfolio`)

\* M4: Ingresos (`useIncomes`)

\* M5: Metas (`useGoals`)

\* M6: Configuración (incluye Stealth Mode)



Stack:



\* Next.js 16 (App Router)

\* React 19

\* Tailwind v4

\* shadcn/ui (base-ui)

\* TanStack Query

\* Supabase (Realtime activo)

\* Recharts



\---



\## REGLAS CRÍTICAS (NO NEGOCIABLES)



1\. ❌ NO crear tablas nuevas en Supabase

2\. ❌ NO crear mutaciones

3\. ❌ NO duplicar lógica de negocio existente

4\. ✅ SOLO usar hooks existentes (M1–M5)

5\. ✅ Dashboard es \*\*read-only\*\*

6\. ✅ Todo debe actualizarse automáticamente vía Realtime



\---



\## Objetivo



Construir el \*\*Dashboard principal (`/`)\*\* como un \*Financial Command Center\*:



> Debe dar una visión instantánea del estado financiero y destacar qué requiere atención.



NO replicar pantallas de módulos.

SÍ sintetizar información entre módulos.



\---



\## Layout (Bento inteligente con jerarquía)



Desktop:



\* Hero (full width)

\* Row 2:



&#x20; \* Sankey (izquierda, protagonista)

&#x20; \* Portfolio snapshot (derecha)

\* Alerts (full width)

\* Goals strip (horizontal scroll)

\* Activity + Quick Actions



Mobile:



\* Stack vertical

\* Hero en grid 2x2

\* Mantener orden de prioridad



\---



\## Componentes a crear



```

app/page.tsx



components/dashboard/

&#x20; hero-kpis.tsx

&#x20; cashflow-sankey.tsx

&#x20; portfolio-snapshot.tsx

&#x20; alerts-panel.tsx

&#x20; goals-strip.tsx

&#x20; activity-feed.tsx

&#x20; quick-actions.tsx



lib/dashboard/

&#x20; alerts.ts

```



\---



\## 1. HERO — KPIs



\### Mostrar:



\* Patrimonio total (USD) → `usePortfolio`

\* Flujo libre del mes → ingresos - gastos

\* P\&L del portfolio (%)

\* Tasa de ahorro (%)



\### UX:



\* Card grande tipo Bento

\* Número principal con \*\*sparkline (últimos 7 días)\*\* usando snapshots

\* Sub-cards internas para los otros KPIs



\### Interacciones:



\* Click → navega al módulo correspondiente

\* Soportar Stealth Mode (ocultar valores)



\---



\## 2. CASHFLOW SANKEY (CORE DEL DASHBOARD)



\### Flujo:



Ingresos → Gastos por categoría → Ahorro → Portfolio



\### Datos:



\* `useIncomes`

\* `useExpenses`



\### Reglas:



\* Usar datos REALES del mes actual (no distribución ideal)

\* Categorías = las del M1



\### UX:



\* Hover → highlight + mostrar monto

\* Click en categoría → navegar a `/gastos` filtrado



\---



\## 3. PORTFOLIO SNAPSHOT



\### Mostrar:



\* Donut allocation (mini)

\* Total USD

\* Mini TWR chart (últimos 30 días, sin SP500)



\### Datos:



\* `usePortfolio`

\* `useSnapshots`



\### UX:



\* Click → `/portfolio`



\---



\## 4. ALERTS PANEL (ALTA PRIORIDAD)



Crear `lib/dashboard/alerts.ts`



\### Tipos de alertas:



1\. Meta con pacing negativo

2\. Meta próxima a vencer (<30 días y <80%)

3\. Categoría de gasto excedida vs promedio

4\. Plazo fijo por vencer (<15 días)

5\. Portfolio concentrado (>40% en un activo)



\### Output:



Array ordenado por prioridad



\### UI:



\* Pills (chips)

\* Color-coded:



&#x20; \* rojo = crítico

&#x20; \* amber = warning

&#x20; \* azul = info



\### UX:



\* Click → deep link al módulo correspondiente



\---



\## 5. GOALS STRIP



\### Mostrar:



\* Solo Main Quests activas

\* Progress rings (reutilizar componente de M5)



\### UX:



\* Scroll horizontal

\* Click → `/metas`



\---



\## 6. ACTIVITY FEED



\### Mostrar:



\* Últimas 5 operaciones combinadas:



&#x20; \* gastos

&#x20; \* inversiones



\### Lógica:



\* Merge arrays

\* Sort por fecha desc



\---



\## 7. QUICK ACTIONS



Botones:



\* "+ Gasto" → abre dialog de M1

\* "+ Inversión" → abre dialog de M2



\### Reglas:



\* NO navegar

\* Reusar dialogs existentes



\---



\## DISEÑO



\### Base:



\* slate / zinc (neutral)



\### Cards:



```

rounded-3xl border border-white/5 bg-card/60 backdrop-blur

```



\### Colores por widget:



\* Gastos → emerald

\* Inversiones → indigo/violet

\* Metas → amber



\### Hero glow:



radial-gradient sutil



\---



\## PERFORMANCE Y UX



\* Usar skeleton loaders (mismo tamaño que cards)

\* Evitar layout shift

\* Mantener alta densidad sin saturar



\---



\## DATA FLOW



NO crear queries nuevas complejas.



Usar:



\* usePortfolio

\* useExpenses

\* useIncomes

\* useGoals

\* useInvestments



Derivar datos en cliente.



\---



\## RESULTADO ESPERADO



Un dashboard que:



\* Muestra el estado financiero completo en segundos

\* Explica el flujo del dinero

\* Destaca problemas automáticamente

\* Permite actuar rápido (quick actions)

\* Se siente fluido y premium (tipo fintech moderna)



\---



\## IMPORTANTE



Si alguna parte requiere lógica nueva:



\* implementarla en `lib/dashboard/\*`

\* NO modificar lógica de módulos existentes



\---



