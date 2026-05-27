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

          <div className="flex flex-col gap-0 relative">
            {/* Source Portfolio (Readonly) */}
            <div className="flex flex-col gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 pb-5">
              <span className="text-xs font-medium text-white/40 px-1">Desde portfolio</span>
              <div className="flex items-center gap-3 px-1">
                {sourcePortfolio ? (() => {
                  const Icon = PORTFOLIO_ICONS[sourcePortfolio.icon as keyof typeof PORTFOLIO_ICONS] || Briefcase;
                  const colorClass = PORTFOLIO_COLORS[sourcePortfolio.color] || "bg-indigo-500";
                  return (
                    <>
                      <div className={cn("flex size-8 items-center justify-center rounded-lg bg-white/5", colorClass.replace('bg-', 'text-'))}>
                        <Icon className="size-4" />
                      </div>
                      <span className="text-sm font-medium text-white/90">{sourcePortfolio.name}</span>
                    </>
                  );
                })() : null}
              </div>
            </div>

            {/* Arrow Divider */}
            <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center justify-center z-10">
              <div className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-[#09090b] text-white/40 shadow-sm">
                <ArrowRight className="size-4 rotate-90" />
              </div>
            </div>

            {/* Target Portfolio Select */}
            <div className="flex flex-col gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 pt-5 mt-[-8px]">
              <span className="text-xs font-medium text-indigo-200/50 px-1 pl-12">Hacia portfolio</span>
              <div className="pl-11">
                <Select 
                  value={targetPortfolioId} 
                  onValueChange={(val) => setTargetPortfolioId(val || "")} 
                  disabled={isPending}
                >
                  <SelectTrigger className="w-full bg-white/5 hover:bg-white/10 h-11 border-white/10">
                    {targetPortfolioId ? (() => {
                      const selectedTarget = targetPortfolios.find(p => p.id === targetPortfolioId);
                      if (!selectedTarget) return <span className="text-muted-foreground">Elegir destino...</span>;
                      const Icon = PORTFOLIO_ICONS[selectedTarget.icon as keyof typeof PORTFOLIO_ICONS] || Briefcase;
                      const colorClass = PORTFOLIO_COLORS[selectedTarget.color] || "bg-indigo-500";
                      return (
                        <div className="flex items-center gap-2">
                          <div className={cn("flex size-5 items-center justify-center rounded bg-white/10", colorClass.replace('bg-', 'text-'))}>
                            <Icon className="size-3" />
                          </div>
                          <span>{selectedTarget.name}</span>
                        </div>
                      );
                    })() : (
                      <span className="text-muted-foreground">Elegir destino...</span>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {targetPortfolios.length === 0 ? (
                      <SelectItem value="none" disabled>No hay otros portfolios</SelectItem>
                    ) : (
                      targetPortfolios.map((p) => {
                        const Icon = PORTFOLIO_ICONS[p.icon as keyof typeof PORTFOLIO_ICONS] || Briefcase;
                        const colorClass = PORTFOLIO_COLORS[p.color] || "bg-indigo-500";
                        return (
                          <SelectItem key={p.id} value={p.id} className="cursor-pointer py-2">
                            <div className="flex items-center gap-2">
                              <div className={cn("flex size-6 items-center justify-center rounded bg-white/10", colorClass.replace('bg-', 'text-'))}>
                                <Icon className="size-3.5" />
                              </div>
                              <span className="font-medium">{p.name}</span>
                            </div>
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>
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
