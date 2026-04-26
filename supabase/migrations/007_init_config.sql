-- =====================================================================
-- FiMe — Módulo 6: Command Center (Configuración)
-- Migration 007: credit_cards + expenses.card_id + user_preferences
-- =====================================================================
-- Pegá TODO este archivo en el SQL Editor de Supabase y ejecutalo una vez.
-- Dashboard → SQL Editor → New query → pegar → RUN.
--
-- Depende de: 001 (función tg_set_updated_at) y tabla expenses.
-- =====================================================================

-- 1) Tabla de tarjetas de crédito.
--    closing_day y due_day son días del mes (1-31). Si el mes no tiene
--    ese día (ej. 31 en febrero), el cliente lo clampea al último día
--    del mes al computar el ciclo.
create table if not exists public.credit_cards (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  closing_day  smallint not null check (closing_day between 1 and 31),
  due_day      smallint not null check (due_day between 1 and 31),
  brand        text,
  last_four    text check (last_four ~ '^[0-9]{4}$'),
  color        text,
  currency     text not null default 'ARS' check (currency in ('ARS','USD')),
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists credit_cards_user_idx
  on public.credit_cards (user_id)
  where archived_at is null;

drop trigger if exists set_updated_at on public.credit_cards;
create trigger set_updated_at
  before update on public.credit_cards
  for each row execute function public.tg_set_updated_at();

alter table public.credit_cards enable row level security;

drop policy if exists "credit_cards_select_own" on public.credit_cards;
create policy "credit_cards_select_own" on public.credit_cards
  for select using (auth.uid() = user_id);

drop policy if exists "credit_cards_insert_own" on public.credit_cards;
create policy "credit_cards_insert_own" on public.credit_cards
  for insert with check (auth.uid() = user_id);

drop policy if exists "credit_cards_update_own" on public.credit_cards;
create policy "credit_cards_update_own" on public.credit_cards
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "credit_cards_delete_own" on public.credit_cards;
create policy "credit_cards_delete_own" on public.credit_cards
  for delete using (auth.uid() = user_id);

alter publication supabase_realtime add table public.credit_cards;

-- 2) Linkear gastos a tarjeta. Nullable: gastos viejos quedan huérfanos
--    (decisión confirmada con el user — no se hace backfill forzado).
--    Solo tiene sentido cuando category='tarjeta_credito', pero no lo
--    forzamos a nivel DB para evitar bloqueos en migraciones futuras.
alter table public.expenses
  add column if not exists card_id uuid references public.credit_cards(id) on delete set null;

create index if not exists expenses_card_idx
  on public.expenses (card_id)
  where card_id is not null;

-- 3) Preferencias de usuario (1 fila por user, lazy upsert desde cliente).
--    Theme: solo dark variants (deep-gray | oled). Light mode descartado en V1.
--    Density: solo afecta padding de cards de listas en V1.
create table if not exists public.user_preferences (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  theme         text not null default 'deep-gray' check (theme in ('deep-gray','oled')),
  density       text not null default 'relaxed' check (density in ('compact','relaxed')),
  stealth_mode  boolean not null default false,
  avatar_url    text,
  display_name  text,
  updated_at    timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.user_preferences;
create trigger set_updated_at
  before update on public.user_preferences
  for each row execute function public.tg_set_updated_at();

alter table public.user_preferences enable row level security;

drop policy if exists "user_preferences_select_own" on public.user_preferences;
create policy "user_preferences_select_own" on public.user_preferences
  for select using (auth.uid() = user_id);

drop policy if exists "user_preferences_insert_own" on public.user_preferences;
create policy "user_preferences_insert_own" on public.user_preferences
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_preferences_update_own" on public.user_preferences;
create policy "user_preferences_update_own" on public.user_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_preferences_delete_own" on public.user_preferences;
create policy "user_preferences_delete_own" on public.user_preferences
  for delete using (auth.uid() = user_id);

alter publication supabase_realtime add table public.user_preferences;
