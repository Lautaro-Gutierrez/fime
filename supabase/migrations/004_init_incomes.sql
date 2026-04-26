-- =====================================================================
-- FiMe — Módulo 4: Gestión de Ingresos
-- Migration 004: schema inicial
-- =====================================================================
-- Pegá TODO este archivo en el SQL Editor de Supabase y ejecutalo una vez.
-- Dashboard → SQL Editor → New query → pegar → RUN.
--
-- Depende de: 001 (trigger tg_set_updated_at).
-- =====================================================================

-- 1) Enum de categorías (estricto, 7 valores fijos).
do $$ begin
  create type public.income_category as enum (
    'sueldo',
    'freelance',
    'alquiler_cobrado',
    'dividendos',
    'venta',
    'bono',
    'otros'
  );
exception
  when duplicate_object then null;
end $$;

-- 2) Tabla de ingresos.
--   Dual currency: ARS nativo, USD se normaliza vía fx_rate (MEP del día).
--   `amount_ars` se computa automáticamente para queries de totalización.
--   `distribution` es JSON opcional con los % del Waterfall Distributor:
--     { fixed_pct, variable_pct, invest_pct, save_pct }  (suman 100).
create table if not exists public.incomes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  amount       numeric(14,2) not null check (amount > 0),
  currency     text not null default 'ARS' check (currency in ('ARS','USD')),
  fx_rate      numeric(14,4),
  amount_ars   numeric(16,2) generated always as (
    case when currency = 'ARS' then amount
         else amount * coalesce(fx_rate, 0) end
  ) stored,
  category     public.income_category not null,
  source       text,
  date         date not null default current_date,
  note         text,
  distribution jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint incomes_fx_required_for_usd
    check (currency = 'ARS' or (fx_rate is not null and fx_rate > 0))
);

-- 3) Índices.
create index if not exists incomes_user_date_idx
  on public.incomes (user_id, date desc);

create index if not exists incomes_user_category_idx
  on public.incomes (user_id, category);

-- 4) Trigger para mantener updated_at.
drop trigger if exists set_updated_at on public.incomes;
create trigger set_updated_at
  before update on public.incomes
  for each row execute function public.tg_set_updated_at();

-- 5) Row-Level Security.
alter table public.incomes enable row level security;

drop policy if exists "incomes_select_own" on public.incomes;
create policy "incomes_select_own" on public.incomes
  for select using (auth.uid() = user_id);

drop policy if exists "incomes_insert_own" on public.incomes;
create policy "incomes_insert_own" on public.incomes
  for insert with check (auth.uid() = user_id);

drop policy if exists "incomes_update_own" on public.incomes;
create policy "incomes_update_own" on public.incomes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "incomes_delete_own" on public.incomes;
create policy "incomes_delete_own" on public.incomes
  for delete using (auth.uid() = user_id);

-- 6) Habilitar Realtime.
alter publication supabase_realtime add table public.incomes;
