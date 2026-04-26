"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ASSETS_BY_ID, TX_TYPE_LABELS } from "@/lib/assets";
import type { AssetType } from "@/types/database";
import {
  type Investment,
  useDeleteInvestment,
  useUpdateInvestment,
} from "@/hooks/use-investments";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  investment: Investment;
  onClose: () => void;
};

// Gradient de fondo por asset para el header.
const ASSET_CARD_GRADIENT: Record<AssetType, string> = {
  crypto: "from-orange-500/20 via-orange-500/5 to-transparent",
  stock_us: "from-indigo-500/20 via-indigo-500/5 to-transparent",
  cedear: "from-cyan-500/20 via-cyan-500/5 to-transparent",
  stock_ar: "from-sky-500/20 via-sky-500/5 to-transparent",
  bond_ar: "from-teal-500/20 via-teal-500/5 to-transparent",
  time_deposit: "from-amber-500/20 via-amber-500/5 to-transparent",
  usd_cash: "from-green-500/20 via-green-500/5 to-transparent",
};

// Acepta formato AR ("1.234,56") y anglo ("1,234.56" o "2.20").
// Regla: si hay ambos separadores, el último es el decimal. Si hay solo coma,
// es decimal AR. Si hay solo punto, es decimal JS estándar.
function parseNumber(input: string): number | null {
  if (!input) return null;
  const trimmed = input.trim().replace(/\s/g, "");
  if (!trimmed) return null;

  const hasComma = trimmed.includes(",");
  const hasDot = trimmed.includes(".");

  let cleaned: string;
  if (hasComma && hasDot) {
    const lastComma = trimmed.lastIndexOf(",");
    const lastDot = trimmed.lastIndexOf(".");
    if (lastComma > lastDot) {
      cleaned = trimmed.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = trimmed.replace(/,/g, "");
    }
  } else if (hasComma) {
    cleaned = trimmed.replace(",", ".");
  } else {
    cleaned = trimmed;
  }

  const n = Number(cleaned);
  if (!isFinite(n) || n < 0) return null;
  return n;
}

export function EditTransactionDialog({ open, investment, onClose }: Props) {
  const asset = ASSETS_BY_ID[investment.asset_type];
  const Icon = asset.icon;

  const [ticker, setTicker] = useState(investment.ticker ?? "");
  const [quantity, setQuantity] = useState(String(investment.quantity));
  const [priceUsd, setPriceUsd] = useState(
    investment.price_usd !== null ? String(investment.price_usd) : "",
  );
  const [fxRate, setFxRate] = useState(
    investment.fx_rate !== null ? String(investment.fx_rate) : "",
  );
  const [fees, setFees] = useState(String(investment.fees_usd));
  const [broker, setBroker] = useState(investment.broker ?? "");
  const [date, setDate] = useState(investment.date);
  const [note, setNote] = useState(investment.note ?? "");
  const [metadata, setMetadata] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(investment.metadata ?? {}).map(([k, v]) => [
        k,
        String(v ?? ""),
      ]),
    ),
  );

  const update = useUpdateInvestment();
  const del = useDeleteInvestment();

  useEffect(() => {
    setTicker(investment.ticker ?? "");
    setQuantity(String(investment.quantity));
    setPriceUsd(
      investment.price_usd !== null ? String(investment.price_usd) : "",
    );
    setFxRate(
      investment.fx_rate !== null ? String(investment.fx_rate) : "",
    );
    setFees(String(investment.fees_usd));
    setBroker(investment.broker ?? "");
    setDate(investment.date);
    setNote(investment.note ?? "");
    setMetadata(
      Object.fromEntries(
        Object.entries(investment.metadata ?? {}).map(([k, v]) => [
          k,
          String(v ?? ""),
        ]),
      ),
    );
  }, [investment]);

  async function save() {
    const qty = parseNumber(quantity);
    if (qty === null || qty === 0) {
      toast.error("Cantidad inválida.");
      return;
    }

    let parsedPrice: number | null = null;
    if (asset.requiresPrice) {
      parsedPrice = parseNumber(priceUsd);
      if (parsedPrice === null || parsedPrice === 0) {
        toast.error("Precio USD inválido.");
        return;
      }
    }

    if (asset.requiresTicker && !ticker.trim()) {
      toast.error("Ticker requerido.");
      return;
    }

    for (const field of asset.metadataFields) {
      if (field.required && !metadata[field.key]?.trim()) {
        toast.error(`Falta: ${field.label}`);
        return;
      }
    }

    try {
      await update.mutateAsync({
        id: investment.id,
        patch: {
          ticker: asset.requiresTicker ? ticker.trim().toUpperCase() : null,
          quantity: qty,
          price_usd: parsedPrice,
          fx_rate: parseNumber(fxRate),
          fees_usd: parseNumber(fees) ?? 0,
          broker: broker.trim() || null,
          date,
          note: note.trim() || null,
          metadata,
        },
      });
      toast.success("Operación actualizada");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  async function performDelete() {
    try {
      await del.mutateAsync(investment.id);
      toast.success("Operación eliminada");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al borrar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg overflow-hidden border-white/5 bg-card/95 p-0 backdrop-blur-xl">
        <div className="flex max-h-[85vh] flex-col">
          {/* Header con glow del asset */}
          <div
            className={cn(
              "relative flex items-center gap-3 overflow-hidden border-b border-white/5 bg-gradient-to-r p-4",
              ASSET_CARD_GRADIENT[asset.id],
            )}
          >
            <div className="relative shrink-0">
              <div
                className={cn(
                  "absolute inset-0 rounded-xl opacity-60 blur-md",
                  asset.bgClass,
                )}
              />
              <div
                className={cn(
                  "relative flex size-10 items-center justify-center rounded-xl ring-1",
                  asset.bgClass,
                  asset.textClass,
                  asset.borderClass,
                )}
              >
                <Icon className="size-5" />
              </div>
            </div>
            <div className="relative flex min-w-0 flex-col">
              <DialogTitle className="text-base font-semibold tracking-tight">
                Editar · {asset.label}
              </DialogTitle>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {TX_TYPE_LABELS[investment.tx_type]}
                {investment.ticker && ` · ${investment.ticker}`}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4 overflow-y-auto p-5">
            {asset.requiresTicker && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="e-ticker" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Ticker
                </Label>
                <Input
                  id="e-ticker"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  className="h-11 rounded-xl border-white/5 bg-card/60 font-mono text-base uppercase backdrop-blur focus-visible:border-white/20"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="e-qty" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Cantidad
                </Label>
                <Input
                  id="e-qty"
                  type="text"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-11 rounded-xl border-white/5 bg-card/60 font-mono text-base tabular-nums backdrop-blur focus-visible:border-white/20"
                />
              </div>

              {asset.requiresPrice && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="e-price" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Precio USD
                  </Label>
                  <Input
                    id="e-price"
                    type="text"
                    inputMode="decimal"
                    value={priceUsd}
                    onChange={(e) => setPriceUsd(e.target.value)}
                    className="h-11 rounded-xl border-white/5 bg-card/60 font-mono text-base tabular-nums backdrop-blur focus-visible:border-white/20"
                  />
                </div>
              )}
            </div>

            {asset.metadataFields.map((field) => (
              <div key={field.key} className="flex flex-col gap-1.5">
                <Label
                  htmlFor={`e-${field.key}`}
                  className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  {field.label}
                  {field.required && <span className="ml-1 text-rose-400">*</span>}
                </Label>
                <Input
                  id={`e-${field.key}`}
                  type={field.type === "date" ? "date" : "text"}
                  inputMode={
                    field.type === "number" || field.type === "percent"
                      ? "decimal"
                      : undefined
                  }
                  placeholder={field.placeholder}
                  value={metadata[field.key] ?? ""}
                  onChange={(e) =>
                    setMetadata({ ...metadata, [field.key]: e.target.value })
                  }
                  className="h-11 rounded-xl border-white/5 bg-card/60 backdrop-blur focus-visible:border-white/20"
                />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="e-date" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Fecha
                </Label>
                <Input
                  id="e-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 rounded-xl border-white/5 bg-card/60 backdrop-blur focus-visible:border-white/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="e-fx" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  FX rate
                </Label>
                <Input
                  id="e-fx"
                  type="text"
                  inputMode="decimal"
                  value={fxRate}
                  onChange={(e) => setFxRate(e.target.value)}
                  placeholder="Opcional"
                  className="h-11 rounded-xl border-white/5 bg-card/60 font-mono tabular-nums backdrop-blur focus-visible:border-white/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="e-broker" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Broker
                </Label>
                <Input
                  id="e-broker"
                  value={broker}
                  onChange={(e) => setBroker(e.target.value)}
                  className="h-11 rounded-xl border-white/5 bg-card/60 backdrop-blur focus-visible:border-white/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="e-fees" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Comisión (USD)
                </Label>
                <Input
                  id="e-fees"
                  type="text"
                  inputMode="decimal"
                  value={fees}
                  onChange={(e) => setFees(e.target.value)}
                  className="h-11 rounded-xl border-white/5 bg-card/60 font-mono tabular-nums backdrop-blur focus-visible:border-white/20"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="e-note" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Nota
              </Label>
              <Input
                id="e-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={120}
                className="h-11 rounded-xl border-white/5 bg-card/60 backdrop-blur focus-visible:border-white/20"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-white/5 bg-card/80 px-5 py-3 backdrop-blur">
            <Button
              variant="ghost"
              size="sm"
              onClick={performDelete}
              disabled={del.isPending}
              className="mr-auto h-10 gap-1.5 rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
            >
              <Trash2 className="size-3.5" />
              Eliminar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-10 rounded-xl border-white/5 bg-card/40 hover:bg-card/60"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={save}
              disabled={update.isPending}
              className="h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-400 hover:to-violet-500 hover:shadow-indigo-500/40 disabled:opacity-50"
            >
              {update.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
