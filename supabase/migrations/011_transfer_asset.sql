-- =====================================================================
-- FiMe — Multi-Portfolio
-- Migration 011: Transfer Asset RPC
-- =====================================================================
-- IMPORTANTE: Ejecutar en una sola transacción en SQL Editor de Supabase.
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.transfer_asset(
  p_user_id        uuid,
  p_source_portfolio uuid,
  p_target_portfolio uuid,
  p_asset_type     text,
  p_ticker         text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_inv_count  int;
  v_ip_count   int;
BEGIN
  -- Validaciones
  IF p_source_portfolio = p_target_portfolio THEN
    RAISE EXCEPTION 'Source and target portfolio cannot be the same';
  END IF;

  -- Verificar que ambos portfolios pertenecen al usuario
  IF NOT EXISTS (
    SELECT 1 FROM public.portfolios WHERE id = p_source_portfolio AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Source portfolio not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.portfolios WHERE id = p_target_portfolio AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Target portfolio not found';
  END IF;

  -- Actualizar investments
  UPDATE public.investments
  SET portfolio_id = p_target_portfolio, updated_at = now()
  WHERE user_id = p_user_id
    AND portfolio_id = p_source_portfolio
    AND asset_type = p_asset_type::public.asset_type
    AND (
      (p_ticker IS NULL AND ticker IS NULL) OR
      (UPPER(ticker) = UPPER(p_ticker))
    );
  GET DIAGNOSTICS v_inv_count = ROW_COUNT;

  -- Actualizar initial_positions
  UPDATE public.initial_positions
  SET portfolio_id = p_target_portfolio, updated_at = now()
  WHERE user_id = p_user_id
    AND portfolio_id = p_source_portfolio
    AND asset_type = p_asset_type::public.asset_type
    AND (
      (p_ticker IS NULL AND ticker IS NULL) OR
      (UPPER(ticker) = UPPER(p_ticker))
    );
  GET DIAGNOSTICS v_ip_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'investments_moved', v_inv_count,
    'initial_positions_moved', v_ip_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
