-- =====================================================================
-- FiMe — Módulo 1: Gastos Personales
-- Migration 006: agregar columna `type` (fijo / variable) a expenses
-- =====================================================================
-- Para que el Sankey de Ingresos pueda discriminar gastos fijos vs variables
-- y vincular los buckets de distribución a los gastos reales del mes.
-- =====================================================================

-- 1) Enum estricto: fixed | variable.
do $$ begin
  create type public.expense_type as enum (
    'fixed',
    'variable'
  );
exception
  when duplicate_object then null;
end $$;

-- 2) Columna nueva con default 'variable'.
--    Los registros existentes quedan como 'variable' (asunción conservadora).
--    Null no permitido — siempre hay un tipo.
alter table public.expenses
  add column if not exists type public.expense_type not null default 'variable';

-- 3) Índice compuesto para queries del Sankey: suma por type en un mes.
create index if not exists expenses_user_type_date_idx
  on public.expenses (user_id, type, date desc);
