"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Pencil, Plus, Trash2, Package } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ASSETS, ASSETS_BY_ID } from "@/lib/assets";
import type { AssetConfig } from "@/lib/assets";
import type { AssetType } from "@/types/database";
import { toISODate, formatQuantity, formatUSD } from "@/lib/format";
import {
  useInitialPositions,
  useCreateInitialPosition,
  useDeleteInitialPosition,
  useUpdateInitialPosition,
  type InitialPosition,
} from "@/hooks/use-initial-positions";
import { cn } from "@/lib/utils";

// Gradient por asset (reusa convención M2).
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
// Regla: si hay ambos separadores, el último es el decimal. Si hay solo uno,
// la coma se interpreta como decimal (AR) y el punto como decimal (JS estándar).
function parseNumber(v: string): number | null {
  if (!v) return null;
  const trimmed = v.trim().replace(/\s/g, "");
  if (!trimmed) return null;

  const hasComma = trimmed.includes(",");
  const hasDot = trimmed.includes(".");

  let cleaned: string;
  if (hasComma && hasDot) {
    const lastComma = trimmed.lastIndexOf(",");
    const lastDot = trimmed.lastIndexOf(".");
    if (lastComma > lastDot) {
      // "1.234,56" → AR
      cleaned = trimmed.replace(/\./g, "").replace(",", ".");
    } else {
      // "1,234.56" → anglo
      cleaned = trimmed.replace(/,/g, "");
    }
  } else if (hasComma) {
    cleaned = trimmed.replace(",", ".");
  } else {
    cleaned = trimmed;
  }

  const n = Number(cleaned);
  return isFinite(n) && n > 0 ? n : null;
}

type Step = "list" | "select" | "form";

export function InitialPositionsDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("list");
  const [asset, setAsset] = useState<AssetConfig | null>(null);
  const [editing, setEditing] = useState<InitialPosition | null>(null);

  const { data: positions = [] } = useInitialPositions();
  const createMut = useCreateInitialPosition();
  const updateMut = useUpdateInitialPosition();
  const deleteMut = useDeleteInitialPosition();

  useEffect(() => {
    if (!open) {
      setStep("list");
      setAsset(null);
      setEditing(null);
    }
  }, [open]);

  function handleSelectAsset(a: AssetConfig) {
    setAsset(a);
    setEditing(null);
    setStep("form");
  }

  function handleEdit(p: InitialPosition) {
    setEditing(p);
    setAsset(ASSETS_BY_ID[p.asset_type]);
    setStep("form");
  }

  async function handleDelete(id: string) {
    try {
      await deleteMut.mutateAsync(id);
      toast.success("Posición eliminada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className="inline-flex items-center gap-2 rounded-full border-white/10 bg-card/60 text-xs font-medium backdrop-blur hover:border-white/20"
          />
        }
      >
        <Package className="size-3.5" />
        Posiciones iniciales
        {positions.length > 0 && (
          <span className="rounded-full bg-fuchsia-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-fuchsia-300">
            {positions.length}
          </span>
        )}
      </DialogTrigger>

      <DialogContent
        className="border-white/5 bg-card/95 backdrop-blur-xl overflow-hidden sm:max-w-lg"
        showCloseButton
      >
        <div className="flex items-center gap-3">
          {step !== "list" && (
            <button
              onClick={() => {
                // En edit, volvemos directo a lista (saltamos "select").
                if (step === "form" && editing) {
                  setStep("list");
                  setEditing(null);
                  setAsset(null);
                } else if (step === "form") {
                  setStep("select");
                } else {
                  setStep("list");
                }
              }}
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <DialogTitle className="text-base font-semibold">
            {step === "list" && "Posiciones iniciales"}
            {step === "select" && "Elegí un tipo"}
            {step === "form" &&
              asset &&
              (editing ? `Editar · ${asset.label}` : `Nueva · ${asset.label}`)}
          </DialogTitle>
        </div>

        <AnimatePresence mode="wait">
          {step === "list" && (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-2"
            >
              <p className="text-xs text-muted-foreground">
                Tenencias previas al uso de la app. Se combinan con el blotter
                para calcular holdings actuales.
              </p>

              {positions.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 py-8">
                  <Package className="size-6 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    Sin posiciones cargadas
                  </p>
                </div>
              ) : (
                <div className="flex max-h-[280px] flex-col divide-y divide-white/5 overflow-y-auto rounded-2xl border border-white/5 bg-card/40">
                  {positions.map((p) => {
                    const a = ASSETS_BY_ID[p.asset_type];
                    const Icon = a.icon;
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 px-3 py-2.5"
                      >
                        <div
                          className={`flex size-8 items-center justify-center rounded-lg ring-1 ${a.bgClass} ${a.textClass} ${a.borderClass}`}
                        >
                          <Icon className="size-3.5" />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-semibold">
                            {p.ticker ?? a.label}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            <span className="font-mono tabular-nums">
                              {formatQuantity(p.quantity)}
                            </span>
                            <span className="mx-1">·</span>
                            <span className="font-mono tabular-nums">
                              avg {formatUSD(p.avg_cost_usd)}
                            </span>
                          </span>
                        </div>
                        <button
                          onClick={() => handleEdit(p)}
                          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-fuchsia-500/10 hover:text-fuchsia-300"
                          aria-label="Editar"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deleteMut.isPending}
                          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <Button
                onClick={() => setStep("select")}
                className="mt-1 h-11 w-full rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 text-sm font-medium shadow-lg shadow-fuchsia-500/20 hover:from-fuchsia-400 hover:to-violet-500"
              >
                <Plus className="mr-1 size-4" />
                Agregar posición
              </Button>
            </motion.div>
          )}

          {step === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-2 gap-2"
            >
              {ASSETS.filter((a) => a.id !== "bond_ar").map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.id}
                    onClick={() => handleSelectAsset(a)}
                    className={cn(
                      "group relative flex flex-col items-start gap-1.5 overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br p-3 text-left backdrop-blur transition hover:border-white/15",
                      ASSET_CARD_GRADIENT[a.id],
                    )}
                  >
                    <div
                      className={`flex size-8 items-center justify-center rounded-lg ring-1 ${a.bgClass} ${a.textClass} ${a.borderClass}`}
                    >
                      <Icon className="size-4" />
                    </div>
                    <span className="text-sm font-semibold">{a.label}</span>
                  </button>
                );
              })}
            </motion.div>
          )}

          {step === "form" && asset && (
            <InitialPositionForm
              asset={asset}
              initial={editing}
              onCancel={() => {
                if (editing) {
                  setStep("list");
                  setEditing(null);
                  setAsset(null);
                } else {
                  setStep("select");
                }
              }}
              onSubmit={async (payload) => {
                try {
                  if (editing) {
                    await updateMut.mutateAsync({
                      id: editing.id,
                      patch: {
                        ticker: payload.ticker,
                        quantity: payload.quantity,
                        avg_cost_usd: payload.avg_cost_usd,
                        as_of_date: payload.as_of_date,
                        note: payload.note,
                        metadata: payload.metadata,
                      },
                    });
                    toast.success("Posición actualizada");
                  } else {
                    await createMut.mutateAsync(payload);
                    toast.success("Posición agregada");
                  }
                  setStep("list");
                  setAsset(null);
                  setEditing(null);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Error al guardar");
                }
              }}
              submitting={createMut.isPending || updateMut.isPending}
            />
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

type FormPayload = {
  asset_type: AssetType;
  ticker: string | null;
  quantity: number;
  avg_cost_usd: number;
  as_of_date: string;
  note: string | null;
  metadata: Record<string, unknown>;
};

function InitialPositionForm({
  asset,
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  asset: AssetConfig;
  initial?: InitialPosition | null;
  onSubmit: (p: FormPayload) => void | Promise<void>;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [ticker, setTicker] = useState(initial?.ticker ?? "");
  const [quantity, setQuantity] = useState(
    initial ? String(initial.quantity) : "",
  );
  const [avgCost, setAvgCost] = useState(
    initial
      ? String(initial.avg_cost_usd)
      : asset.id === "usd_cash"
        ? "1"
        : asset.id === "time_deposit"
          ? "1"
          : "",
  );
  const [date, setDate] = useState(initial?.as_of_date ?? toISODate(new Date()));
  const [note, setNote] = useState(initial?.note ?? "");
  const [metadata, setMetadata] = useState<Record<string, string>>(
    initial?.metadata
      ? Object.fromEntries(
          Object.entries(initial.metadata).map(([k, v]) => [k, String(v ?? "")]),
        )
      : {},
  );

  const canSubmit = useMemo(() => {
    const qty = parseNumber(quantity);
    const cost = parseNumber(avgCost);
    if (qty === null || cost === null) return false;
    if (asset.requiresTicker && !ticker.trim()) return false;
    for (const field of asset.metadataFields) {
      if (field.required && !metadata[field.key]) return false;
    }
    return true;
  }, [asset, ticker, quantity, avgCost, metadata]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseNumber(quantity);
    const cost = parseNumber(avgCost);
    if (qty === null || cost === null) return;
    const meta: Record<string, unknown> = {};
    for (const field of asset.metadataFields) {
      const v = metadata[field.key];
      if (!v) continue;
      if (field.type === "number" || field.type === "percent") {
        const n = parseNumber(v);
        if (n !== null) meta[field.key] = n;
      } else {
        meta[field.key] = v;
      }
    }
    await onSubmit({
      asset_type: asset.id,
      ticker: asset.requiresTicker ? ticker.trim().toUpperCase() : null,
      quantity: qty,
      avg_cost_usd: cost,
      as_of_date: date,
      note: note.trim() || null,
      metadata: meta,
    });
  }

  const inputCls =
    "h-11 rounded-xl border-white/5 bg-card/60 backdrop-blur focus-visible:border-white/20";

  return (
    <motion.form
      key="form"
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.15 }}
      onSubmit={handleSubmit}
      className="flex flex-col gap-3"
    >
      {asset.requiresTicker && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ticker" className="text-xs text-muted-foreground">
            Ticker
          </Label>
          <Input
            id="ticker"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder={asset.id === "crypto" ? "BTC, ETH, SOL" : "AAPL, GGAL"}
            className={inputCls}
            autoFocus
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="qty" className="text-xs text-muted-foreground">
            Cantidad
          </Label>
          <Input
            id="qty"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0.00"
            inputMode="decimal"
            className={cn(inputCls, "font-mono tabular-nums")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="avgcost" className="text-xs text-muted-foreground">
            Costo promedio (USD)
          </Label>
          <Input
            id="avgcost"
            value={avgCost}
            onChange={(e) => setAvgCost(e.target.value)}
            placeholder="0.00"
            inputMode="decimal"
            className={cn(inputCls, "font-mono tabular-nums")}
            disabled={asset.id === "usd_cash"}
          />
        </div>
      </div>

      {asset.metadataFields.map((field) => (
        <div key={field.key} className="flex flex-col gap-1.5">
          <Label htmlFor={field.key} className="text-xs text-muted-foreground">
            {field.label}
            {field.required && <span className="text-rose-400"> *</span>}
          </Label>
          <Input
            id={field.key}
            type={field.type === "date" ? "date" : "text"}
            value={metadata[field.key] ?? ""}
            onChange={(e) =>
              setMetadata({ ...metadata, [field.key]: e.target.value })
            }
            placeholder={field.placeholder}
            inputMode={
              field.type === "number" || field.type === "percent"
                ? "decimal"
                : undefined
            }
            className={inputCls}
          />
        </div>
      ))}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="date" className="text-xs text-muted-foreground">
          Fecha del snapshot
        </Label>
        <Input
          id="date"
          type="date"
          value={date}
          max={toISODate(new Date())}
          onChange={(e) => setDate(e.target.value)}
          className={inputCls}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note" className="text-xs text-muted-foreground">
          Nota (opcional)
        </Label>
        <Input
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Broker, contexto, etc."
          className={inputCls}
        />
      </div>

      <div className="mt-1 flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="h-11 flex-1 rounded-xl border-white/10 bg-card/60 backdrop-blur"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={!canSubmit || submitting}
          className="h-11 flex-1 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 font-medium shadow-lg shadow-fuchsia-500/20 hover:from-fuchsia-400 hover:to-violet-500"
        >
          {submitting ? "Guardando..." : initial ? "Actualizar" : "Guardar"}
        </Button>
      </div>
    </motion.form>
  );
}
