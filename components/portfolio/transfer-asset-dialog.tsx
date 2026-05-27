"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTransferAsset } from "@/hooks/use-transfer-asset";
import { usePortfolios } from "@/hooks/use-portfolios";
import type { ValuedHolding } from "@/lib/portfolio/holdings";
import { PORTFOLIO_ICONS, PORTFOLIO_COLORS } from "@/components/inversiones/portfolio-selector";
import { cn } from "@/lib/utils";
import { ArrowRight, Briefcase } from "lucide-react";
import { formatUSD } from "@/lib/format";
import { ASSETS_BY_ID } from "@/lib/assets";
import { AssetLogo } from "@/components/ui/asset-logo";
import { useInvestments } from "@/hooks/use-investments";
import { useInitialPositions } from "@/hooks/use-initial-positions";

interface TransferAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holding: ValuedHolding | null;
  sourcePortfolioId: string;
}

export function TransferAssetDialog({ open, onOpenChange, holding, sourcePortfolioId }: TransferAssetDialogProps) {
  const [targetPortfolioId, setTargetPortfolioId] = useState<string>("");
  const { data: portfolios = [] } = usePortfolios();
  const { data: investments = [] } = useInvestments();
  const { data: initialPositions = [] } = useInitialPositions();
  const transferAsset = useTransferAsset();

  const sourcePortfolio = portfolios.find(p => p.id === sourcePortfolioId);
  const targetPortfolios = portfolios.filter(p => p.id !== sourcePortfolioId);

  // Calcular impacto de transacciones
  const txCount = holding ? investments.filter(
    tx => tx.portfolio_id === sourcePortfolioId && 
          tx.asset_type === holding.asset_type && 
          ((!tx.ticker && !holding.ticker) || tx.ticker?.toUpperCase() === holding.ticker?.toUpperCase())
  ).length : 0;

  const ipCount = holding ? initialPositions.filter(
    ip => ip.portfolio_id === sourcePortfolioId && 
          ip.asset_type === holding.asset_type && 
          ((!ip.ticker && !holding.ticker) || ip.ticker?.toUpperCase() === holding.ticker?.toUpperCase())
  ).length : 0;

  const totalOps = txCount + ipCount;

  // Reseteamos el select al abrir
  if (!open && targetPortfolioId) {
    setTargetPortfolioId("");
  }

  const handleTransfer = async () => {
    if (!holding || !targetPortfolioId) return;

    try {
      await transferAsset.mutateAsync({
        sourcePortfolioId,
        targetPortfolioId,
        assetType: holding.asset_type,
        ticker: holding.ticker,
      });
      onOpenChange(false);
      setTargetPortfolioId("");
    } catch (error) {
      // Error manejado en el hook
    }
  };

  const isPending = transferAsset.isPending;

  if (!holding) return null;

  const asset = ASSETS_BY_ID[holding.asset_type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Mover Posición</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          {/* Asset Summary Card */}
          <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <AssetLogo 
              assetType={holding.asset_type} 
              ticker={holding.ticker} 
              issuer={holding.metadata?.issuer as string}
              size="lg" 
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{holding.label}</span>
                <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded bg-opacity-20", asset.bgClass, asset.textClass)}>
                  {asset.short}
                </span>
              </div>
              <span className="text-xs text-white/50 mt-0.5">
                {holding.quantity} {holding.quantity === 1 ? 'unidad' : 'unidades'} · {formatUSD(holding.current_value_usd)}
              </span>
              <span className="text-xs text-white/40 mt-0.5">
                Representa el {holding.weight_pct.toFixed(1)}% del portfolio origen
              </span>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            {/* Source Portfolio (Readonly) */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-white/40">Origen</span>
              <div className="flex h-10 w-full items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 opacity-70">
                {sourcePortfolio ? (() => {
                  const Icon = PORTFOLIO_ICONS[sourcePortfolio.icon as keyof typeof PORTFOLIO_ICONS] || Briefcase;
                  const colorClass = PORTFOLIO_COLORS[sourcePortfolio.color] || "bg-indigo-500";
                  return (
                    <>
                      <div className={cn("flex size-5 items-center justify-center rounded bg-white/10 text-white")}>
                        <Icon className="size-3" />
                      </div>
                      <span className="truncate text-sm text-white/70">{sourcePortfolio.name}</span>
                    </>
                  );
                })() : null}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center pt-6 text-white/20">
              <ArrowRight className="size-4" />
            </div>

            {/* Target Portfolio Select */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-white/70">Destino</span>
              <Select 
                value={targetPortfolioId} 
                onValueChange={(val) => setTargetPortfolioId(val || "")} 
                disabled={isPending}
              >
                <SelectTrigger className="w-full bg-white/5 hover:bg-white/10">
                  <SelectValue placeholder="Elegir..." />
                </SelectTrigger>
                <SelectContent>
                  {targetPortfolios.length === 0 ? (
                    <SelectItem value="none" disabled>No hay otros portfolios</SelectItem>
                  ) : (
                    targetPortfolios.map((p) => {
                      const Icon = PORTFOLIO_ICONS[p.icon as keyof typeof PORTFOLIO_ICONS] || Briefcase;
                      const colorClass = PORTFOLIO_COLORS[p.color] || "bg-indigo-500";
                      return (
                        <SelectItem key={p.id} value={p.id} className="cursor-pointer">
                          <div className="flex items-center gap-2">
                            <div className={cn("flex size-5 items-center justify-center rounded bg-white/10", colorClass.replace('bg-', 'text-'))}>
                              <Icon className="size-3" />
                            </div>
                            <span>{p.name}</span>
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Warning Note */}
          <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-3 text-xs text-indigo-200/70">
            Se moverán <strong className="text-indigo-200">{txCount} transacciones</strong> y <strong className="text-indigo-200">{ipCount} posiciones iniciales</strong> al portfolio destino. Esto modificará los reportes de rendimiento de ambos portfolios.
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button 
            onClick={handleTransfer} 
            disabled={!targetPortfolioId || isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isPending ? "Moviendo..." : "Confirmar Movimiento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
