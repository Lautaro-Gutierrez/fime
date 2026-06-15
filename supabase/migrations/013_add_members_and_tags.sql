-- Migration: Add Members / Shared Accounts & Expenses Tags
-- Pegá TODO este archivo en el SQL Editor de Supabase y ejecutalo una vez.
-- Dashboard → SQL Editor → New query → pegar → RUN.

-- 1. Crear tabla de miembros
CREATE TABLE IF NOT EXISTS public.members (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS en members
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Políticas para members
CREATE POLICY "Users can select their own members"
    ON public.members FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own members"
    ON public.members FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own members"
    ON public.members FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own members"
    ON public.members FOR DELETE
    USING (auth.uid() = user_id);

-- Agregar members a la publicación de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.members;

-- 2. Modificar la tabla expenses para agregar tags y assigned_to
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.members(id) ON DELETE SET NULL;

-- 3. Modificar la tabla user_preferences para agregar custom_tags
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS custom_tags text[] NOT NULL DEFAULT '{"Facultad", "Mascotas", "Vacaciones"}'::text[];
