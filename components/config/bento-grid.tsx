"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  CreditCard,
  Eye,
  Palette,
  UserCircle2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type LinkTile = {
  kind: "link";
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  meta?: string;
  span?: "sm" | "md" | "lg";
};

type ToggleTile = {
  kind: "toggle";
  title: string;
  description: string;
  icon: LucideIcon;
  meta?: string;
  span?: "sm" | "md" | "lg";
  // Placeholder visual hasta que se implemente el hook de stealth_mode (paso 8).
  comingSoon?: boolean;
};

type Tile = LinkTile | ToggleTile;

const TILES: Tile[] = [
  {
    kind: "link",
    href: "/config/perfil",
    title: "Perfil y Acceso",
    description: "Identidad, avatar, email y seguridad de tu cuenta.",
    icon: UserCircle2,
    meta: "Identity",
    span: "lg",
  },
  {
    kind: "link",
    href: "/config/tarjetas",
    title: "Ciclos de Facturación",
    description: "Cierres y vencimientos. Linkea cada gasto al mes correcto.",
    icon: CreditCard,
    meta: "Credit Cards",
    span: "md",
  },
  {
    kind: "link",
    href: "/config/personalizacion",
    title: "Personalización",
    description: "Tema OLED o Deep Gray, densidad compacta o relajada.",
    icon: Palette,
    meta: "Theming",
    span: "md",
  },
  {
    kind: "toggle",
    title: "Modo Privacidad",
    description:
      "Aplica desenfoque a montos, saldos y porcentajes en toda la app.",
    icon: Eye,
    meta: "Stealth Mode",
    span: "sm",
    comingSoon: true,
  },
];

export function BentoGrid() {
  return (
    <div className="grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {TILES.map((tile, idx) => (
        <Tile key={tile.title} tile={tile} index={idx} />
      ))}
    </div>
  );
}

function Tile({ tile, index }: { tile: Tile; index: number }) {
  const spanCls =
    tile.span === "lg"
      ? "sm:col-span-2 lg:col-span-2 lg:row-span-2"
      : tile.span === "md"
        ? "lg:col-span-1 lg:row-span-1"
        : "sm:col-span-2 lg:col-span-1";

  const inner =
    tile.kind === "link" ? <LinkContent tile={tile} /> : <ToggleContent tile={tile} />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn("relative", spanCls)}
    >
      {tile.kind === "link" ? (
        <Link
          href={tile.href}
          className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/5 bg-card/60 p-5 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-amber-500/30 hover:bg-card/70"
        >
          {inner}
        </Link>
      ) : (
        <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/5 bg-card/60 p-5 backdrop-blur">
          {inner}
        </div>
      )}
    </motion.div>
  );
}

function LinkContent({ tile }: { tile: LinkTile }) {
  const Icon = tile.icon;
  return (
    <>
      <div className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-amber-500/5 blur-3xl transition-opacity group-hover:bg-amber-500/15" />

      <div className="relative flex items-start justify-between">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20 transition-all group-hover:bg-amber-500/15 group-hover:ring-amber-500/40">
          <Icon className="size-5" />
        </div>
        <ArrowUpRight className="size-4 text-muted-foreground/50 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-amber-300" />
      </div>

      <div className="relative mt-auto flex flex-col gap-1.5 pt-6">
        {tile.meta && (
          <span className="text-[9px] font-semibold uppercase tracking-widest text-amber-300/70">
            {tile.meta}
          </span>
        )}
        <h3 className="font-heading text-lg font-semibold text-foreground">
          {tile.title}
        </h3>
        <p className="text-sm text-muted-foreground">{tile.description}</p>
      </div>
    </>
  );
}

function ToggleContent({ tile }: { tile: ToggleTile }) {
  const Icon = tile.icon;
  return (
    <>
      <div className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-amber-500/5 blur-3xl" />

      <div className="relative flex items-start justify-between">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20">
          <Icon className="size-5" />
        </div>
        {tile.comingSoon ? (
          <span className="rounded-full border border-white/10 bg-card/40 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            pronto
          </span>
        ) : null}
      </div>

      <div className="relative mt-auto flex flex-col gap-1.5 pt-6">
        {tile.meta && (
          <span className="text-[9px] font-semibold uppercase tracking-widest text-amber-300/70">
            {tile.meta}
          </span>
        )}
        <h3 className="font-heading text-lg font-semibold text-foreground">
          {tile.title}
        </h3>
        <p className="text-sm text-muted-foreground">{tile.description}</p>

        {/* Switch placeholder — el hook real llega en paso 8. */}
        <div className="mt-3 inline-flex items-center gap-2">
          <div
            aria-hidden
            className="relative h-5 w-9 rounded-full border border-white/10 bg-card/40"
          >
            <div className="absolute left-0.5 top-0.5 size-4 rounded-full bg-muted-foreground/30" />
          </div>
          <span className="text-xs text-muted-foreground/60">desactivado</span>
        </div>
      </div>
    </>
  );
}
