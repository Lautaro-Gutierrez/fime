"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ASSETS, TX_TYPE_LABELS } from "@/lib/assets";
import type { AssetConfig } from "@/lib/assets";
import type { AssetType, TxType } from "@/types/database";
import type { FxRates } from "@/lib/prices/types";
import { useCreateInvestment } from "@/hooks/use-investments";
import { toISODate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getCedearRatio } from "@/lib/portfolio/cedear-ratios";

// ARS-denominated asset types (need fx_rate conversion to USD).
const ARS_DENOMINATED: AssetType[] = ["cedear", "stock_ar", "bond_ar", "on"];

// Gradient de fondo por asset en las cards del selector.
const ASSET_CARD_GRADIENT: Record<AssetType, string> = {
  crypto: "from-orange-500/20 via-orange-500/5 to-transparent",
  stock_us: "from-indigo-500/20 via-indigo-500/5 to-transparent",
  cedear: "from-cyan-500/20 via-cyan-500/5 to-transparent",
  stock_ar: "from-sky-500/20 via-sky-500/5 to-transparent",
  bond_ar: "from-teal-500/20 via-teal-500/5 to-transparent",
  time_deposit: "from-theme-500/20 via-theme-500/5 to-transparent",
  usd_cash: "from-green-500/20 via-green-500/5 to-transparent",
  on: "from-violet-500/20 via-violet-500/5 to-transparent",
};

type FormState = {
  tx_type: TxType;
  ticker: string;
  quantity: string;
  price: string; // input en moneda local (USD o ARS)
  currency: "USD" | "ARS";
  fx_rate: string;
  fees: string;
  broker: string;
  date: string;
  note: string;
  metadata: Record<string, string>;
};

function defaultForm(asset: AssetConfig, fxRates?: FxRates): FormState {
  const isArsDenominated = ARS_DENOMINATED.includes(asset.id);
  const defaultFx = asset.id === "cedear" ? fxRates?.ccl : fxRates?.mep;
  return {
    tx_type: asset.allowedTxTypes[0],
    ticker: "",
    quantity: "",
    price: "",
    currency: isArsDenominated ? "ARS" : "USD",
    fx_rate: isArsDenominated && defaultFx ? defaultFx.toString() : "",
    fees: "",
    broker: "",
    date: toISODate(new Date()),
    note: "",
    metadata: {},
  };
}

async function fetchFx(): Promise<FxRates> {
  const res = await fetch("/api/prices/fx", { cache: "no-store" });
  if (!res.ok) throw new Error("fx fetch failed");
  return res.json();
}

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

export function NewTransactionDialog() {
  const [open, setOpen] = useState(false);
  const [asset, setAsset] = useState<AssetConfig | null>(null);
  const [form, setForm] = useState<FormState | null>(null);

  const { data: fx } = useQuery({
    queryKey: ["fx-rates"],
    queryFn: fetchFx,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const createTx = useCreateInvestment();

  useEffect(() => {
    if (!open) {
      setAsset(null);
      setForm(null);
    }
  }, [open]);

  function selectAsset(a: AssetConfig) {
    setAsset(a);
    setForm(defaultForm(a, fx));
  }

  function back() {
    setAsset(null);
    setForm(null);
  }

  async function submit() {
    if (!asset || !form) return;

    const qty = parseNumber(form.quantity);
    if (qty === null || qty === 0) {
      toast.error("Ingresá una cantidad válida.");
      return;
    }

    let priceUsd: number | null = null;
    let fxRate: number | null = null;

    if (asset.requiresPrice) {
      const price = parseNumber(form.price);
      if (price === null || price === 0) {
        toast.error("Ingresá un precio válido.");
        return;
      }

      if (form.currency === "ARS") {
        const fxr = parseNumber(form.fx_rate);
        if (fxr === null || fxr === 0) {
          toast.error("Ingresá un tipo de cambio válido.");
          return;
        }
        priceUsd = price / fxr;
        fxRate = fxr;
      } else {
        priceUsd = price;
      }
    }

    if (asset.requiresTicker && !form.ticker.trim()) {
      toast.error("Ingresá el ticker del activo.");
      return;
    }

    // Validar metadata requerido
    for (const field of asset.metadataFields) {
      if (field.required && !form.metadata[field.key]?.trim()) {
        toast.error(`Falta: ${field.label}`);
        return;
      }
    }

    const fees = parseNumber(form.fees) ?? 0;

    // Para asset types en ARS sin price (raro, pero ej: time_deposit en ARS),
    // también guardamos fx_rate para referencia.
    if (!fxRate && form.fx_rate) {
      fxRate = parseNumber(form.fx_rate);
    }

    try {
      await createTx.mutateAsync({
        asset_type: asset.id,
        ticker: asset.requiresTicker ? form.ticker.trim().toUpperCase() : null,
        tx_type: form.tx_type,
        quantity: qty,
        price_usd: priceUsd,
        fx_rate: fxRate,
        fees_usd: fees,
        broker: form.broker.trim() || null,
        date: form.date,
        note: form.note.trim() || null,
        metadata: form.metadata,
      });
      toast.success("Transacción registrada");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="lg"
            className="h-11 gap-2 rounded-lg border border-white/[0.12] bg-white/[0.06] px-5 text-foreground transition-all hover:bg-white/[0.10]"
          >
            <Plus className="size-4" />
            Nueva operación
          </Button>
        }
      />

      <DialogContent className="max-w-lg overflow-hidden border-white/5 bg-white/[0.03] backdrop-blur-xl p-0 backdrop-blur-xl">
        <AnimatePresence mode="wait">
          {!asset ? (
            <motion.div
              key="select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative flex flex-col gap-5 p-6"
            >
              {/* Background glow */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.1),transparent_60%)]" />

              <div className="relative flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 ring-1 ring-indigo-500/30">
                  <Sparkles className="size-4 text-indigo-300" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <DialogTitle className="text-lg font-semibold tracking-tight">
                    Nueva operación
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    Elegí el tipo de activo para empezar.
                  </p>
                </div>
              </div>

              <div className="relative grid grid-cols-2 gap-2 md:grid-cols-3">
                {ASSETS.map((a, idx) => {
                  const Icon = a.icon;
                  return (
                    <motion.button
                      key={a.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: idx * 0.03 }}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => selectAsset(a)}
                      className={cn(
                        "group relative flex min-h-[110px] flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br p-3 text-left transition-all hover:border-white/10",
                        ASSET_CARD_GRADIENT[a.id],
                      )}
                    >
                      {/* Icon con glow */}
                      <div className="relative">
                        <div
                          className={cn(
                            "absolute inset-0 rounded-xl opacity-60 blur-md",
                            a.bgClass,
                          )}
                        />
                        <div
                          className={cn(
                            "relative flex size-9 items-center justify-center rounded-xl ring-1",
                            a.bgClass,
                            a.textClass,
                            a.borderClass,
                          )}
                        >
                          <Icon className="size-4.5" />
                        </div>
                      </div>
 
                      {/* Label */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[12px] font-bold leading-tight tracking-tight text-foreground">
                          {a.label}
                        </span>
                        <span className="text-[8px] uppercase tracking-widest text-muted-foreground/50">
                          {a.short}
                        </span>
                      </div>

                      {/* Shimmer on hover */}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            form && (
              <TransactionForm
                asset={asset}
                form={form}
                setForm={setForm}
                onBack={back}
                onSubmit={submit}
                isPending={createTx.isPending}
                fxRates={fx}
              />
            )
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

function TransactionForm({
  asset,
  form,
  setForm,
  onBack,
  onSubmit,
  isPending,
  fxRates,
}: {
  asset: AssetConfig;
  form: FormState;
  setForm: (f: FormState) => void;
  onBack: () => void;
  onSubmit: () => void;
  isPending: boolean;
  fxRates?: FxRates;
}) {
  const Icon = asset.icon;
  const canSwitchCurrency = asset.requiresPrice;

  const usdEquivalent = useMemo(() => {
    if (!asset.requiresPrice) return null;
    const p = parseNumber(form.price);
    if (p === null) return null;
    if (form.currency === "USD") return p;
    const fxr = parseNumber(form.fx_rate);
    if (!fxr) return null;
    return p / fxr;
  }, [asset.requiresPrice, form.price, form.currency, form.fx_rate]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm({ ...form, [key]: value });
  }

  function updateMetadata(key: string, value: string) {
    setForm({ ...form, metadata: { ...form.metadata, [key]: value } });
  }

  // Auto-completar ratio de CEDEARs cuando cambia el ticker
  useEffect(() => {
    if (asset.id === "cedear" && form.ticker) {
      const ratio = getCedearRatio(form.ticker);
      if (ratio && form.metadata["ratio"] !== ratio.toString()) {
        setForm({
          ...form,
          metadata: { ...form.metadata, ratio: ratio.toString() },
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.ticker]);

  return (
    <motion.div
      key="form"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      className="flex max-h-[85vh] flex-col"
    >
      {/* Header con glow del asset */}
      <div
        className={cn(
          "relative flex items-center gap-3 overflow-hidden border-b border-white/5 bg-gradient-to-r p-4",
          ASSET_CARD_GRADIENT[asset.id],
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="relative size-9 shrink-0 rounded-full hover:bg-white/10"
        >
          <ArrowLeft className="size-4" />
        </Button>
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
            {asset.label}
          </DialogTitle>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Nueva operación
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto p-5">
        {/* Tipo de operación */}
        {asset.allowedTxTypes.length > 1 && (
          <div className="flex gap-2">
            {asset.allowedTxTypes.map((tx) => {
              const isInflow = tx === "buy" || tx === "deposit";
              const active = form.tx_type === tx;
              return (
                <button
                  key={tx}
                  onClick={() => update("tx_type", tx)}
                  className={cn(
                    "flex-1 rounded-xl border py-2.5 text-sm font-semibold uppercase tracking-wider transition-all",
                    active
                      ? isInflow
                        ? "border-theme-500/40 bg-theme-500/15 text-theme-300 shadow-[0_0_20px_-6px_rgba(16,185,129,0.4)]"
                        : "border-red-500/40 bg-red-500/15 text-red-300 shadow-[0_0_20px_-6px_rgba(239,68,68,0.4)]"
                      : "border-white/5 bg-white/[0.03] backdrop-blur-xl text-muted-foreground hover:border-white/10 hover:bg-white/[0.03] backdrop-blur-xl hover:text-foreground",
                  )}
                >
                  {TX_TYPE_LABELS[tx]}
                </button>
              );
            })}
          </div>
        )}

        {/* Ticker */}
        {asset.requiresTicker && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticker" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Ticker
            </Label>
            <Input
              id="ticker"
              placeholder={asset.id === "crypto" ? "BTC, ETH, SOL..." : "AAPL, GGAL, GD30..."}
              value={form.ticker}
              onChange={(e) => update("ticker", e.target.value.toUpperCase())}
              className="h-11 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl font-mono text-base uppercase backdrop-blur focus-visible:border-white/20"
              autoFocus
            />
          </div>
        )}

        {/* Cantidad */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="quantity" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Cantidad
          </Label>
          <Input
            id="quantity"
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={form.quantity}
            onChange={(e) => update("quantity", e.target.value)}
            className="h-11 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl font-mono text-base tabular-nums backdrop-blur focus-visible:border-white/20"
          />
        </div>

        {/* Precio + currency toggle */}
        {asset.requiresPrice && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="price" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Precio unitario
              </Label>
              {canSwitchCurrency && (
                <div className="flex gap-0.5 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-0.5 text-[10px] font-semibold backdrop-blur">
                  <button
                    onClick={() => update("currency", "USD")}
                    className={cn(
                      "rounded-full px-2.5 py-1 uppercase tracking-widest transition-all",
                      form.currency === "USD"
                        ? "bg-indigo-500/15 border border-indigo-500/30 text-indigo-300"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    USD
                  </button>
                  <button
                    onClick={() => update("currency", "ARS")}
                    className={cn(
                      "rounded-full px-2.5 py-1 uppercase tracking-widest transition-all",
                      form.currency === "ARS"
                        ? "bg-indigo-500/15 border border-indigo-500/30 text-indigo-300"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    ARS
                  </button>
                </div>
              )}
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-mono text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="price"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
                className="h-11 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl pl-8 font-mono text-base tabular-nums backdrop-blur focus-visible:border-white/20"
              />
            </div>
            {form.currency === "ARS" && (
              <div className="flex items-end gap-2 pt-1">
                <div className="flex flex-1 flex-col gap-1">
                  <Label htmlFor="fx" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Tipo de cambio
                  </Label>
                  <Input
                    id="fx"
                    type="text"
                    inputMode="decimal"
                    placeholder="MEP"
                    value={form.fx_rate}
                    onChange={(e) => update("fx_rate", e.target.value)}
                    className="h-10 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl font-mono tabular-nums backdrop-blur focus-visible:border-white/20"
                  />
                </div>
                {fxRates && (
                  (() => {
                    const defaultFx = asset.id === "cedear" ? fxRates.ccl : fxRates.mep;
                    const fxLabel = asset.id === "cedear" ? "CCL" : "MEP";
                    return (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => update("fx_rate", defaultFx.toString())}
                        className="h-10 rounded-xl border-theme-500/30 bg-theme-500/10 text-xs font-semibold text-theme-300 hover:bg-theme-500/20 hover:text-theme-200"
                      >
                        {fxLabel} {Math.round(defaultFx)}
                      </Button>
                    );
                  })()
                )}
              </div>
            )}
            {usdEquivalent !== null && form.currency === "ARS" && (
              <p className="rounded-lg bg-white/5 px-3 py-1.5 font-mono text-xs text-muted-foreground">
                ≈ USD {usdEquivalent.toFixed(4)} por unidad
              </p>
            )}
          </div>
        )}

        {/* Metadata fields dinámicos */}
        {asset.metadataFields.map((field) => (
          <div key={field.key} className="flex flex-col gap-1.5">
            <Label
              htmlFor={field.key}
              className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
            >
              {field.label}
              {field.required && <span className="ml-1 text-rose-400">*</span>}
            </Label>
            {field.type === "select" ? (
              <Select
                value={form.metadata[field.key] ?? ""}
                onValueChange={(val) => updateMetadata(field.key, val as string)}
              >
                <SelectTrigger className="w-full h-11 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl focus:ring-0 focus:ring-offset-0 focus-visible:border-white/20 data-open:bg-white/5">
                  <SelectValue placeholder={field.placeholder ?? "Seleccionar"} />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#0f0f13] backdrop-blur-xl">
                  {field.options?.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="focus:bg-white/10 cursor-pointer">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={field.key}
                type={field.type === "date" ? "date" : "text"}
                inputMode={
                  field.type === "number" || field.type === "percent"
                    ? "decimal"
                    : undefined
                }
                placeholder={field.placeholder}
                value={form.metadata[field.key] ?? ""}
                onChange={(e) => updateMetadata(field.key, e.target.value)}
                className="h-11 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl focus-visible:border-white/20"
              />
            )}
          </div>
        ))}

        {/* Fecha */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Fecha
          </Label>
          <Input
            id="date"
            type="date"
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
            className="h-11 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl focus-visible:border-white/20"
          />
        </div>

        {/* Opcionales: broker, fees, note */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="broker" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Broker
            </Label>
            <Input
              id="broker"
              placeholder="IEB, Balanz..."
              value={form.broker}
              onChange={(e) => update("broker", e.target.value)}
              className="h-11 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl focus-visible:border-white/20"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fees" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Comisión (USD)
            </Label>
            <Input
              id="fees"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={form.fees}
              onChange={(e) => update("fees", e.target.value)}
              className="h-11 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl font-mono tabular-nums backdrop-blur focus-visible:border-white/20"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="note" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Nota
          </Label>
          <Input
            id="note"
            placeholder="Opcional"
            value={form.note}
            onChange={(e) => update("note", e.target.value)}
            maxLength={120}
            className="h-11 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl focus-visible:border-white/20"
          />
        </div>
      </div>

      <div className="flex gap-2 border-t border-white/5 bg-white/[0.03] backdrop-blur-xl p-4 backdrop-blur">
        <Button
          variant="outline"
          onClick={onBack}
          className="h-11 flex-1 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl hover:bg-white/[0.03] backdrop-blur-xl"
        >
          Atrás
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isPending}
          className="h-11 flex-1 rounded-xl border border-white/[0.12] bg-white/[0.06] text-foreground transition-all hover:bg-white/[0.10] disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Guardar operación"}
        </Button>
      </div>
    </motion.div>
  );
}
