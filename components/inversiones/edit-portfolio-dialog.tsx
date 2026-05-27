"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdatePortfolio, type Portfolio } from "@/hooks/use-portfolios";
import { PORTFOLIO_COLORS, PORTFOLIO_ICONS } from "./portfolio-selector";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface EditPortfolioDialogProps {
  portfolio: Portfolio | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPortfolioDialog({ portfolio, open, onOpenChange }: EditPortfolioDialogProps) {
  const update = useUpdatePortfolio();
  
  const [name, setName] = useState("");
  const [color, setColor] = useState("indigo");
  const [icon, setIcon] = useState("briefcase");

  useEffect(() => {
    if (portfolio) {
      setName(portfolio.name);
      setColor(portfolio.color);
      setIcon(portfolio.icon);
    }
  }, [portfolio]);

  const isPending = update.isPending;
  const isDefault = portfolio?.is_default;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!portfolio || !name.trim()) return;

    try {
      await update.mutateAsync({
        id: portfolio.id,
        patch: {
          name: isDefault ? portfolio.name : name.trim(), // Prevent renaming default
          color,
          icon,
        },
      });
      toast.success("Portfolio actualizado");
      onOpenChange(false);
    } catch (err: any) {
      if (err.code === "23505") {
        toast.error("Ya existe un portfolio con ese nombre.");
      } else {
        toast.error("Error al actualizar el portfolio");
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Portfolio</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-6">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              required
              disabled={isDefault}
              className="bg-white/5 disabled:opacity-50"
            />
            {isDefault && (
              <p className="text-[10px] text-muted-foreground">
                No podés cambiar el nombre del portfolio Principal.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label>Color</Label>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
              {Object.keys(PORTFOLIO_COLORS).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full transition-transform hover:scale-110",
                    color === c ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-950" : "opacity-60",
                    PORTFOLIO_COLORS[c]
                  )}
                  style={{ backgroundColor: `var(--${c}-500)` }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Ícono</Label>
            <div className="grid grid-cols-6 gap-2">
              {Object.entries(PORTFOLIO_ICONS).map(([k, IconComp]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setIcon(k)}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl border transition-all",
                    icon === k
                      ? "border-white/20 bg-white/10"
                      : "border-transparent bg-white/5 opacity-60 hover:bg-white/10 hover:opacity-100"
                  )}
                >
                  <IconComp className={cn("size-5", icon === k && PORTFOLIO_COLORS[color]?.replace('bg-', 'text-'))} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || (!isDefault && !name.trim())}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
