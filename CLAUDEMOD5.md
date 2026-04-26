# FiMe — Módulo 5 (Metas y Objetivos) · Sesión completa

Documentación de la sesión en que se construyó el **Módulo 5: Gestión de Metas y Objetivos**.

**Fecha:** abril 2026  
**Módulos tocados:** M5 (completo) · M3 (snapshots para ETA)

---

## 1. Alcance confirmado del módulo

**Tablero de misiones** con dos tipos de objetivos:
- **Main Quests** — metas de largo plazo (ahorro, pasivo, ingresos, ratios)
- **Side Quests** — compras puntuales (viajes, hardware, etc.)

**No calcula holdings ni P&L** (eso es M3). M5 es tracker de metas con **pacing + ETA**.

**Universo de 7 tipos de metas:**

| id | Tipo | Auto-tracked | Moneda | Supone asset link |
|---|---|---|---|---|
| `savings` | Ahorro a capital objetivo | portfolio_total o portfolio_subset | USD/ARS | ✓ |
| `purchase` | Compra puntual | portfolio (mismo) | USD/ARS | ✓ |
| `expense_cap` | Tope de gasto mensual | M1 categoría | ARS | ✗ |
| `income_target` | Ingreso mensual > X | M4 ingresos | ARS/USD | ✗ |
| `savings_rate` | Tasa ahorro/ingreso > X% | (ingresos − gastos) / ingresos | N/A | ✗ |
| `debt_payoff` | Saldar deuda | manual | ARS/USD | ✗ |
| `passive_income_target` | Retornos mensuales inversiones | M3 Δ portfolio − cashflows | USD | ✗ |

**Filosofía híbrida:**
- `source_type = null` → manual (`current_amount` editable)
- `source_type ≠ null` → auto-tracked desde M1/M3/M4

---

## 2. Schema — Migración `005_init_goals.sql`

```sql
-- Enums
create type public.goal_type as enum (
  'savings', 'purchase', 'expense_cap', 'income_target',
  'savings_rate', 'debt_payoff', 'passive_income_target'
);

create type public.goal_status as enum (
  'active', 'completed', 'paused', 'archived'
);

create type public.quest_type as enum ('main', 'side');

-- Tabla
create table public.goals (
  id              uuid primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  goal_type       public.goal_type not null,
  quest_type      public.quest_type not null default 'main',
  target_amount   numeric(20,4) not null check (target_amount > 0),
  currency        text check (currency is null or currency in ('USD','ARS')),
  current_amount  numeric(20,4) not null default 0,
  source_type     text,                          -- null (manual) | 'portfolio_total' | ...
  source_ref      text,                          -- categoría id, etc.
  linked_asset_keys text[] not null default '{}', -- positionKeys M3
  deadline        date,
  started_at      date not null default current_date,
  status          public.goal_status not null default 'active',
  priority        smallint not null default 0,
  color           text,
  icon            text,
  note            text,
  metadata        jsonb not null default '{}',
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Índices
create index goals_user_status_idx on public.goals (user_id, status);
create index goals_user_quest_idx on public.goals (user_id, quest_type);

-- RLS + Realtime habilitados (ver migración completa en repo)
```

---

## 3. Archivos creados

### `types/database.ts` (extensión)
Agregado: `GoalType`, `GoalStatus`, `QuestType` + tabla `goals` con Row/Insert/Update.

### `lib/goals.ts`
Catálogo de 7 metas con config completa:
- id, label, short, description
- color (hex), bgClass, textClass, borderClass, glowClass (Tailwind)
- icon (Lucide)
- defaultCurrency, supportedCurrencies
- supportsAssetLink (boolean)
- defaultQuestType
- availableSourceTypes (array de SourceTypeId)
- isPercentage (para savings_rate)

Exporta:
- `GOALS` array
- `GOALS_BY_ID` map
- `QUEST_LABELS`, `QUEST_DESCRIPTIONS` — etiquetas para tabs
- `SOURCE_TYPE_LABELS` — nombres de fuentes auto-tracked
- `MILESTONES = [25, 50, 75]` — constante para ring visual

### `lib/goals/progress.ts`
**Core de lógica:**

```ts
type ProgressContext = {
  portfolioTotalUsd?: number;
  valuedHoldings?: ValuedHolding[];     // M3 holdings valuados
  expensesCurrentMonth?: { byCategory: Record<string, number>; total: number };  // M1
  incomesCurrentMonthArs?: number;      // M4
  passiveIncomeMonthlyUsd?: number;     // Δ portfolio − cashflows del mes
  snapshots?: { date: string; total_usd: number }[];  // M3 snapshots para ETA
};

type GoalProgress = {
  current: number;
  target: number;
  pct: number;       // 0..100 (para ring)
  rawPct: number;    // sin cap (overshoot)
  remaining: number;
  isManual: boolean;
  isInverted: boolean;  // expense_cap
  pace?: GoalPace;
  eta?: GoalEta;
};
```

**`computeGoalProgress(goal, ctx)`:**
1. Calcula `current_amount` combinando fuente + contexto
2. Computa pct vs target
3. Calcula pacing (ritmo USD/mes)
4. Estima ETA para stock goals

**ETA calculation (bugfix importante):**
- Para `portfolio_total`: busca snapshot previo a `started_at` y calcula `Δ = actual − snapshot.total_usd` (en lugar de `actual / daysPassed`, que sobreestimaba si el portfolio ya existía)
- Requiere mínimo 7 días de historia para extrapolar
- Para `portfolio_subset`: sin pace (no hay snapshot de subsets)
- Para manual: pace desde 0, mínimo 7 días

### `hooks/use-goals.ts`
- `useGoals()` — fetch all + Realtime (con `useId()` fix M3)
- `useCreateGoal()`, `useUpdateGoal()`, `useDeleteGoal()` mutations
- Query key: `["goals"]`
- Realtime: `postgres_changes` en tabla `goals`, invalida query automáticamente

### Componentes — `components/metas/*`

| Archivo | Qué hace |
|---|---|
| `progress-ring.tsx` | SVG ring circular con stroke-dasharray. Milestones 25/50/75 como puntos. Colores dinámicos (isInverted). Glow drop-shadow. |
| `header.tsx` | Hero con amber glow. Pill "MISIONES". 4 stats: Main/Side/Completadas/% avg. Botón CTA "+ Nueva misión" (gradient amber→orange). |
| `goal-card.tsx` | Card con ring (148px). Info: nombre, tipo, moneda. Stats: actual/objetivo. Pacing + ETA pills (con iconos 🚀/⚠️). Quick-add buttons +10/+50/+100 (escalan con target). Edit/Delete buttons. |
| `quest-board.tsx` | Tabs Main/Side. Grid de cards (2 col desktop, 1 mobile). Empty state con CTA. AnimatePresence para transición smooth. |
| `new-goal-dialog.tsx` | 2 pasos: Step 1 grid de 7 metas (cards con icon/label), Step 2 form dinámico. Form campos: name, target, currency toggle, quest_type toggle, source_type picker, category picker (expense_cap), asset picker (portfolio_subset), current_amount (manual), deadline, note. |
| `edit-goal-dialog.tsx` | Reutiliza `GoalFormBody`. Prefill desde goal existente. Botón "Actualizar". |

### `app/metas/page.tsx`
**Orquestador principal:**
1. Fetch goals (`useGoals`)
2. Fetch portfolio (`usePortfolio`) — holdings + snapshots + totals
3. Fetch gastos del mes (`useExpenses`)
4. Fetch ingresos del mes (`useIncomes`)
5. Computa `passiveIncomeMonthly` = Δ portfolio − cashflows del mes
6. Build `ProgressContext` con todos los datos
7. Para cada goal: `computeGoalProgress(goal, ctx)`
8. Renderiza: Header + QuestBoard (Main/Side tabs)
9. Maneja dialogs: NewGoalDialog + EditGoalDialog
10. Quick-add handler → `updateGoal` mutation

---

## 4. Design System — Paleta Amber/Orange

**Identidad del módulo:**
- CTA buttons: `bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/25`
- Header glow: radial amber → orange
- Dot pulsante: `bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]`
- Icon cards: amber/orange/rose/lime/yellow/red/fuchsia por tipo (cada meta tiene color propio)

**Patrones compartidos con M1/M2:**
- Cards: `rounded-3xl border border-white/5 bg-card/60 backdrop-blur`
- Hero header: uppercase pill + h1 gradient + ambient glow
- Form inputs: `h-11 rounded-xl border-white/5 bg-card/60 backdrop-blur focus-visible:border-white/20`
- Dialog: `max-w-lg border-white/5 bg-card/95 backdrop-blur-xl`

---

## 5. Decisiones de producto confirmadas

| Decisión | Valor |
|---|---|
| Método de tracking | Filosofía C híbrida (manual + auto-tracked) |
| ETA | ✅ en V1 (para stock goals) |
| Pacing | ✅ en V1 (ritmo USD/mes o ARS/mes) |
| Milestones | Visuales en el ring (25/50/75), sin toasts |
| Quick-add | Botones +10/+50/+100 (escalables con target) |
| Asset linking | ✅ soportado (`linked_asset_keys` text[]) |
| Monedas | USD para savings/purchase/passive; ARS para expense_cap/income_target; ambas en debt_payoff |
| Realtime | ✅ habilitado via Supabase channels |
| Datos históricos | Forward-looking desde first snapshot (V2 backfill) |
| Main/Side Quests | Tabs intercambiables en el board |

---

## 6. Bugs encontrados y arreglados en sesión

### Bug 1: ETA inflada para metas portfolio_total

**Síntoma:** Meta creada hoy sobre portfolio con $1.393 USD mostraba ETA = "jul 2026" (70 días).

**Causa raíz:** `computePace` hacía `perDay = current / daysPassed = $1.393 / 1 = $1.393/day`. El portfolio ya existía (no empezó en 0), pero el cálculo asumía que todo el capital se acumuló en 1 día.

**Fix aplicado:**
- Para `portfolio_total` goals, buscar snapshot anterior a `goal.started_at`
- Calcular `Δ = actual − snapshot.total_usd` (delta real vs valor inicial)
- Requerir mínimo 7 días de historia para extrapolar
- Sin snapshot previo o daysPassed < 7 → ETA = undefined (no hay datos suficientes)

**Archivo corregido:** `lib/goals/progress.ts`

### Bug 2: Spacing del header stats

**Síntoma:** Labels y números en el header estaban visualmente "pegados" (label y número en línea).

**Fix aplicado:**
- Cambié layout: `inline-flex` → `flex flex-col gap-2`
- Padding: `px-3 py-2.5` → `px-4 py-3`
- Número: `text-xl` → `text-2xl`
- Label y número ahora tienen separación clara

**Archivo corregido:** `components/metas/header.tsx`

### Bug 3: Label confuso

**Síntoma:** El usuario pidió cambiar "TABLERO DE MISIONES" a "MISIONES" (más conciso).

**Fix:** Cambié el texto del pill en el header.

**Archivo corregido:** `components/metas/header.tsx`

---

## 7. Pendientes para V2+

- **Backfill histórico:** V1 es forward-looking. V2 puede importar snapshots previas de goals.
- **Tabla de snapshots por meta:** Para `portfolio_subset` goals, trackear el valor del subset en el tiempo (ahora no hay historia).
- **Vistas Completadas/Archivadas:** Tab adicional para goals con status != 'active'.
- **Integración bond_ar:** Metas de bonos requieren `residual_factor` para valuación correcta post-amortizaciones.
- **Refactor parseNumber:** Está duplicado 6 veces en el codebase. Centralizar en `lib/parse.ts`.
- **CSV export:** Exportar goals a CSV con histórico de progreso.
- **Notificaciones:** Toast/push cuando se cumpla una meta o se alcance un milestone.
- **Limpieza de metadata:** El campo es flexible pero V2 puede documentar los tipos esperados por goal_type.

---

## 8. Estructura de archivos final

```
fime/
├── supabase/migrations/
│   └── 005_init_goals.sql              🆕 schema goals
├── types/database.ts                   ✏️ +GoalType, GoalStatus, QuestType
├── lib/
│   ├── goals.ts                        🆕 catálogo 7 tipos + SOURCE_TYPE_LABELS
│   └── goals/
│       └── progress.ts                 🆕 computeGoalProgress + pacing + ETA
├── hooks/
│   └── use-goals.ts                    🆕 CRUD + Realtime
├── components/
│   └── metas/
│       ├── progress-ring.tsx           🆕 SVG ring + milestones
│       ├── header.tsx                  🆕 hero amber + stats
│       ├── goal-card.tsx               🆕 card con ring + ETA + quick-add
│       ├── quest-board.tsx             🆕 tabs Main/Side + grid
│       ├── new-goal-dialog.tsx         🆕 2 pasos + asset picker
│       └── edit-goal-dialog.tsx        🆕 form edit
├── app/
│   └── metas/
│       └── page.tsx                    🆕 orquestador
└── components/layout/shell.tsx         ✏️ /metas enabled
```

---

## 9. Testing checklist

- [ ] Crear meta manual (`savings`, USD): cargar current_amount, ver progreso en ring
- [ ] Crear meta auto (`portfolio_total`): verificar que ETA aparece tras 7+ días
- [ ] Meta con `portfolio_subset`: linkar 2 activos, ver progreso solo sobre esos
- [ ] Meta `expense_cap`: linkar categoría de M1, ver progreso vs tope
- [ ] Meta `income_target`: linkar a M4, ver progreso vs ingreso del mes
- [ ] Meta `passive_income_target`: verificar que Δ portfolio − cashflows es correcto
- [ ] Quick-add buttons: +10, +50, +100 (escalar si target > 100k)
- [ ] Tabs Main/Side Quests: filtrar correctamente
- [ ] Edit goal: cambiar valores y verificar que se actualiza
- [ ] Delete goal: botón papelera funciona
- [ ] Empty state: mostrar cuando no hay metas en una categoría
- [ ] Realtime: crear meta en otra pestaña, debe aparecer sin refresh

---

## 10. Notas técnicas relevantes

- **useId() en canales Realtime:** M5 heredó el fix de M3 para evitar colisiones cuando múltiples componentes montan el mismo hook simultáneamente.
- **ProgressContext modular:** Cada source_type consume solo lo que necesita. Sin expensesCurrentMonth → expense_cap goals devuelven 0, sin crashear.
- **parseNumber duplicado:** Aceptado en V1 para mantener cada archivo self-contained (same pattern que M1–M4). Refactor centralizado queda para cleanup posterior.
- **Snapshots para ETA:** Requería pasar `portfolio.snapshots` del page al contexto. M3 ya tenía esos datos, se reutilizó para anclar el pace.
- **ETA solo para stock goals:** Flow goals (expense_cap, income_target, savings_rate, passive_income_target) muestran pct del período pero no ETA (objetivos recurrentes, no puntuales).

---

## 11. Links relacionados

- CLAUDEMOD1.md — Módulo 1 (Gastos)
- CLAUDEMOD2.md — Módulo 2 (Inversiones)
- CLAUDEMOD3.md — Módulo 3 (Portfolio)
- CLAUDEMOD4.md — Módulo 4 (Ingresos)
