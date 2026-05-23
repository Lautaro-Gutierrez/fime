-- =====================================================================
-- FiMe — Módulo Onboarding (Tours Contextuales Multi-Módulo)
-- Migration 009: completed_tours in user_preferences
-- =====================================================================

ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS completed_tours text[] NOT NULL DEFAULT '{}';

-- Migrar datos legados: si onboarding_completed es true, marcar 'dashboard' como completado
UPDATE public.user_preferences
SET completed_tours = ARRAY['dashboard']
WHERE onboarding_completed = true AND completed_tours = '{}';
