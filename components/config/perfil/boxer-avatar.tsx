"use client";

import { cn } from "@/lib/utils";

type Props = {
  displayName?: string | null;
  size?: number;
  className?: string;
};

/**
 * Avatar fallback: silueta estilo "Boxer" en ámbar.
 * Si hay displayName, muestra las iniciales superpuestas.
 */
export function BoxerAvatar({ displayName, size = 96, className }: Props) {
  const initials = displayName
    ? displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : null;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent ring-1 ring-amber-500/30",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {/* Glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl"
        style={{ boxShadow: "inset 0 0 40px rgba(245, 158, 11, 0.12)" }}
      />

      {/* Boxer silhouette SVG */}
      <svg
        viewBox="0 0 80 80"
        fill="none"
        className="absolute inset-0 size-full opacity-30"
        aria-hidden
      >
        {/* Head */}
        <ellipse cx="40" cy="28" rx="14" ry="16" fill="currentColor" className="text-amber-400" />
        {/* Neck */}
        <rect x="34" y="42" width="12" height="8" rx="4" fill="currentColor" className="text-amber-400" />
        {/* Shoulders */}
        <path
          d="M16 68 C16 52, 28 48, 40 48 C52 48, 64 52, 64 68 L64 80 L16 80 Z"
          fill="currentColor"
          className="text-amber-400"
        />
      </svg>

      {/* Initials overlay */}
      {initials && (
        <span
          className="relative z-10 font-heading font-bold tracking-tight text-amber-300"
          style={{ fontSize: size * 0.3 }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}
