"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreatePortfolio } from "@/hooks/use-portfolios";
import { PORTFOLIO_COLORS, PORTFOLIO_ICONS } from "./portfolio-selector";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface CreatePortfolioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePortfolioDialog({ open, onOpenChange }: CreatePortfolioDialogProps) {
  const router = useRouter();
  const create = useCreatePortfolio();
  
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("indigo");
  const [icon, setIcon] = useState<string>("briefcase");

  const isPending = create.isPending;

  function reset() {
    setName("");
    setColor("indigo");
    setIcon("briefcase");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const portfolio = await create.mutateAsync({
        name: name.trim(),
        color,
        icon,
      });
      toast.success("Portfolio creado");
      onOpenChange(false);
      reset();
      router.push(`/inversiones/${portfolio.id}`);
    } catch (err: any) {
      if (err.message?.includes("10 portfolios")) {
        toast.error("Alcanzaste el límite de 10 portfolios.");
      } else if (err.code === "23505") { // unique violation
        toast.error("Ya existe un portfolio con ese nombre.");
      } else {
        toast.error("Error al crear el portfolio");
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) reset();
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nuevo Portfolio</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-6">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Acciones Tech, Renta Fija..."
              maxLength={40}
              required
              className="bg-white/5"
            />
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
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Crear Portfolio
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
