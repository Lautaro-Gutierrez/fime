@AGENTS.md

# FiMe — App personal de finanzas

App web + mobile para gestionar finanzas personales con datos de mercado en tiempo real. Usuario: inversor retail argentino con expertise en mercados y crypto.

---

## Reglas de colaboración (CRÍTICO — leer antes de codear)

1. **Desarrollo módulo-por-módulo.** No iniciar un módulo ni tocar otro hasta que haya orden explícita del usuario. Nunca anticipar decisiones de módulos futuros.
2. **Moneda.** ARS para todo excepto **Inversiones** y **Portfolio**, que son USD. Tipo de cambio de referencia (MEP/CCL/blue) se decide cuando toque esos módulos.
3. **Idioma.** Comunicación en español rioplatense. Textos de UI también. El usuario es experto en finanzas/mercados — no hace falta explicar conceptos básicos; sí hace falta rigor numérico y claridad visual.
4. **Diseño.** Creativo, moderno, intuitivo. Debe verse bien en mobile y desktop. Evitar UI genérica de dashboard.
5. **Antes de codear cada módulo:** proponer alcance, schema, y decisiones de producto en texto. Esperar aprobación.
6. **Next.js 16 ≠ lo que conocés.** Leer `node_modules/next/dist/docs/` antes de tocar cualquier API. Ver `AGENTS.md`.

---

## Estado de módulos

| # | Módulo | Estado | Ruta |
|---|---|---|---|
| 1 | Gastos Personales | ✅ completo | `/gastos` |
| 2 | Nuevas Inversiones | ⏳ pendiente | `/inversiones` |
| 3 | Portfolio de Activos | ⏳ pendiente | `/portfolio` |
| 4 | Gestión de Ingresos | ⏳ pendiente | `/ingresos` |
| 5 | Metas y Objetivos | ⏳ pendiente | `/metas` |
| 6 | Configuración / Perfil | ⏳ pendiente | `/config` |

Los módulos pendientes aparecen en la navegación con badge "pronto" y clicks deshabilitados. No implementar hasta orden.

---

## Stack técnico

| Capa | Tool | Versión |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.2.4 |
| React | react / react-dom | 19.2.4 |
| Estilo | Tailwind CSS | v4 (`@theme inline`) |
| UI primitivos | shadcn/ui sobre `@base-ui/react` | 1.4 |
| Auth + DB | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) | 0.10 / 2.103 |
| Server state | TanStack Query | v5 |
| Animación | Framer Motion | 12 |
| Charts | Recharts | 3 |
| Iconos | Lucide React | 1.8 |
| Toasts | Sonner | 2 |
| Theme | next-themes (forzado dark) | 0.4 |
| Client state | Zustand (no usado todavía) | 5 |
| Utils fechas | date-fns | 4 |

### Gotchas críticos del stack

- **Next 16 rompió `middleware.ts`** → ahora es `proxy.ts` en la raíz con `export async function proxy(req)`. Misma lógica, nombre distinto.
- **`cookies()`, `headers()`, `params` son async** en Next 16. Siempre `await`.
- **shadcn/ui sobre base-ui, no Radix.** API cambió: se usa `render={<Componente />}` en lugar de `asChild`. No existe `DialogTitle asChild`.
- **Tipo `Database` de Supabase es estricto.** Requiere `Views: Record<string, never>`, `Functions: Record<string, never>`, `CompositeTypes: Record<string, never>`, y `Relationships: []` en cada tabla. Sin esto los `.insert()` quedan tipados como `never`.
- **Tailwind v4** usa `@theme inline` en CSS para definir tokens — no hay `tailwind.config.js` para tokens de color.
- **Iconos Lucide:** verificar nombres con `node -e "require('lucide-react')"` antes de importar; algunos cambiaron de nombre entre versiones.

---

## Estructura de archivos

```
fime/
├── proxy.ts                       Auth gate (ex-middleware)
├── next.config.ts                 allowedDevOrigins + devIndicators
├── app/
│   ├── layout.tsx                 ThemeProvider + QueryProvider + Toaster
│   ├── globals.css                Tailwind v4 + tokens
│   ├── login/page.tsx             Toggle login/signup
│   └── gastos/page.tsx            Módulo 1 (página principal)
├── components/
│   ├── layout/shell.tsx           Sidebar desktop + bottom tabs mobile
│   ├── gastos/
│   │   ├── totalizer.tsx          Total animado + delta vs mes anterior
│   │   ├── distribution-donut.tsx Donut interactivo con leyenda
│   │   ├── category-cards.tsx     Cards con barra, filtran la lista
│   │   ├── expenses-list.tsx      Lista agrupada por día + swipe-delete
│   │   ├── quick-add.tsx          Dialog nuevo gasto
│   │   ├── edit-expense-dialog.tsx Dialog edit
│   │   └── month-selector.tsx     Navegación mensual
│   ├── providers/query-provider.tsx
│   └── ui/                        Componentes shadcn
├── hooks/
│   └── use-expenses.ts            Query + mutations + canal Realtime
├── lib/
│   ├── categories.ts              7 categorías fijas (id, label, short, color, icon)
│   ├── format.ts                  formatARS, fechas, monthKey, isFutureMonth
│   ├── supabase/{client,server,proxy}.ts
│   └── utils.ts                   cn()
├── types/database.ts              Database type de Supabase
└── supabase/migrations/
    └── 001_init_expenses.sql
```

---

## Módulo 1 — Gastos Personales (detalle)

### Schema (migración `001_init_expenses.sql`)

```sql
-- enum
create type public.expense_category as enum (
  'alquiler', 'servicios', 'impuestos', 'comida',
  'tarjeta_credito', 'educacion', 'imprevistos'
);

-- tabla
create table public.expenses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  amount      numeric(14,2) not null check (amount > 0),
  currency    text not null default 'ARS',
  category    public.expense_category not null,
  date        date not null default current_date,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- índice único (cubre queries por rango de fechas + user)
create index expenses_user_date_idx on public.expenses (user_id, date desc);

-- RLS: cada user solo ve/edita sus filas (policies select/insert/update/delete)
alter table public.expenses enable row level security;

-- Realtime
alter publication supabase_realtime add table public.expenses;
```

**Nota:** un segundo índice `date_trunc('month', date)` fue eliminado por el error `42P17` (la sobrecarga de `date_trunc` sobre `date` cae en `timestamptz`, que es `STABLE` no `IMMUTABLE`). Las queries por mes usan `.gte("date", from).lte("date", to)` y aprovechan el índice existente.

### Categorías (7 fijas, estrictas)

Definidas en `lib/categories.ts`. Cada una tiene `id`, `label`, `short` (para espacios apretados como el centro del donut), `color` (hex para charts), y classes de Tailwind. En V1 el end-user NO puede crear categorías custom.

| id | label | short | color |
|---|---|---|---|
| `alquiler` | Alquiler | Alquiler | `#3B82F6` |
| `servicios` | Servicios | Servicios | `#F59E0B` |
| `impuestos` | Impuestos | Impuestos | `#EF4444` |
| `comida` | Comida | Comida | `#10B981` |
| `tarjeta_credito` | Tarjeta de Crédito | **Tarjeta** | `#8B5CF6` |
| `educacion` | Educación | Educación | `#06B6D4` |
| `imprevistos` | Gastos no previstos | **Imprevistos** | `#EC4899` |

### Decisiones de producto

- **Edit de gastos pasados:** permitido (editar sin restricción de fecha más allá del límite de mes en curso).
- **Delete:** swipe-left en mobile + botón en desktop. Toast con undo que re-crea el gasto (recreateMutation).
- **Fechas futuras:** permitidas solo dentro del mes en curso. Validación en cliente (`isFutureMonth`), `max` en `<input type="date">`. No hay check constraint en DB.
- **Recurrencia automática:** NO en V1. Los valores cambian mes a mes y el user carga manualmente.
- **Vista actual:** solo mes calendario. "Total global del mes" es el KPI principal; split "ya pagado / programado" solo aparece cuando hay gastos con fecha futura dentro del mes actual.

### Data flow

```
UI action (crear/editar/borrar)
  └── mutation de TanStack Query (use-expenses.ts)
       └── Supabase insert/update/delete
            └── RLS verifica user_id = auth.uid()
            └── trigger set_updated_at dispara
            └── publicación Realtime emite evento
                 └── canal en hooks/use-expenses.ts invalida query
                      └── UI se refresca
```

---

## Auth

- Providers: Email + password. **Confirmación de email debe estar desactivada en dev** (Dashboard → Auth → Providers → Email → Confirm email OFF).
- `proxy.ts` intercepta toda request (excepto estáticos). Si no hay sesión y la ruta no es `/login`, redirige.
- `createClient()` en componentes cliente lee cookies del browser; `createServerClient()` en server components con `await cookies()`.

---

## Comandos habituales

```bash
pnpm dev              # server en 0.0.0.0:3000 (ver LAN access abajo)
pnpm build            # producción
pnpm exec tsc --noEmit # typecheck (ya allowlisted)
```

### Acceso desde el celular (dev)

1. IP LAN de la PC: ver `ipconfig` → adaptador activo → `Dirección IPv4` (actualmente `192.168.0.125`).
2. `pnpm dev` (el script ya incluye `-H 0.0.0.0`).
3. `next.config.ts` incluye `allowedDevOrigins: ["192.168.0.125", "192.168.0.*", "192.168.1.*"]` para que el celular pueda cargar `/_next/*` assets.
4. En el celular (mismo Wi-Fi): `http://192.168.0.125:3000`.
5. Si Windows Firewall bloqueó Node: permitirlo en red Privada.

---

## Próximos pasos (sugerencias, no ejecutar sin orden)

Antes de arrancar el **Módulo 2 — Inversiones**, definir con el user:

- **Universo de instrumentos:** acciones AR/US, CEDEARs, crypto, bonos, FCI, plazo fijo, dólar físico. ¿V1 cubre todos o arranca con un subset?
- **Fuentes de datos de mercado:** CoinGecko/Binance (crypto), IOL/Rava/dolarapi (AR), Alpha Vantage/IEX/Finnhub (US). Elegir una por asset class y ver cuotas gratuitas.
- **Modelo de datos:** ¿una tabla `investments` unificada con `asset_type` o tablas separadas por clase?
- **Tipo de cambio de referencia ARS↔USD:** MEP, CCL o blue. Probablemente MEP para cálculo; mostrar los tres como referencia.
- **Precio de mercado en vivo:** ¿polling cada X segundos, websocket, o snapshot al abrir?
- **Costos de operación:** comisiones, derechos de mercado, IVA. ¿Parametrizable o fijo por broker?

El Módulo 3 (Portfolio) se alimenta de lo cargado en Inversiones + precios actuales → P&L, weights, sector exposure. Orden natural: 2 → 3.
