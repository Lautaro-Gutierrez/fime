"use client";

import { getAvatarByKey } from "@/lib/avatars";
import { cn } from "@/lib/utils";

type Props = {
  avatarKey?: string | null;
  displayName?: string | null;
  size?: number;
  className?: string;
  /** Show initials overlay when true (default: true) */
  showInitials?: boolean;
};

/**
 * Renders any avatar from the catalogue by key.
 * Falls back to "boxer" if key is null/undefined.
 * Optionally overlays user initials.
 */
export function AvatarDisplay({
  avatarKey,
  displayName,
  size = 96,
  className,
  showInitials = true,
}: Props) {
  const avatar = getAvatarByKey(avatarKey);

  const initials =
    showInitials && displayName
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
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-theme-500/15 via-orange-500/10 to-transparent ring-1 ring-theme-500/30",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {/* Glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-xl"
        style={{ boxShadow: "inset 0 0 40px rgba(245, 158, 11, 0.12)" }}
      />

      {/* Avatar Image */}
      <img
        src={avatar.imageUrl}
        alt={avatar.label}
        className="absolute inset-0 size-full object-cover"
        draggable={false}
      />

      {/* Initials overlay */}
      {initials && (
        <span
          className="relative z-10 font-heading font-bold tracking-tight text-theme-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
          style={{ fontSize: size * 0.3 }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}

// Re-export for backward compat — old components imported BoxerAvatar
export { AvatarDisplay as BoxerAvatar };
