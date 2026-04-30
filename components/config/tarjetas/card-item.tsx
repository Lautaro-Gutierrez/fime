"use client";

import { motion } from "framer-motion";
import { CreditCard as CreditCardIcon, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  brandLabel,
  colorFromHex,
  nextClosingDate,
  nextDueDate,
} from "@/lib/credit-cards";
import type { CreditCard } from "@/hooks/use-credit-cards";

type Props = {
  card: CreditCard;
  onEdit: () => void;
};

export function CardItem({ card, onEdit }: Props) {
  const color = colorFromHex(card.color);
  const close = nextClosingDate(card.closing_day);
  const due = nextDueDate(card.closing_day, card.due_day);
  const fmt = (d: Date) =>
    d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
  const lastFour = card.last_four ? `•••• ${card.last_four}` : null;
  const brand = brandLabel(card.brand);

  return (
    <motion.button
      type="button"
      onClick={onEdit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25 }}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/5 bg-card/60 text-left backdrop-blur transition hover:border-white/15"
    >
      {/* Visual: la "tarjeta" propia con gradient del color elegido */}
      <div
        className={cn(
          "relative flex aspect-[16/9] flex-col justify-between overflow-hidden p-5",
          "bg-gradient-to-br",
          color.gradientClass,
        )}
      >
        {/* Background dots */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(white 1px, transparent 1px)",
            backgroundSize: "10px 10px",
          }}
        />
        {/* Glow */}
        <div
          className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full blur-3xl"
          style={{ backgroundColor: color.hex, opacity: 0.25 }}
        />

        <div className="relative flex items-start justify-between">
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-xl ring-1",
              color.bgClass,
              color.textClass,
              color.ringClass,
            )}
          >
            <CreditCardIcon className="size-4" />
          </div>
          <Wifi className="size-4 -rotate-90 text-white/40" />
        </div>

        <div className="relative flex flex-col gap-1">
          {lastFour && (
            <span className="font-mono text-base font-semibold tabular-nums tracking-widest text-white/90">
              {lastFour}
            </span>
          )}
          <div className="flex items-end justify-between">
            <span className="text-base font-semibold leading-tight text-white">
              {card.name}
            </span>
            {brand && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                {brand}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer: ciclo */}
      <div className="grid grid-cols-3 gap-3 px-4 py-3 text-xs">
        <Stat label="Cierre" value={`día ${card.closing_day}`} />
        <Stat label="Vence" value={`día ${card.due_day}`} />
        <Stat
          label="Moneda"
          value={card.currency}
          mono
        />
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-white/5 bg-card/40 px-4 py-2.5 text-[11px]">
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
            Próximo cierre
          </span>
          <span className="font-mono font-semibold tabular-nums text-foreground">
            {fmt(close)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
            Próximo vencimiento
          </span>
          <span className="font-mono font-semibold tabular-nums text-theme-200">
            {fmt(due)}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

function Stat({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-foreground",
          mono ? "font-mono font-semibold tabular-nums" : "font-medium",
        )}
      >
        {value}
      </span>
    </div>
  );
}
