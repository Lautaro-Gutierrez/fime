"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Reorder } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeletePortfolio, useUpdatePortfolio, type Portfolio } from "@/hooks/use-portfolios";
import { EditPortfolioDialog } from "./edit-portfolio-dialog";
import { PORTFOLIO_ICONS, PORTFOLIO_COLORS, PORTFOLIO_TEXT_COLORS } from "./portfolio-selector";
import { cn } from "@/lib/utils";
import { Edit2, GripVertical, Lock, Trash2, AlertTriangle, Plus } from "lucide-react";

interface ManagePortfoliosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolios: Portfolio[];
}

export function ManagePortfoliosDialog({ open, onOpenChange, portfolios }: ManagePortfoliosDialogProps) {
  const deletePortfolio = useDeletePortfolio();
  const updatePortfolio = useUpdatePortfolio();
  
  const [items, setItems] = useState(portfolios);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sync state when props change
  if (items.length !== portfolios.length && open) {
    setItems(portfolios);
  }

  const handleReorder = async (newOrder: Portfolio[]) => {
    setItems(newOrder);
    // Optimistic / async updates
    try {
      await Promise.all(
        newOrder.map((p, index) => {
          if (p.sort_order !== index) {
            return updatePortfolio.mutateAsync({ id: p.id, patch: { sort_order: index } });
          }
          return Promise.resolve();
        })
      );
    } catch (err) {
      toast.error("Error al reordenar los portfolios");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deletePortfolio.mutateAsync(deletingId);
      toast.success("Portfolio eliminado. Operaciones movidas al Principal.");
      setDeletingId(null);
    } catch (err) {
      toast.error("Error al eliminar el portfolio");
    }
  };

  const editingPortfolio = portfolios.find((p) => p.id === editingId) || null;
  const deletingPortfolio = portfolios.find((p) => p.id === deletingId) || null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Administrar Portfolios</DialogTitle>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <Reorder.Group axis="y" values={items} onReorder={handleReorder} className="flex flex-col gap-2">
              {items.map((p) => {
                const Icon = PORTFOLIO_ICONS[p.icon as keyof typeof PORTFOLIO_ICONS] || PORTFOLIO_ICONS.briefcase;
                const colorClass = PORTFOLIO_TEXT_COLORS[p.color] || "text-indigo-400";
                
                return (
                  <Reorder.Item
                    key={p.id}
                    value={p}
                    className="group relative flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 backdrop-blur-sm transition-colors hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="cursor-grab p-1 text-muted-foreground/50 hover:text-foreground active:cursor-grabbing">
                        <GripVertical className="size-4" />
                      </div>
                      <div className={cn("flex size-8 items-center justify-center rounded-lg bg-white/5", colorClass)}>
                        <Icon className="size-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{p.name}</span>
                        {p.is_default && (
                          <span className="text-[10px] uppercase text-indigo-400/80">Default</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setEditingId(p.id)}
                      >
                        <Edit2 className="size-4 text-muted-foreground" />
                      </Button>
                      
                      {p.is_default ? (
                        <div className="flex size-8 items-center justify-center">
                          <Lock className="size-4 text-muted-foreground/50" />
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                          onClick={() => setDeletingId(p.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
            
            <div className="flex justify-end pt-4">
              <Button onClick={() => onOpenChange(false)}>Listo</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <EditPortfolioDialog
        open={!!editingId}
        onOpenChange={(val) => !val && setEditingId(null)}
        portfolio={editingPortfolio}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingId} onOpenChange={(val) => !val && setDeletingId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Eliminar Portfolio</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
              <AlertTriangle className="size-5 shrink-0 text-amber-400" />
              <p>
                El portfolio <strong>{deletingPortfolio?.name}</strong> será eliminado. Sus operaciones no se borrarán, pero serán reasignadas automáticamente al portfolio Principal.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDeletingId(null)} disabled={deletePortfolio.isPending}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={deletePortfolio.isPending}
              >
                {deletePortfolio.isPending ? "Eliminando..." : "Eliminar y Reasignar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
