"use client";

import { useState } from "react";
import { CreditCard as CreditCardIcon, Plus } from "lucide-react";
import {
  useCreditCards,
  type CreditCard,
} from "@/hooks/use-credit-cards";
import { CardItem } from "./card-item";
import { CardFormDialog } from "./card-form-dialog";

export function CardsList() {
  const cardsQ = useCreditCards();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CreditCard | null>(null);

  const cards = cardsQ.data ?? [];

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">{cards.length}</span>
          <span>{cards.length === 1 ? "tarjeta activa" : "tarjetas activas"}</span>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-theme-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-theme-500/25 transition hover:shadow-theme-500/40"
        >
          <Plus className="size-4 transition-transform group-hover:rotate-90" />
          Nueva tarjeta
        </button>
      </div>

      {cardsQ.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-3xl border border-white/5 bg-card/40"
            />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <EmptyState onCreate={() => setCreateOpen(true)} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              onEdit={() => setEditing(card)}
            />
          ))}
        </div>
      )}

      <CardFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <CardFormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        card={editing}
      />
    </>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl border border-dashed border-white/10 bg-card/30 p-12 text-center">
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]">
        <div className="size-full bg-[radial-gradient(circle_at_50%_50%,white_1px,transparent_1px)] bg-[length:16px_16px]" />
      </div>
      <div className="relative flex size-14 items-center justify-center rounded-2xl bg-theme-500/10 text-theme-300 ring-1 ring-theme-500/20">
        <CreditCardIcon className="size-6" />
      </div>
      <div className="relative flex flex-col gap-1.5">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Todavía no cargaste tarjetas
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Cargá tu primera tarjeta con día de cierre y vencimiento. A partir de
          ahí podés linkear cada gasto al ciclo correcto.
        </p>
      </div>
      <button
        onClick={onCreate}
        className="group relative inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-theme-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-theme-500/25 transition hover:shadow-theme-500/40"
      >
        <Plus className="size-4 transition-transform group-hover:rotate-90" />
        Cargar tarjeta
      </button>
    </div>
  );
}
