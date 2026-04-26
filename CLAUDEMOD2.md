# FiMe — Sesión: Módulo 2 + Redesign Global

Documentación completa de lo construido en esta sesión.  
**Fecha:** abril 2026  
**Módulos tocados:** M1 (Gastos) — redesign visual · M2 (Inversiones) — build completo

---

## 1. Qué se construyó

### Módulo 2 — Inversiones (`/inversiones`)

Blotter de transacciones de inversión. NO calcula holdings ni P&L (eso es M3 — Portfolio).  
**Alcance:** registrar y visualizar operaciones cronológicamente, todo normalizado en USD.

**Universo de activos (7 tipos):**

| id | Label | Ticker | Precio | Metadata |
|---|---|---|---|---|
| `crypto` | Crypto | ✅ | ✅ | — |
| `stock_us` | Acciones US | ✅ | ✅ | — |
| `cedear` | CEDEARs | ✅ | ✅ (ARS) | `ratio` (requerido) |
| `stock_ar` | Acciones AR | ✅ | ✅ (ARS) | — |
| `bond_ar` | Bonos AR | ✅ | ✅ (ARS) | `maturity` (opcional) |
| `time_deposit` | Plazo Fijo | ❌ | ❌ | `tna`, `opening_date`, `maturity_date`, `currency` |
| `usd_cash` | USD en efectivo | ❌ | ❌ | — |

**Método de costeo:** Average Cost (FIFO descartado). Implementación real del P&L queda para M3.

**Tipos de operación por asset:**
- `buy / sell` → crypto, stock_us, cedear, stock_ar, bond_ar
- `deposit / withdraw` → time_deposit, usd_cash

---

## 2. Schema — Migración `002_init_investments.sql`

```sql
create type public.asset_type as enum (
  'crypto', 'stock_us', 'cedear', 'stock_ar', 'bond_ar', 'time_deposit', 'usd_cash'
);

create type public.tx_type as enum ('buy', 'sell', 'deposit', 'withdraw');

create table public.investments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  asset_type   public.asset_type not null,
  ticker       text,                              -- null para time_deposit y usd_cash
  tx_type      public.tx_type not null,
  quantity     numeric(24, 8) not null check (quantity > 0),
  price_usd    numeric(20, 8),                   -- null cuando no aplica precio unitario
  fx_rate      numeric(14, 4),                   -- ARS/USD al momento de la op
  fees_usd     numeric(14, 4) not null default 0,
  broker       text,
  date         date not null,
  note         text,
  metadata     jsonb not null default '{}',      -- campos específicos por asset_type
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Índices
create index investments_user_date_idx   on public.investments (user_id, date desc);
create index investments_user_asset_idx  on public.investments (user_id, asset_type);
create index investments_user_ticker_idx on public.investments (user_id, ticker) where ticker is not null;

-- RLS habilitado con policies select/insert/update/delete
-- Realtime habilitado: alter publication supabase_realtime add table public.investments
```

---

## 3. Archivos creados — Módulo 2

### `types/database.ts` (extensión)
Agregado: `AssetType`, `TxType`, y la tabla `investments` con `Row / Insert / Update`.  
**Crítico:** sigue el patrón estricto de Supabase — `Views`, `Functions`, `CompositeTypes` como `Record<string, never>` y `Relationships: []`.

### `lib/assets.ts`
Catálogo de 7 assets. Cada `AssetConfig` tiene:
- `id`, `label`, `short`, `color` (hex)
- `bgClass`, `textClass`, `borderClass` (Tailwind)
- `icon` (Lucide)
- `allowedTxTypes: TxType[]`
- `requiresTicker: boolean`
- `requiresPrice: boolean`
- `metadataFields: MetadataField[]`

También exporta `ASSETS_BY_ID` (Record) y `TX_TYPE_LABELS`.

### `lib/prices/types.ts`
```ts
type FxRates = { mep: number; ccl: number; blue: number; oficial: number }
```

### `lib/prices/dolarapi.ts`
Fetcha `https://dolarapi.com/v1/dolares` con `{ next: { revalidate: 300 } }` (5 min cache).  
Mapea `casa` → rates. **Solo usado en M2, no en M3 todavía.**

### `app/api/prices/fx/route.ts`
GET route que expone `getFxRates()`. Consumido por el FX Strip y el form de nueva transacción.

### `hooks/use-investments.ts`
- `useInvestments()` — all rows ordered `date desc`
- `useCreateInvestment()` — insert
- `useUpdateInvestment()` — patch by id
- `useDeleteInvestment()` — delete by id
- Canal Realtime Supabase que invalida el query automáticamente

### `lib/format.ts` (extensión)
Agregado `formatUSD(value, compact?)` y `formatQuantity(qty)` (hasta 8 decimales para qty < 1, ej: crypto).

### `.env.local`
```
FINNHUB_API_KEY=d7h89b1r01qhiu0alkt0d7h89b1r01qhiu0alktg
```
Variable server-side (sin `NEXT_PUBLIC_`). No usada en M2, reservada para M3 cuando se construyan los precios de mercado en tiempo real.

---

## 4. Componentes — Módulo 2

| Componente | Descripción |
|---|---|
| `components/inversiones/fx-strip.tsx` | Strip de cotizaciones ARS/USD con 4 cards (MEP, CCL, Blue, Oficial). Polling con TanStack Query, staleTime 5 min. Botón "Actualizar" manual. |
| `components/inversiones/transactions-list.tsx` | Lista agrupada por mes. Empty state con gradient. Swipe-to-delete (Framer Motion drag). Click en row abre edit dialog. |
| `components/inversiones/filters.tsx` | Search bar por ticker + chips toggle por asset type. |
| `components/inversiones/new-transaction-dialog.tsx` | Step 1: selector de asset. Step 2: form con campos dinámicos según asset (ticker, precio, metadata, fecha, broker, fees, nota). Toggle USD/ARS con botón "MEP actual". |
| `components/inversiones/edit-transaction-dialog.tsx` | Mismo form adaptado para edición. Header muestra asset + tx_type del registro. |
| `app/inversiones/page.tsx` | Página principal. Filtra `investments` en cliente (asset type + ticker). Pasa filtered a TransactionsList. |

### Lógica de precio en `new-transaction-dialog.tsx`
- Assets ARS-denominados (`cedear`, `stock_ar`, `bond_ar`): precio en ARS, con campo fx_rate. `price_usd = price_ars / fx_rate`
- Assets USD (`crypto`, `stock_us`): precio directo en USD
- Sin precio (`time_deposit`, `usd_cash`): `price_usd = null`, `quantity` es el capital total

---

## 5. Design System — Fintech Premium

Aplicado a **M1 y M2** en la misma sesión. Inspiración: Lemon Cash / Cash App / Revolut.

### Paleta de identidad por módulo
| Módulo | Color primario | Uso |
|---|---|---|
| Gastos (M1) | `emerald → teal` | CTA, glows, dots, acentos |
| Inversiones (M2) | `indigo → violet` | CTA, glows, dots, acentos |

### Patrones compartidos

**Cards:**
```
rounded-3xl border border-white/5 bg-card/60 p-5 backdrop-blur
```

**Ambient glow (header de página):**
```css
bg-[radial-gradient(ellipse_at_top,rgba(X,Y,Z,0.08),transparent_65%)]
```

**Hero header (por página):**
```tsx
<span className="text-[10px] font-semibold uppercase tracking-widest text-{color}-300/80">
  Módulo · Nombre
</span>
<h1 className="bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
  Título
</h1>
```

**Icon con aura blur (rows y cards):**
```tsx
<div className="relative">
  <div className="absolute inset-0 rounded-xl blur-md opacity-50 {asset.bgClass}" />
  <div className="relative flex size-10 items-center justify-center rounded-xl ring-1 {bgClass} {textClass} {borderClass}">
    <Icon className="size-4" />
  </div>
</div>
```

**Dot pulsante (labels de sección):**
```tsx
<span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
```

**Glow shadow por categoría/asset (chips activos):**
```ts
const ACTIVE_GLOW: Record<AssetType, string> = {
  crypto: "shadow-[0_0_20px_-4px_rgba(249,115,22,0.4)]",
  // ...etc
}
```

**CTA buttons:**
```tsx
// M1 Gastos
className="bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25 ..."
// M2 Inversiones
className="bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 ..."
```

**Dialog container (toda la app):**
```
border-white/5 bg-card/95 backdrop-blur-xl overflow-hidden
```

**Form inputs premium:**
```
h-11 rounded-xl border-white/5 bg-card/60 backdrop-blur focus-visible:border-white/20
```

**Month selector (M1):**
```tsx
// Pill con backdrop-blur, chevrons custom sin shadcn Button
<div className="flex items-center gap-0.5 rounded-full border border-white/5 bg-card/60 p-0.5 backdrop-blur">
```

---

## 6. Tipografía — Fix global

**Bug:** `globals.css` tenía `--font-sans: var(--font-sans)` (auto-referencial). Resultado: la app usaba system fonts en vez de Geist.

**Fix:**
```css
@theme inline {
  --font-sans: var(--font-geist-sans);   /* ← era var(--font-sans) */
  --font-mono: var(--font-geist-mono);
}
```

**Variantes estilísticas activadas (Geist feature flags):**
```css
body {
  font-feature-settings: "ss01", "ss02", "cv01", "cv11";
  letter-spacing: -0.005em;
}
h1, h2, h3, h4, h5, h6 {
  letter-spacing: -0.02em;
}
.font-mono {
  font-feature-settings: "ss02", "cv06", "zero"; /* 0 con slash */
}
```

| Feature | Efecto |
|---|---|
| `ss01` | `a` de una pata (humanist) |
| `ss02` | `l` con curva inferior |
| `cv01` | `i` con serifas pequeñas |
| `cv11` | Mejoras en ß y otros glyphs |
| `zero` | Cero con slash (evita confusión con O) |

---

## 7. Decisiones de producto confirmadas

| Decisión | Valor |
|---|---|
| Método de costeo | **Average Cost** (FIFO descartado) |
| Datos de mercado AR | **Scraping de IOL o Rava** (pendiente M3) |
| FX de referencia | **MEP** (mostrar también CCL, Blue, Oficial como contexto) |
| Broker | Texto libre (`text`) — no enum |
| Realtime | ✅ habilitado via Supabase channels |
| Datos históricos | **Option B**: fresh desde hoy. "Initial position" bulk upload en M3 |
| Precios de mercado | Reservados para M3. M2 es solo blotter (sin live prices) |

---

## 8. Errores preexistentes (no tocados)

```
components/gastos/distribution-donut.tsx:77 — TS2769
```
El callback `onClick` del `<Pie>` de Recharts tiene una firma de tipos incompatible con la versión instalada.  
**No se toca:** es código de M1 que funciona en runtime, el error es de tipos de la librería.  
Cuando se refactorice Recharts o se actualice la versión, se puede tipar como `(data: unknown) => void` y castear.

---

## 9. Pendiente para sesiones futuras

### Módulo 3 — Portfolio (`/portfolio`)

Requiere:
- Calcular **holdings actuales** con Average Cost a partir de `investments`
- Integrar **precios de mercado en tiempo real**:
  - Crypto: CoinGecko o Binance public API
  - Stocks US: Finnhub (API key ya en `.env.local`)
  - AR (CEDEARs, Acciones, Bonos): scraping IOL o Rava
- P&L por posición (unrealized) y total
- Weights (% del portfolio)
- "Initial position" bulk upload para datos históricos anteriores a la app
- Sector exposure

### Shell / navegación
- `/dashboard` habilitado con orden
- `/portfolio` habilitado con orden
- `/ingresos`, `/metas`, `/config` → pendientes

### Módulo 2 — mejoras opcionales
- Exportar blotter a CSV
- Filtros por fecha (rango)
- Filtro por tx_type (compras / ventas / depósitos)
- Total invertido por asset type en header

---

## 10. Estructura de archivos actualizada

```
fime/
├── app/
│   ├── globals.css                  Tipografía fix + design tokens
│   ├── gastos/page.tsx              M1 — hero header premium
│   └── inversiones/page.tsx         M2 — blotter principal
├── components/
│   ├── layout/shell.tsx             inversiones enabled:true (sin badge "pronto")
│   ├── gastos/
│   │   ├── totalizer.tsx            ✨ redesign premium
│   │   ├── distribution-donut.tsx   ✨ redesign premium
│   │   ├── category-cards.tsx       ✨ redesign premium
│   │   ├── expenses-list.tsx        ✨ redesign premium
│   │   ├── quick-add.tsx            ✨ redesign premium
│   │   ├── edit-expense-dialog.tsx  ✨ redesign premium
│   │   └── month-selector.tsx       ✨ redesign premium (pill custom)
│   └── inversiones/
│       ├── fx-strip.tsx             🆕 cotizaciones ARS/USD
│       ├── transactions-list.tsx    🆕 blotter con swipe-delete
│       ├── filters.tsx              🆕 chips + search premium
│       ├── new-transaction-dialog.tsx 🆕 asset selector + form
│       └── edit-transaction-dialog.tsx 🆕 edit form
├── hooks/
│   └── use-investments.ts           🆕 CRUD + Realtime channel
├── lib/
│   ├── assets.ts                    🆕 catálogo 7 asset types
│   ├── format.ts                    + formatUSD, formatQuantity
│   └── prices/
│       ├── types.ts                 🆕 FxRates type
│       └── dolarapi.ts              🆕 fetch dolarapi.com
├── app/api/prices/
│   └── fx/route.ts                  🆕 GET /api/prices/fx
├── types/database.ts                + AssetType, TxType, investments table
└── supabase/migrations/
    └── 002_init_investments.sql     🆕 schema M2
```
