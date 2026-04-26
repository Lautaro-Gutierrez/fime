-- =====================================================================
-- FiMe — Módulo 2: Inversiones
-- Migration 002: schema inicial
-- =====================================================================
-- Pegá TODO este archivo en el SQL Editor de Supabase y ejecutalo una vez.
-- Dashboard → SQL Editor → New query → pegar → RUN.
-- =====================================================================

-- 1) Enum de tipos de activo (7 fijos, V1 cubre universo completo).
do $$ begin
  create type public.asset_type as enum (
    'crypto',
    'stock_us',
    'cedear',
    'stock_ar',
    'bond_ar',
    'time_deposit',
    'usd_cash'
  );
exception
  when duplicate_object then null;
end $$;

-- 2) Enum de tipo de transacción.
--   buy/sell         → aplica a assets con ticker (crypto, stocks, cedears, bonos).
--   deposit/withdraw → aplica a usd_cash y time_deposit (entrada/salida de tenencia).
do $$ begin
  create type public.tx_type as enum (
    'buy',
    'sell',
    'deposit',
    'withdraw'
  );
exception
  when duplicate_object then null;
end $$;

-- 3) Tabla de transacciones de inversión.
--   Una fila = una operación. El cálculo de holdings (qty actual, costo promedio,
--   P&L) se hace en Módulo 3 agregando estas filas.
--   Todo en USD. fx_rate se guarda solo si la tx original fue en ARS (referencia histórica).
create table if not exists public.investments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  asset_type  public.asset_type not null,
  ticker      text,                        -- null para usd_cash y time_deposit
  tx_type     public.tx_type not null,
  quantity    numeric(20,8) not null check (quantity > 0),
  price_usd   numeric(14,4) check (price_usd is null or price_usd >= 0),
  fx_rate     numeric(14,4) check (fx_rate is null or fx_rate > 0),
  fees_usd    numeric(14,4) not null default 0 check (fees_usd >= 0),
  broker      text,
  date        date not null default current_date,
  note        text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 4) Índices.
--   (user_id, date desc) cubre el blotter general (lista cronológica).
--   (user_id, asset_type) cubre filtros por tipo.
--   (user_id, ticker) cubre agregación por holding (Módulo 3) y búsqueda por ticker.
create index if not exists investments_user_date_idx
  on public.investments (user_id, date desc);

create index if not exists investments_user_asset_type_idx
  on public.investments (user_id, asset_type);

create index if not exists investments_user_ticker_idx
  on public.investments (user_id, ticker)
  where ticker is not null;

-- 5) Trigger updated_at (reusa la función creada en migration 001).
drop trigger if exists set_updated_at on public.investments;
create trigger set_updated_at
  before update on public.investments
  for each row execute function public.tg_set_updated_at();

-- 6) Row-Level Security.
alter table public.investments enable row level security;

drop policy if exists "investments_select_own" on public.investments;
create policy "investments_select_own" on public.investments
  for select using (auth.uid() = user_id);

drop policy if exists "investments_insert_own" on public.investments;
create policy "investments_insert_own" on public.investments
  for insert with check (auth.uid() = user_id);

drop policy if exists "investments_update_own" on public.investments;
create policy "investments_update_own" on public.investments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "investments_delete_own" on public.investments;
create policy "investments_delete_own" on public.investments
  for delete using (auth.uid() = user_id);

-- 7) Realtime.
alter publication supabase_realtime add table public.investments;
