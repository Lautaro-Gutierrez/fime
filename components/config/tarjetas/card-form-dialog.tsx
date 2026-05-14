"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Archive, CreditCard as CreditCardIcon, Save } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CARD_BRANDS,
  CARD_COLORS,
  type CardBrand,
  type CardColorId,
  colorFromHex,
  nextClosingDate,
  nextDueDate,
} from "@/lib/credit-cards";
import {
  useArchiveCreditCard,
  useCreateCreditCard,
  useUpdateCreditCard,
  type CreditCard,
} from "@/hooks/use-credit-cards";
import { cn } from "@/lib/utils";

type FormState = {
  name: string;
  brand: CardBrand;
  last_four: string;
  closing_day: string;
  due_day: string;
  color: CardColorId;
  currency: "ARS" | "USD";
};

const DEFAULT_FORM: FormState = {
  name: "",
  brand: "visa",
  last_four: "",
  closing_day: "5",
  due_day: "15",
  color: "amber",
  currency: "ARS",
};

function formFromCard(card: CreditCard): FormState {
  return {
    name: card.name,
    brand: (CARD_BRANDS.find((b) => b.id === card.brand)?.id ?? "otros") as CardBrand,
    last_four: card.last_four ?? "",
    closing_day: String(card.closing_day),
    due_day: String(card.due_day),
    color: colorFromHex(card.color).id,
    currency: card.currency,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: CreditCard | null;
};

export function CardFormDialog({ open, onOpenChange, card }: Props) {
  const isEdit = !!card;
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const createCard = useCreateCreditCard();
  const updateCard = useUpdateCreditCard();
  const archiveCard = useArchiveCreditCard();

  useEffect(() => {
    if (open) {
      setForm(card ? formFromCard(card) : DEFAULT_FORM);
    }
  }, [open, card]);

  const closingDayNum = Number(form.closing_day);
  const dueDayNum = Number(form.due_day);
  const previewValid =
    closingDayNum >= 1 &&
    closingDayNum <= 31 &&
    dueDayNum >= 1 &&
    dueDayNum <= 31;
  const colorCfg = CARD_COLORS.find((c) => c.id === form.color) ?? CARD_COLORS[0];

  async function submit() {
    const name = form.name.trim();
    if (!name) {
      toast.error("Ponele un nombre a la tarjeta");
      return;
    }
    if (closingDayNum < 1 || closingDayNum > 31) {
      toast.error("Día de cierre tiene que estar entre 1 y 31");
      return;
    }
    if (dueDayNum < 1 || dueDayNum > 31) {
      toast.error("Día de vencimiento tiene que estar entre 1 y 31");
      return;
    }
    const lastFour = form.last_four.trim();
    if (lastFour && !/^\d{4}$/.test(lastFour)) {
      toast.error("Los últimos 4 dígitos deben ser 4 números");
      return;
    }

    const payload = {
      name,
      brand: form.brand,
      last_four: lastFour || null,
      closing_day: closingDayNum,
      due_day: dueDayNum,
      color: colorCfg.hex,
      currency: form.currency,
    };

    try {
      if (isEdit && card) {
        await updateCard.mutateAsync({ id: card.id, patch: payload });
        toast.success("Tarjeta actualizada");
      } else {
        await createCard.mutateAsync(payload);
        toast.success("Tarjeta creada");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  async function archive() {
    if (!card) return;
    try {
      await archiveCard.mutateAsync(card.id);
      toast.success("Tarjeta archivada");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al archivar");
    }
  }

  const isPending = createCard.isPending || updateCard.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden border-white/5 bg-white/[0.03] backdrop-blur-xl p-0 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative flex max-h-[85vh] flex-col"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.08),transparent_70%)]" />

          {/* Header */}
          <div className="relative flex items-center gap-3 border-b border-white/5 px-6 py-4">
            <div
              className={cn(
                "flex size-9 items-center justify-center rounded-xl ring-1",
                colorCfg.bgClass,
                colorCfg.textClass,
                colorCfg.ringClass,
              )}
            >
              <CreditCardIcon className="size-4" />
            </div>
            <div className="flex flex-col leading-tight">
              <DialogTitle className="text-sm font-semibold tracking-tight">
                {isEdit ? "Editar tarjeta" : "Nueva tarjeta"}
              </DialogTitle>
              <span className="text-[10px] text-muted-foreground">
                Cierres y vencimientos definen el ciclo de pago.
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="relative flex flex-col gap-4 overflow-y-auto px-6 py-5">
            <Field label="Nombre">
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Santander Visa Black"
                className="h-11 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl focus-visible:border-white/20"
              />
            </Field>

            <Field label="Marca">
              <div className="grid grid-cols-4 gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-1 backdrop-blur">
                {CARD_BRANDS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, brand: b.id }))}
                    className={cn(
                      "rounded-lg px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition",
                      form.brand === b.id
                        ? "bg-theme-500/20 text-theme-300"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Últimos 4 (opcional)">
                <Input
                  value={form.last_four}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      last_four: e.target.value.replace(/\D/g, "").slice(0, 4),
                    }))
                  }
                  placeholder="1234"
                  inputMode="numeric"
                  maxLength={4}
                  className="h-11 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl font-mono tabular-nums backdrop-blur focus-visible:border-white/20"
                />
              </Field>

              <Field label="Moneda">
                <div className="flex h-11 gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-1 backdrop-blur">
                  {(["ARS", "USD"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, currency: c }))}
                      className={cn(
                        "flex-1 rounded-lg px-3 text-[11px] font-semibold uppercase tracking-wider transition",
                        form.currency === c
                          ? "bg-theme-500/20 text-theme-300"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Día de cierre">
                <Input
                  value={form.closing_day}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      closing_day: e.target.value.replace(/\D/g, "").slice(0, 2),
                    }))
                  }
                  placeholder="5"
                  inputMode="numeric"
                  className="h-11 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl font-mono tabular-nums backdrop-blur focus-visible:border-white/20"
                />
              </Field>
              <Field label="Día de vencimiento">
                <Input
                  value={form.due_day}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      due_day: e.target.value.replace(/\D/g, "").slice(0, 2),
                    }))
                  }
                  placeholder="15"
                  inputMode="numeric"
                  className="h-11 rounded-xl border-white/5 bg-white/[0.03] backdrop-blur-xl font-mono tabular-nums backdrop-blur focus-visible:border-white/20"
                />
              </Field>
            </div>

            {/* Preview de próximo ciclo */}
            {previewValid && (
              <CyclePreview closingDay={closingDayNum} dueDay={dueDayNum} />
            )}

            <Field label="Color">
              <div className="grid grid-cols-8 gap-1.5">
                {CARD_COLORS.map((c) => {
                  const active = form.color === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-label={c.label}
                      onClick={() => setForm((f) => ({ ...f, color: c.id }))}
                      className={cn(
                        "relative aspect-square rounded-lg ring-1 transition",
                        c.bgClass,
                        active
                          ? "ring-2 ring-offset-2 ring-offset-card " + c.ringClass
                          : "ring-white/10 hover:ring-white/30",
                      )}
                      style={{
                        background: `linear-gradient(135deg, ${c.hex}40, ${c.hex}10)`,
                      }}
                    >
                      <span
                        className="absolute inset-1 rounded-md"
                        style={{ backgroundColor: c.hex, opacity: 0.7 }}
                      />
                    </button>
                  );
                })}
              </div>
            </Field>

          </div>

          {/* Footer */}
          <div className="relative flex items-center justify-between gap-2 border-t border-white/5 bg-white/[0.03] backdrop-blur-xl px-6 py-3">
            {isEdit ? (
              <Button
                variant="ghost"
                onClick={archive}
                disabled={archiveCard.isPending || isPending}
                className="text-muted-foreground hover:text-rose-300"
              >
                <Archive className="size-4" />
                Archivar
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={submit}
                disabled={isPending}
                className="bg-gradient-to-br from-theme-500 to-orange-600 text-white shadow-lg shadow-theme-500/25 hover:from-theme-400 hover:to-orange-500"
              >
                <Save className="size-4" />
                {isEdit ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function CyclePreview({
  closingDay,
  dueDay,
}: {
  closingDay: number;
  dueDay: number;
}) {
  const close = nextClosingDate(closingDay);
  const due = nextDueDate(closingDay, dueDay);
  const fmt = (d: Date) =>
    d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
  return (
    <div className="rounded-xl border border-theme-500/15 bg-theme-500/5 px-3 py-2.5">
      <div className="text-[9px] font-semibold uppercase tracking-widest text-theme-300/70">
        Próximo ciclo
      </div>
      <div className="mt-1 grid grid-cols-2 gap-3 text-xs">
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground">Cierre</span>
          <span className="font-mono font-semibold tabular-nums text-foreground">
            {fmt(close)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground">Vencimiento</span>
          <span className="font-mono font-semibold tabular-nums text-theme-200">
            {fmt(due)}
          </span>
        </div>
      </div>
    </div>
  );
}
