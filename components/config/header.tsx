"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type Props = {
  title: string;
  eyebrow?: string;
  description?: string;
  backHref?: string;
};

export function ConfigHeader({
  title,
  eyebrow = "Command Center",
  description,
  backHref,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-6 backdrop-blur sm:p-7"
    >
      {/* Ambient glow ámbar (identidad del módulo) */}
      <div className="pointer-events-none absolute -right-24 -top-24 size-56 rounded-full bg-theme-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 size-56 rounded-full bg-orange-500/10 blur-3xl" />

      {/* Grid pattern sutil al estilo terminal */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative flex flex-col gap-4">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex w-fit items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl px-3 py-1 text-[11px] text-muted-foreground transition hover:border-theme-500/30 hover:text-theme-300"
          >
            <ChevronLeft className="size-3.5" />
            volver
          </Link>
        )}

        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-theme-300/80">
            <span className="size-1.5 rounded-full bg-theme-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            {eyebrow}
          </span>
          <h1 className="bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
            {title.toUpperCase()}
          </h1>
          {description && (
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
