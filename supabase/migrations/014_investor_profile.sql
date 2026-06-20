-- =====================================================================
-- FiMe — Módulo: Perfil de Inversor
-- Migration 014: investor_profile + investor_profile_tests
-- =====================================================================

-- 1) Agregar columnas de perfil de inversor a la tabla user_preferences
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS investor_profile text
    CHECK (investor_profile IN ('conservador', 'moderado', 'agresivo')),
  ADD COLUMN IF NOT EXISTS investor_profile_completed_at timestamptz DEFAULT NULL;

-- 2) Crear tabla para el historial de tests
CREATE TABLE IF NOT EXISTS public.investor_profile_tests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers     jsonb NOT NULL,          -- Respuestas en formato JSON
  total_score smallint NOT NULL,       -- Suma total de puntaje del test
  result      text NOT NULL CHECK (result IN ('conservador', 'moderado', 'agresivo')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexar por user_id para búsquedas eficientes
CREATE INDEX IF NOT EXISTS investor_profile_tests_user_idx
  ON public.investor_profile_tests (user_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.investor_profile_tests ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "investor_profile_tests_select_own" ON public.investor_profile_tests;
CREATE POLICY "investor_profile_tests_select_own"
  ON public.investor_profile_tests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "investor_profile_tests_insert_own" ON public.investor_profile_tests;
CREATE POLICY "investor_profile_tests_insert_own"
  ON public.investor_profile_tests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Añadir tabla a realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.investor_profile_tests;
