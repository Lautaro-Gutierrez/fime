-- Migration: Global Accent Color & Push Notifications

-- 1. Añadir accent_color a la tabla de preferencias
ALTER TABLE public.user_preferences 
ADD COLUMN accent_color text NOT NULL DEFAULT 'amber'
CHECK (accent_color IN ('amber', 'emerald', 'blue', 'rose', 'violet'));

-- 2. Crear tabla de suscripciones Push
CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint text NOT NULL UNIQUE,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en push_subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas para push_subscriptions
CREATE POLICY "Users can insert their own subscriptions" 
ON public.push_subscriptions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own subscriptions" 
ON public.push_subscriptions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" 
ON public.push_subscriptions FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions" 
ON public.push_subscriptions FOR DELETE 
USING (auth.uid() = user_id);

-- 3. Onboarding (Guía de Inicio)
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

