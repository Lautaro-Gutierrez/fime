"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Sparkles, Briefcase, AlertCircle } from "lucide-react";
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
import { usePortfolios, type Portfolio } from "@/hooks/use-portfolios";
import { PORTFOLIO_COLORS, PORTFOLIO_ICONS, PORTFOLIO_TEXT_COLORS } from "./portfolio-selector";
import { usePrefsContext } from "@/components/providers/preferences-provider";

// ARS-denominated asset types (need fx_rate conversion to USD).
const ARS_DENOMINATED: AssetType[] = ["cedear", "stock_ar", "bond_ar", "on"];

// Matte style configuration for each asset card in the grid selector
const ASSET_CARD_STYLES: Record<
  AssetType,
  { bg: string; text: string; hoverBg: string; border: string }
> = {
  crypto: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    hoverBg: "hover:bg-amber-500/20",
    border: "border-white/[0.06] hover:border-amber-500/30",
  },
  stock_us: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    hoverBg: "hover:bg-indigo-500/20",
    border: "border-white/[0.06] hover:border-indigo-500/30",
  },
  cedear: {
    bg: "bg-teal-500/10",
    text: "text-teal-400",
    hoverBg: "hover:bg-teal-500/20",
    border: "border-white/[0.06] hover:border-teal-500/30",
  },
  stock_ar: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    hoverBg: "hover:bg-emerald-500/20",
    border: "border-white/[0.06] hover:border-emerald-500/30",
  },
  bond_ar: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    hoverBg: "hover:bg-blue-500/20",
    border: "border-white/[0.06] hover:border-blue-500/30",
  },
  on: {
    bg: "bg-sky-500/10",
    text: "text-sky-400",
    hoverBg: "hover:bg-sky-500/20",
    border: "border-white/[0.06] hover:border-sky-500/30",
  },
  time_deposit: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    hoverBg: "hover:bg-purple-500/20",
    border: "border-white/[0.06] hover:border-purple-500/30",
  },
  usd_cash: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    hoverBg: "hover:bg-green-500/20",
    border: "border-white/[0.06] hover:border-green-500/30",
  },
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
  portfolio_id: string;
  metadata: Record<string, string>;
};

function defaultForm(asset: AssetConfig, fxRates?: FxRates, defaultPortfolioId?: string): FormState {
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
    portfolio_id: defaultPortfolioId ?? "",
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

export function NewTransactionDialog({ defaultPortfolioId, customTrigger }: { defaultPortfolioId?: string; customTrigger?: React.ReactNode }) {
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
    setForm(defaultForm(a, fx, defaultPortfolioId));
  }

  function back() {
    setAsset(null);
    setForm(null);
  }

  async function submit() {
    if (!asset || !form) return;
    
    if (!form.portfolio_id) {
      toast.error("Seleccioná un portfolio.");
      return;
    }

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

      if (asset.id === "on") {
        priceUsd = priceUsd * 100;
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
        portfolio_id: form.portfolio_id,
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
      {customTrigger ? (
        <DialogTrigger render={customTrigger as React.ReactElement} />
      ) : (
        <DialogTrigger
          render={
            <Button
              size="lg"
              className="h-11 gap-2 rounded-xl bg-theme-600 px-6 font-semibold text-white transition-all hover:bg-theme-500 hover:shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)]"
            >
              <Plus className="size-4" />
              Nueva Operación
            </Button>
          }
        />
      )}

      <DialogContent className="max-w-lg overflow-hidden border border-white/[0.06] bg-[#1F2229] p-0 rounded-[24px] shadow-2xl">
        <AnimatePresence mode="wait">
          {!asset ? (
            <motion.div
              key="select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative flex flex-col gap-5 p-6"
            >
              <div className="relative flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Briefcase className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <DialogTitle className="text-lg font-semibold tracking-tight text-white">
                    Nueva operación
                  </DialogTitle>
                  <p className="text-xs text-slate-500">
                    Elegí el tipo de activo para empezar.
                  </p>
                </div>
              </div>

              <div className="relative grid grid-cols-2 gap-2.5 md:grid-cols-3">
                {ASSETS.map((a, idx) => {
                  const Icon = a.icon;
                  const style = ASSET_CARD_STYLES[a.id];
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
                        "group relative flex min-h-[110px] flex-col justify-between rounded-2xl border p-3.5 text-left transition-all",
                        style.bg,
                        style.text,
                        style.hoverBg,
                        style.border
                      )}
                    >
                      {/* Icon */}
                      <div className="relative">
                        <div
                          className={cn(
                            "relative flex size-9 items-center justify-center rounded-xl",
                            style.bg,
                            style.text
                          )}
                        >
                          <Icon className="size-4.5" />
                        </div>
                      </div>
 
                      {/* Label */}
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-slate-200 text-sm leading-tight tracking-tight">
                          {a.label}
                        </span>
                        <span className="text-xs text-slate-500">
                          {a.short}
                        </span>
                      </div>
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
  const { data: portfolios = [] } = usePortfolios();
  const { investorProfile } = usePrefsContext();

  const isVolatileAsset = ["crypto", "stock_us", "cedear", "stock_ar"].includes(asset.id);
  const showWarning = investorProfile === "conservador" && isVolatileAsset;

  // If there's no portfolio_id set, default to the first one available, preferably the default one
  useEffect(() => {
    if (!form.portfolio_id && portfolios.length > 0) {
      const defaultP = portfolios.find(p => p.is_default) || portfolios[0];
      setForm({ ...form, portfolio_id: defaultP.id });
    }
  }, [form.portfolio_id, portfolios, form, setForm]);

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
      className="flex max-h-[85vh] flex-col bg-[#1F2229]"
    >
      {/* Header */}
      <div className="relative flex items-center gap-3 overflow-hidden border-b border-white/[0.06] bg-[#1F2229] p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="relative size-9 shrink-0 rounded-full hover:bg-white/[0.04] text-slate-400 hover:text-white"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="relative shrink-0">
          <div
            className={cn(
              "relative flex size-10 items-center justify-center rounded-xl",
              ASSET_CARD_STYLES[asset.id].bg,
              ASSET_CARD_STYLES[asset.id].text
            )}
          >
            <Icon className="size-5" />
          </div>
        </div>
        <div className="relative flex min-w-0 flex-col">
          <DialogTitle className="text-base font-semibold tracking-tight text-white">
            {asset.label}
          </DialogTitle>
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">
            Nueva operación
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto p-5">
        {/* Portfolio selector */}
        {portfolios.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Portfolio
            </Label>
            <Select
              value={form.portfolio_id}
              onValueChange={(val) => update("portfolio_id", val as string)}
            >
              <SelectTrigger className="w-full h-11 rounded-xl border border-white/[0.06] bg-[#1A1D24] text-white focus:ring-0 focus:ring-offset-0 focus-visible:border-white/20 data-open:bg-white/5">
                <SelectValue placeholder="Seleccionar portfolio" />
              </SelectTrigger>
              <SelectContent className="border border-white/[0.06] bg-[#1F2229] text-white">
                {portfolios.map((p) => {
                  const PIcon = PORTFOLIO_ICONS[p.icon as keyof typeof PORTFOLIO_ICONS] || Briefcase;
                  const colorClass = PORTFOLIO_TEXT_COLORS[p.color] || "text-indigo-400";
                  return (
                    <SelectItem key={p.id} value={p.id} className="cursor-pointer focus:bg-white/[0.04] focus:text-white">
                      <div className="flex items-center gap-2">
                        <div className={cn("flex size-5 items-center justify-center rounded-md bg-white/5", colorClass)}>
                          <PIcon className="size-3" />
                        </div>
                        <span className="font-medium">{p.name}</span>
                        {p.is_default && <span className="text-[10px] uppercase text-indigo-400/80 font-bold ml-1">(Default)</span>}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}

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
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                        : "border-red-500/20 bg-red-500/10 text-red-400"
                      : "border-white/[0.06] bg-[#1A1D24] text-slate-400 hover:text-white hover:bg-[#232731]"
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
            <Label htmlFor="ticker" className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Ticker
            </Label>
            <Input
              id="ticker"
              placeholder={asset.id === "crypto" ? "BTC, ETH, SOL..." : "AAPL, GGAL, GD30..."}
              value={form.ticker}
              onChange={(e) => update("ticker", e.target.value.toUpperCase())}
              className="h-11 rounded-xl border border-white/[0.06] bg-[#1A1D24] font-mono text-base uppercase text-white focus-visible:ring-1 focus-visible:ring-white/10 focus-visible:border-white/20"
              autoFocus
            />
          </div>
        )}

        {/* Cantidad */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="quantity" className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Cantidad
          </Label>
          <Input
            id="quantity"
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={form.quantity}
            onChange={(e) => update("quantity", e.target.value)}
            className="h-11 rounded-xl border border-white/[0.06] bg-[#1A1D24] font-mono text-base tabular-nums text-white focus-visible:ring-1 focus-visible:ring-white/10 focus-visible:border-white/20"
          />
        </div>

        {/* Precio + currency toggle */}
        {asset.requiresPrice && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="price" className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Precio unitario
              </Label>
              {canSwitchCurrency && (
                <div className="flex gap-0.5 rounded-full border border-white/[0.06] bg-[#1A1D24] p-0.5 text-[10px] font-semibold">
                  <button
                    onClick={() => update("currency", "USD")}
                    className={cn(
                      "rounded-full px-2.5 py-1 uppercase tracking-widest transition-all",
                      form.currency === "USD"
                        ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
                        : "text-slate-500 hover:text-white"
                    )}
                  >
                    USD
                  </button>
                  <button
                    onClick={() => update("currency", "ARS")}
                    className={cn(
                      "rounded-full px-2.5 py-1 uppercase tracking-widest transition-all",
                      form.currency === "ARS"
                        ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
                        : "text-slate-500 hover:text-white"
                    )}
                  >
                    ARS
                  </button>
                </div>
              )}
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-mono text-sm text-slate-500">
                $
              </span>
              <Input
                id="price"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
                className="h-11 rounded-xl border border-white/[0.06] bg-[#1A1D24] pl-8 font-mono text-base tabular-nums text-white focus-visible:ring-1 focus-visible:ring-white/10 focus-visible:border-white/20"
              />
            </div>
            {form.currency === "ARS" && (
              <div className="flex items-end gap-2 pt-1">
                <div className="flex flex-1 flex-col gap-1">
                  <Label htmlFor="fx" className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                    Tipo de cambio
                  </Label>
                  <Input
                    id="fx"
                    type="text"
                    inputMode="decimal"
                    placeholder="MEP"
                    value={form.fx_rate}
                    onChange={(e) => update("fx_rate", e.target.value)}
                    className="h-10 rounded-xl border border-white/[0.06] bg-[#1A1D24] font-mono tabular-nums text-white focus-visible:ring-1 focus-visible:ring-white/10 focus-visible:border-white/20"
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
                        className="h-10 rounded-xl border border-white/[0.06] bg-indigo-500/10 text-xs font-semibold text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300"
                      >
                        {fxLabel} {Math.round(defaultFx)}
                      </Button>
                    );
                  })()
                )}
              </div>
            )}
            {usdEquivalent !== null && form.currency === "ARS" && (
              <p className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-1.5 font-mono text-xs text-slate-400">
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
              className="text-[10px] font-semibold uppercase tracking-widest text-slate-500"
            >
              {field.label}
              {field.required && <span className="ml-1 text-rose-400">*</span>}
            </Label>
            {field.type === "select" ? (
              <Select
                value={form.metadata[field.key] ?? ""}
                onValueChange={(val) => updateMetadata(field.key, val as string)}
              >
                <SelectTrigger className="w-full h-11 rounded-xl border border-white/[0.06] bg-[#1A1D24] text-white focus:ring-0 focus:ring-offset-0 focus-visible:border-white/20 data-open:bg-white/5">
                  <SelectValue placeholder={field.placeholder ?? "Seleccionar"} />
                </SelectTrigger>
                <SelectContent className="border border-white/[0.06] bg-[#1F2229] text-white">
                  {field.options?.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="focus:bg-white/[0.04] cursor-pointer">
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
                className="h-11 rounded-xl border border-white/[0.06] bg-[#1A1D24] text-white focus-visible:ring-1 focus-visible:ring-white/10 focus-visible:border-white/20"
              />
            )}
          </div>
        ))}

        {/* Fecha */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date" className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Fecha
          </Label>
          <Input
            id="date"
            type="date"
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
            className="h-11 rounded-xl border border-white/[0.06] bg-[#1A1D24] text-white focus-visible:ring-1 focus-visible:ring-white/10 focus-visible:border-white/20"
          />
        </div>

        {/* Opcionales: broker, fees, note */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="broker" className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Broker
            </Label>
            <Input
              id="broker"
              placeholder="IEB, Balanz..."
              value={form.broker}
              onChange={(e) => update("broker", e.target.value)}
              className="h-11 rounded-xl border border-white/[0.06] bg-[#1A1D24] text-white focus-visible:ring-1 focus-visible:ring-white/10 focus-visible:border-white/20"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fees" className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Comisión (USD)
            </Label>
            <Input
              id="fees"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={form.fees}
              onChange={(e) => update("fees", e.target.value)}
              className="h-11 rounded-xl border border-white/[0.06] bg-[#1A1D24] font-mono tabular-nums text-white focus-visible:ring-1 focus-visible:ring-white/10 focus-visible:border-white/20"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="note" className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Nota
          </Label>
          <Input
            id="note"
            placeholder="Opcional"
            value={form.note}
            onChange={(e) => update("note", e.target.value)}
            maxLength={120}
            className="h-11 rounded-xl border border-white/[0.06] bg-[#1A1D24] text-white focus-visible:ring-1 focus-visible:ring-white/10 focus-visible:border-white/20"
          />
        </div>

        {showWarning && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-2.5 mt-2 animate-fadeIn">
            <AlertCircle className="size-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-bold text-amber-300">Riesgo superior a tu perfil</span>
              <span className="text-[10px] text-amber-400/80 leading-relaxed">
                Este instrumento tiene una volatilidad superior a tu perfil de riesgo actual (Conservador).
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-2 border-t border-white/[0.06] bg-[#1F2229] p-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="h-11 flex-1 rounded-xl border border-white/[0.06] bg-transparent text-slate-300 hover:bg-white/[0.04] hover:text-white"
        >
          Atrás
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isPending}
          className="h-11 flex-1 rounded-xl border-0 bg-gradient-to-r from-[#d946ef] to-[#06b6d4] text-white font-semibold transition-all hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Guardar operación"}
        </Button>
      </div>
    </motion.div>
  );
}
