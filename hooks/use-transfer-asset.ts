"use client";

import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { AssetType } from "@/types/database";

export type TransferAssetInput = {
  sourcePortfolioId: string;
  targetPortfolioId: string;
  assetType: AssetType;
  ticker: string | null;
};

export function useTransferAsset() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourcePortfolioId,
      targetPortfolioId,
      assetType,
      ticker,
    }: TransferAssetInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (!user) throw new Error("No autenticado");

      const { data, error } = await supabase
        .rpc("transfer_asset", {
        p_user_id: user.id,
        p_source_portfolio: sourcePortfolioId,
        p_target_portfolio: targetPortfolioId,
        p_asset_type: assetType,
        p_ticker: ticker,
      });

      if (error) throw error;
      return data as { investments_moved: number; initial_positions_moved: number };
    },
    onSuccess: (data, variables) => {
      // Invalidar las queries principales de operaciones
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      queryClient.invalidateQueries({ queryKey: ["initial_positions"] });
      
      // Invalidar los snapshots de ambos portfolios involucrados
      queryClient.invalidateQueries({ 
        queryKey: ["portfolio_snapshots", variables.sourcePortfolioId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["portfolio_snapshots", variables.targetPortfolioId] 
      });

      // El total de ops movidas para feedback en UI
      const totalOps = (data?.investments_moved || 0) + (data?.initial_positions_moved || 0);
      
      const tickerLabel = variables.ticker ? variables.ticker.toUpperCase() : 
                          variables.assetType === "usd_cash" ? "USD" : "Activo";

      if (totalOps > 0) {
        toast.success(`Posición de ${tickerLabel} movida exitosamente`, {
          description: `Se movieron ${totalOps} ${totalOps === 1 ? 'operación' : 'operaciones'} al nuevo portfolio.`,
        });
      } else {
        toast.info("No se encontraron operaciones para mover.");
      }
    },
    onError: (error) => {
      console.error("Error transferring asset:", error);
      toast.error("Ocurrió un error al mover la posición", {
        description: "Por favor, intentá nuevamente.",
      });
    }
  });
}
