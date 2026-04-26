# CLAUDEMOD3 — Módulo Portfolio

Decisiones, bugs resueltos y cambios realizados durante el desarrollo del Módulo 3.

---

## 1. Alcance del módulo (acordado en sesión anterior)

- Holdings calculados desde `investments` (M2) + `initial_positions` (tabla nueva), usando **Average Cost**.
- Precios en vivo por polling: 60s crypto, 120s US stocks, 180s AR stocks/CEDEARs.
- P&L mostrado **solo en porcentaje** (sin montos absolutos).
- **Gráfico de torta** por tenencia individual (no por sector/asset type).
- **Gráfico de líneas** TWR del portfolio vs SP500 (desde la primera fecha con snapshot).
- `bond_ar` excluido en V1 (pendiente para V2 con residual_factor).
- **Forward-looking only** — no backfill histórico.
- TWR descuenta depósitos/retiros de `usd_cash` y `time_deposit` para no inflar el rendimiento.

---

## 2. Schema de base de datos

### Migración `supabase/migrations/003_init_portfolio.sql`

```sql
-- initial_positions: tenencias previas al uso de la app
create table public.initial_positions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  asset_type   public.asset_type not null,
  ticker       text,
  quantity     numeric(20,8) not null check (quantity > 0),
  avg_cost_usd numeric(20,8) not null check (avg_cost_usd > 0),
  as_of_date   date not null,
  note         text,
  metadata     jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- portfolio_snapshots: un registro diario por usuario (PK compuesta)
create table public.portfolio_snapshots (
  user_id      uuid not null references auth.users(id) on delete cascade,
  date         date not null,
  total_usd    numeric(20,8) not null default 0,
  cashflow_usd numeric(20,8) not null default 0,
  sp500_close  numeric(20,8),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, date)
);
```

RLS habilitado en ambas tablas. Realtime habilitado en ambas.

---

## 3. Fuentes de precios

| Asset type | Fuente | Endpoint | Polling |
|---|---|---|---|
| `crypto` | CoinGecko | `/coins/markets` | 60s |
| `stock_us` | Finnhub | `/quote` | 120s |
| `cedear` | data912.com | `/live/arg_cedears` | 180s |
| `stock_ar` | data912.com | `/live/arg_stocks` | 180s |
| `bond_ar` | data912.com | `/live/arg_bonds` + `arg_notes` | (V1 excluido) |
| FX (MEP) | dolarapi.com | `/v1/cotizaciones/mep` | 5min |
| SP500 | Finnhub SPY | candles diarios | 1h (stale) |

**Configuración requerida:** `FINNHUB_API_KEY` en `.env.local`.

### Conversión ARS → USD
- CEDEARs y acciones AR vienen en ARS desde data912.
- Se dividen por `fxMep` (tipo MEP) para obtener valor en USD.
- data912 ya devuelve precio por acción/CEDEAR (no requiere multiplicar por ratio).

---

## 4. Lógica de holdings (`lib/portfolio/holdings.ts`)

- **`positionKey()`**: clave única por posición. `usd_cash` y `time_deposit` tienen clave única (no por ticker). El resto: `${asset_type}:${ticker}`.
- **`computeHoldings()`**: primero procesa `initial_positions`, luego aplica txs cronológicamente.
- **`valueHoldings()`**: aplica precios actuales y MEP. Assets en ARS se convierten dividiendo por MEP.
- **`portfolioTotals()`**: suma total USD + P&L ponderado sobre `cost_basis`.
- **`txCashflowUsd()`**: solo `deposit`/`withdraw` de `usd_cash` y `time_deposit` cuentan como cashflow para TWR.

---

## 5. TWR (`lib/portfolio/twr.ts`)

Fórmula sub-período:
```
r_D = (total_end_D - cashflow_D - total_end_D-1) / total_end_D-1
TWR = Π(1 + r_i) - 1
```

- **`computeTwr()`**: calcula la serie acumulada diaria.
- **`sp500Returns()`**: normaliza la serie SPY desde la fecha base del primer snapshot.
- **`mergeReturnSeries()`**: alinea ambas series; los fines de semana (sin datos SP500) usan el último valor conocido.

---

## 6. Snapshots

El hook `usePortfolio` hace **upsert automático** del snapshot del día cuando:
- Los datos de inversiones, posiciones e FX cargaron exitosamente.
- El portfolio tiene valor > 0 O hay txs/posiciones registradas.

`cashflow_usd` del snapshot = suma de cashflows de txs de **hoy**.

---

## 7. Bug crítico resuelto: `parseNumber` (×100)

**Síntoma:** GGAL cargada a $2.20 USD mostraba -97.75% de P&L.

**Causa raíz:** La función `parseNumber` asumía formato argentino exclusivamente:
```ts
// ANTES (buggeado):
const cleaned = v.replace(/\./g, "").replace(",", ".");
// "2.20" → borrar punto → "220" → Number("220") = 220
```
El punto decimal estándar (formato anglo) era interpretado como separador de miles.

**Verificación matemática:**
- Costo guardado en DB: $220 (en vez de $2.20)
- Precio actual: $4.96
- `(4.96 - 220) / 220 = -97.75%` ← coincidía exactamente con lo mostrado

**Fix aplicado en 5 archivos:**
```ts
// DESPUÉS (correcto): detecta ambos formatos
function parseNumber(v: string): number | null {
  // Si hay ambos separadores: el último es decimal
  // Si solo hay coma: decimal AR
  // Si solo hay punto: decimal JS estándar
  ...
}
```

Archivos corregidos:
- `components/portfolio/initial-positions-dialog.tsx`
- `components/inversiones/new-transaction-dialog.tsx`
- `components/inversiones/edit-transaction-dialog.tsx`
- `components/gastos/quick-add.tsx`
- `components/gastos/edit-expense-dialog.tsx`

**Acción requerida por el usuario:** cualquier posición/transacción/gasto cargado con decimal punto (ej. `2.20`) antes del fix quedó guardado ×100 en DB. Hay que editarlo manualmente.

---

## 8. Fix: canal Supabase Realtime (colisión)

**Error:** `cannot add postgres_changes callbacks for realtime:initial-positions-changes after subscribe()`

**Causa:** `useInitialPositions` y `InitialPositionsDialog` montaban el hook simultáneamente, ambos registrando el mismo nombre de canal `"initial-positions-changes"`.

**Fix:** usar `useId()` de React para generar un sufijo único por mount:
```ts
const channelId = useId();
supabase.channel(`initial-positions-${channelId}`)
```
Aplicado también defensivamente a `useSnapshots` dentro de `use-portfolio.ts`.

---

## 9. Mejoras de UX implementadas en esta sesión

### Edit de posiciones iniciales
- Botón ✏️ (pencil, color fuchsia) al lado del 🗑️ en cada posición de la lista.
- Al clickear: abre el form con todos los valores precargados.
- Título dinámico: "Nueva · Acciones AR" vs "Editar · Acciones AR".
- Botón submit: "Guardar" vs "Actualizar".
- Back button en modo edit: vuelve directo a lista (saltea selección de tipo).
- Usa `useUpdateInitialPosition` (hook ya existente en M3).

### Gráfico de torta — hover en vez de click
- **Antes:** click en sector → activa, botón "Limpiar" → desactiva.
- **Después:** `onMouseEnter` → activa, `onMouseLeave` → desactiva automáticamente.
- Botón "Limpiar" eliminado.
- Los legends abajo también responden a hover.

---

## 10. Cambios de texto / labels

| Ubicación | Antes | Después |
|---|---|---|
| `header.tsx` — label pequeño encima del título | `Módulo · Portfolio` | `Tenencias` |
| `header.tsx` — título principal `<h1>` | `Tenencia total` | `MI PORTFOLIO` |
| `holdings-list.tsx` — encabezado de la tabla | `Tenencias` | `MI PORTFOLIO` |

---

## 11. Archivos del módulo

```
app/
  portfolio/page.tsx                     Página principal del módulo

app/api/prices/
  crypto/route.ts                        GET quotes crypto (CoinGecko)
  stocks-us/route.ts                     GET quotes US (Finnhub)
  ar/route.ts                            GET quotes AR (data912)
  sp500/route.ts                         GET serie histórica SPY (Finnhub)
  fx/route.ts                            GET tipos de cambio (dolarapi)

components/portfolio/
  header.tsx                             Hero total + pills Rendimiento / Hoy
  allocation-donut.tsx                   Torta interactiva con hover
  holdings-list.tsx                      Tabla de posiciones con P&L%
  performance-chart.tsx                  Líneas TWR vs SP500
  initial-positions-dialog.tsx           Dialog crear/editar/borrar posiciones iniciales

hooks/
  use-portfolio.ts                       Orquestador principal
  use-initial-positions.ts               CRUD + Realtime para initial_positions
  use-prices.ts                          useQuotes, useFxRates, useSp500Series

lib/portfolio/
  holdings.ts                            computeHoldings, valueHoldings, portfolioTotals
  twr.ts                                 computeTwr, sp500Returns, mergeReturnSeries

lib/prices/
  coingecko.ts                           Fetch crypto
  finnhub.ts                             Fetch US stocks + SP500
  data912.ts                             Fetch AR stocks/CEDEARs
  dolarapi.ts                            Fetch FX rates
  types.ts                               Quote, QuoteMap, Sp500Series

supabase/migrations/
  003_init_portfolio.sql                 initial_positions + portfolio_snapshots
```

---

## 12. Decisiones de producto postergadas para V2

- **`bond_ar`:** requiere `residual_factor` para valor correcto post-amortizaciones.
- **Plazo fijo con interés acumulado:** V1 solo muestra capital USD original (`avg_cost_usd`).
- **Backfill histórico de snapshots:** V1 es forward-looking desde la primera carga.
- **Gráfico de líneas sin SP500 si no hay `FINNHUB_API_KEY`:** actualmente falla silenciosamente y no muestra la línea de referencia.

---

## 13. Error de TypeScript preexistente (NO tocar)

`components/gastos/distribution-donut.tsx` línea 93 — error de tipo en `onClick` de Recharts Pie (M1). Documentado como intocable. No fue introducido por M3.
