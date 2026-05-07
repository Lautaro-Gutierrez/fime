"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { isFutureMonth, monthLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  month: Date;
  onChange: (next: Date) => void;
};

export function MonthSelector({ month, onChange }: Props) {
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const prev = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const nextDisabled = isFutureMonth(next);

  const label = monthLabel(month);
  const display = label.charAt(0).toUpperCase() + label.slice(1);

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-0.5 backdrop-blur">
      <button
        onClick={() => onChange(prev)}
        aria-label="Mes anterior"
        className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
      </button>
      <motion.span
        key={display}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="min-w-[120px] px-2 text-center text-sm font-semibold tracking-tight tabular-nums"
      >
        {display}
      </motion.span>
      <button
        onClick={() => onChange(next)}
        disabled={nextDisabled}
        aria-label="Mes siguiente"
        className={cn(
          "flex size-8 items-center justify-center rounded-full transition-colors",
          nextDisabled
            ? "text-muted-foreground/30"
            : "text-muted-foreground hover:bg-white/10 hover:text-foreground",
        )}
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
