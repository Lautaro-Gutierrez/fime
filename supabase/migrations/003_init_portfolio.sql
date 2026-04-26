-- =====================================================================
-- FiMe — Módulo 3: Portfolio
-- Migration 003: schema inicial
-- =====================================================================
-- Pegá TODO este archivo en el SQL Editor de Supabase y ejecutalo una vez.
-- Dashboard → SQL Editor → New query → pegar → RUN.
--
-- Depende de: 001 (trigger tg_set_updated_at), 002 (enum asset_type).
-- =====================================================================

-- 1) Tabla de posiciones iniciales (snapshot pre-app).
--   Permite cargar tenencias anteriores al uso de la app sin contaminar el
--   blotter real de `investments`. El cálculo de holdings combina ambas.
--
--   Reglas:
--    - quantity: nominal (VN para bonos, unidades para el resto).
--    - avg_cost_usd: costo promedio histórico en USD por unidad.
--    - as_of_date: fecha del snapshot (punto de entrada al tracking).
--    - metadata: específico por asset_type (ratio para cedears, etc.).
create table if not exists public.initial_positions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  asset_type     public.asset_type not null,
  ticker         text,                       -- null para usd_cash
  quantity       numeric(20,8) not null check (quantity > 0),
  avg_cost_usd   numeric(14,4) not null check (avg_cost_usd >= 0),
  as_of_date     date not null default current_date,
  note           text,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists initial_positions_user_idx
  on public.initial_positions (user_id);

create index if not exists initial_positions_user_ticker_idx
  on public.initial_positions (user_id, ticker)
  where ticker is not null;

drop trigger if exists set_updated_at on public.initial_positions;
create trigger set_updated_at
  before update on public.initial_positions
  for each row execute function public.tg_set_updated_at();

alter table public.initial_positions enable row level security;

drop policy if exists "initial_positions_select_own" on public.initial_positions;
create policy "initial_positions_select_own" on public.initial_positions
  for select using (auth.uid() = user_id);

drop policy if exists "initial_positions_insert_own" on public.initial_positions;
create policy "initial_positions_insert_own" on public.initial_positions
  for insert with check (auth.uid() = user_id);

drop policy if exists "initial_positions_update_own" on public.initial_positions;
create policy "initial_positions_update_own" on public.initial_positions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "initial_positions_delete_own" on public.initial_positions;
create policy "initial_positions_delete_own" on public.initial_positions
  for delete using (auth.uid() = user_id);

alter publication supabase_realtime add table public.initial_positions;


-- 2) Tabla de snapshots diarios del portafolio.
--   Una row por (user_id, date). Permite calcular TWR vs benchmark (SP500).
--
--   Campos:
--    - total_usd: valor total del portafolio al cierre de ese día.
--    - cashflow_usd: dinero que entró (+) / salió (−) del portafolio ese día.
--      Derivado de transacciones deposit/withdraw sobre usd_cash.
--    - sp500_close: cierre del SP500 ese día (benchmark). Cacheado para
--      evitar refetch en cada render del gráfico.
create table if not exists public.portfolio_snapshots (
  user_id       uuid not null references auth.users(id) on delete cascade,
  date          date not null,
  total_usd     numeric(16,4) not null check (total_usd >= 0),
  cashflow_usd  numeric(16,4) not null default 0,
  sp500_close   numeric(14,4),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (user_id, date)
);

create index if not exists portfolio_snapshots_user_date_idx
  on public.portfolio_snapshots (user_id, date desc);

drop trigger if exists set_updated_at on public.portfolio_snapshots;
create trigger set_updated_at
  before update on public.portfolio_snapshots
  for each row execute function public.tg_set_updated_at();

alter table public.portfolio_snapshots enable row level security;

drop policy if exists "portfolio_snapshots_select_own" on public.portfolio_snapshots;
create policy "portfolio_snapshots_select_own" on public.portfolio_snapshots
  for select using (auth.uid() = user_id);

drop policy if exists "portfolio_snapshots_insert_own" on public.portfolio_snapshots;
create policy "portfolio_snapshots_insert_own" on public.portfolio_snapshots
  for insert with check (auth.uid() = user_id);

drop policy if exists "portfolio_snapshots_update_own" on public.portfolio_snapshots;
create policy "portfolio_snapshots_update_own" on public.portfolio_snapshots
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "portfolio_snapshots_delete_own" on public.portfolio_snapshots;
create policy "portfolio_snapshots_delete_own" on public.portfolio_snapshots
  for delete using (auth.uid() = user_id);
