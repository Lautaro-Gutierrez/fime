-- =====================================================================
-- FiMe — Multi-Portfolio
-- Migration 010: portfolios table + FK migration
-- =====================================================================
-- IMPORTANTE: Ejecutar en una sola transacción en SQL Editor de Supabase.
-- =====================================================================

BEGIN;

-- 1) Tabla de portfolios
CREATE TABLE IF NOT EXISTS public.portfolios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL CHECK (length(name) BETWEEN 1 AND 40),
  color       text NOT NULL DEFAULT 'indigo',
  icon        text NOT NULL DEFAULT 'briefcase',
  is_default  boolean NOT NULL DEFAULT false,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS portfolios_user_idx 
  ON public.portfolios (user_id, sort_order);

-- Trigger updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.portfolios;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- RLS
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolios_select_own" ON public.portfolios
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "portfolios_insert_own" ON public.portfolios
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "portfolios_update_own" ON public.portfolios
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "portfolios_delete_own" ON public.portfolios
  FOR DELETE USING (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.portfolios;

-- 2) Crear portfolio "Principal" para cada usuario existente
INSERT INTO public.portfolios (user_id, name, color, icon, is_default, sort_order)
SELECT DISTINCT user_id, 'Principal', 'indigo', 'briefcase', true, 0
FROM public.investments
UNION
SELECT DISTINCT user_id, 'Principal', 'indigo', 'briefcase', true, 0
FROM public.initial_positions
ON CONFLICT (user_id, name) DO NOTHING;

-- 3) Agregar portfolio_id a investments
ALTER TABLE public.investments 
  ADD COLUMN IF NOT EXISTS portfolio_id uuid REFERENCES public.portfolios(id) ON DELETE SET NULL;

-- Asignar todas las inversiones existentes al portfolio "Principal"
UPDATE public.investments i
SET portfolio_id = p.id
FROM public.portfolios p
WHERE p.user_id = i.user_id AND p.is_default = true
  AND i.portfolio_id IS NULL;

-- 4) Agregar portfolio_id a initial_positions
ALTER TABLE public.initial_positions 
  ADD COLUMN IF NOT EXISTS portfolio_id uuid REFERENCES public.portfolios(id) ON DELETE SET NULL;

UPDATE public.initial_positions ip
SET portfolio_id = p.id
FROM public.portfolios p
WHERE p.user_id = ip.user_id AND p.is_default = true
  AND ip.portfolio_id IS NULL;

-- 5) Migrar portfolio_snapshots: agregar portfolio_id
ALTER TABLE public.portfolio_snapshots 
  ADD COLUMN IF NOT EXISTS portfolio_id uuid REFERENCES public.portfolios(id) ON DELETE CASCADE;

UPDATE public.portfolio_snapshots ps
SET portfolio_id = p.id
FROM public.portfolios p
WHERE p.user_id = ps.user_id AND p.is_default = true
  AND ps.portfolio_id IS NULL;

-- Recrear PK: portfolio_id + date (en vez de user_id + date)
ALTER TABLE public.portfolio_snapshots DROP CONSTRAINT IF EXISTS portfolio_snapshots_pkey;
ALTER TABLE public.portfolio_snapshots 
  ALTER COLUMN portfolio_id SET NOT NULL;
ALTER TABLE public.portfolio_snapshots 
  ADD PRIMARY KEY (portfolio_id, date);

-- La columna user_id se mantiene como redundancia denormalizada para RLS
-- (performance: no necesita JOIN con portfolios para el check de auth.uid())

-- 6) Índices nuevos
CREATE INDEX IF NOT EXISTS investments_portfolio_idx 
  ON public.investments (portfolio_id);
CREATE INDEX IF NOT EXISTS initial_positions_portfolio_idx 
  ON public.initial_positions (portfolio_id);
CREATE INDEX IF NOT EXISTS portfolio_snapshots_portfolio_date_idx 
  ON public.portfolio_snapshots (portfolio_id, date DESC);

-- 7) Trigger para limitar a 10 portfolios por usuario
CREATE OR REPLACE FUNCTION public.tg_check_portfolio_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT count(*) FROM public.portfolios WHERE user_id = NEW.user_id) >= 10 THEN
    RAISE EXCEPTION 'Maximum of 10 portfolios per user reached';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_portfolio_limit ON public.portfolios;
CREATE TRIGGER check_portfolio_limit
  BEFORE INSERT ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.tg_check_portfolio_limit();

-- 8) Función para reasignar operaciones huérfanas al portfolio default
CREATE OR REPLACE FUNCTION public.tg_reassign_orphan_investments()
RETURNS TRIGGER AS $$
BEGIN
  -- Reasignar investments
  UPDATE public.investments 
  SET portfolio_id = (
    SELECT id FROM public.portfolios 
    WHERE user_id = OLD.user_id AND is_default = true 
    LIMIT 1
  )
  WHERE portfolio_id = OLD.id;
  
  -- Reasignar initial_positions
  UPDATE public.initial_positions 
  SET portfolio_id = (
    SELECT id FROM public.portfolios 
    WHERE user_id = OLD.user_id AND is_default = true 
    LIMIT 1
  )
  WHERE portfolio_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reassign_orphan_investments ON public.portfolios;
CREATE TRIGGER reassign_orphan_investments
  BEFORE DELETE ON public.portfolios
  FOR EACH ROW 
  WHEN (OLD.is_default = false)
  EXECUTE FUNCTION public.tg_reassign_orphan_investments();

-- 9) Prevent deletion of default portfolio
CREATE OR REPLACE FUNCTION public.tg_prevent_default_portfolio_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_default = true THEN
    RAISE EXCEPTION 'Cannot delete the default portfolio';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_default_delete ON public.portfolios;
CREATE TRIGGER prevent_default_delete
  BEFORE DELETE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.tg_prevent_default_portfolio_delete();

COMMIT;
