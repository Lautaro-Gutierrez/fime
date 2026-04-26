-- =====================================================================
-- FiMe — Módulo 5: Metas y Objetivos
-- Migration 005: schema inicial
-- =====================================================================
-- Pegá TODO este archivo en el SQL Editor de Supabase y ejecutalo una vez.
-- Dashboard → SQL Editor → New query → pegar → RUN.
--
-- Depende de: 001 (trigger tg_set_updated_at).
-- =====================================================================

-- 1) Enum: tipo de meta (qué mide).
--    savings               → juntar X en USD/ARS (ahorro general)
--    purchase              → compra puntual (Side Quest típico)
--    expense_cap           → gastar < X en una categoría/mes (M1)
--    income_target         → ingreso mensual > X (M4)
--    savings_rate          → % ahorro/ingreso > X (M4 + M1)
--    debt_payoff           → saldar deuda (manual)
--    passive_income_target → retornos mensuales de inversiones > X (M3)
do $$ begin
  create type public.goal_type as enum (
    'savings',
    'purchase',
    'expense_cap',
    'income_target',
    'savings_rate',
    'debt_payoff',
    'passive_income_target'
  );
exception
  when duplicate_object then null;
end $$;

-- 2) Enum: estado de la meta.
do $$ begin
  create type public.goal_status as enum (
    'active',
    'completed',
    'paused',
    'archived'
  );
exception
  when duplicate_object then null;
end $$;

-- 3) Enum: tablero de misiones.
--    main → metas de largo plazo (ahorro global, ingresos, ratios, pasivo)
--    side → compras puntuales / metas acotadas (viajes, hardware, etc.)
do $$ begin
  create type public.quest_type as enum ('main', 'side');
exception
  when duplicate_object then null;
end $$;

-- 4) Tabla de metas.
--    Filosofía híbrida:
--      - source_type != null  → progreso auto-calculado en el cliente
--      - source_type is null  → current_amount es la fuente de verdad (manual)
--    linked_asset_keys: array de position keys al estilo M3 (ej. {'crypto:BTC','usd_cash'}).
--      Si hay links, las metas de ahorro/pasivo se calculan SOLO sobre ese subset
--      (separar capital asignado a una meta específica del resto del portfolio).
create table if not exists public.goals (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  goal_type         public.goal_type not null,
  quest_type        public.quest_type not null default 'main',
  target_amount     numeric(20,4) not null check (target_amount > 0),
  currency          text check (currency is null or currency in ('USD','ARS')),
  current_amount    numeric(20,4) not null default 0,
  source_type       text,
  source_ref        text,
  linked_asset_keys text[] not null default '{}',
  deadline          date,
  started_at        date not null default current_date,
  status            public.goal_status not null default 'active',
  priority          smallint not null default 0,
  color             text,
  icon              text,
  note              text,
  metadata          jsonb not null default '{}',
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- 5) Índices.
create index if not exists goals_user_status_idx
  on public.goals (user_id, status);

create index if not exists goals_user_quest_idx
  on public.goals (user_id, quest_type);

-- 6) Trigger para mantener updated_at.
drop trigger if exists set_updated_at on public.goals;
create trigger set_updated_at
  before update on public.goals
  for each row execute function public.tg_set_updated_at();

-- 7) Row-Level Security.
alter table public.goals enable row level security;

drop policy if exists "goals_select_own" on public.goals;
create policy "goals_select_own" on public.goals
  for select using (auth.uid() = user_id);

drop policy if exists "goals_insert_own" on public.goals;
create policy "goals_insert_own" on public.goals
  for insert with check (auth.uid() = user_id);

drop policy if exists "goals_update_own" on public.goals;
create policy "goals_update_own" on public.goals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "goals_delete_own" on public.goals;
create policy "goals_delete_own" on public.goals
  for delete using (auth.uid() = user_id);

-- 8) Habilitar Realtime.
alter publication supabase_realtime add table public.goals;
