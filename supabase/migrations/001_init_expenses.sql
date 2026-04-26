-- =====================================================================
-- FiMe — Módulo 1: Gastos Personales
-- Migration 001: schema inicial
-- =====================================================================
-- Pegá TODO este archivo en el SQL Editor de Supabase y ejecutalo una vez.
-- Dashboard → SQL Editor → New query → pegar → RUN.
-- =====================================================================

-- 1) Enum de categorías (estricto, 7 valores fijos).
do $$ begin
  create type public.expense_category as enum (
    'alquiler',
    'servicios',
    'impuestos',
    'comida',
    'tarjeta_credito',
    'educacion',
    'imprevistos'
  );
exception
  when duplicate_object then null;
end $$;

-- 2) Tabla de gastos.
create table if not exists public.expenses (
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

-- 3) Índice para queries frecuentes.
-- (user_id, date desc) cubre filtros por rango de fechas + scope por usuario.
-- Las queries por mes usan .gte("date", from).lte("date", to), que aprovechan este índice.
create index if not exists expenses_user_date_idx
  on public.expenses (user_id, date desc);

-- 4) Trigger para mantener updated_at.
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists set_updated_at on public.expenses;
create trigger set_updated_at
  before update on public.expenses
  for each row execute function public.tg_set_updated_at();

-- 5) Row-Level Security: cada usuario solo accede a sus filas.
alter table public.expenses enable row level security;

drop policy if exists "expenses_select_own" on public.expenses;
create policy "expenses_select_own" on public.expenses
  for select using (auth.uid() = user_id);

drop policy if exists "expenses_insert_own" on public.expenses;
create policy "expenses_insert_own" on public.expenses
  for insert with check (auth.uid() = user_id);

drop policy if exists "expenses_update_own" on public.expenses;
create policy "expenses_update_own" on public.expenses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "expenses_delete_own" on public.expenses;
create policy "expenses_delete_own" on public.expenses
  for delete using (auth.uid() = user_id);

-- 6) Habilitar Realtime para que los clientes se sincronicen al instante.
alter publication supabase_realtime add table public.expenses;
