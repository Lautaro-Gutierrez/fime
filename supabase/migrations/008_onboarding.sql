-- =====================================================================
-- FiMe — Módulo Onboarding (Guía de Inicio)
-- Migration 008: onboarding_completed in user_preferences
-- =====================================================================

ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
