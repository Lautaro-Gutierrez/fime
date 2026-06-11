"use client";

import { cn } from "@/lib/utils";
import { MILESTONES } from "@/lib/goals";

type Props = {
  pct: number;            // 0..100
  rawPct: number;         // sin cap (para detectar overshoot/over-cap)
  size?: number;          // px (default 168)
  strokeWidth?: number;   // px (default 12)
  color: string;          // color del trazo del progreso (hex de lib/goals)
  isInverted?: boolean;   // expense_cap: <70% green, 70-90 amber, >90 rose
  label?: React.ReactNode;
  sublabel?: React.ReactNode;
};

export function ProgressRing({
  pct,
  rawPct,
  size = 168,
  strokeWidth = 12,
  color,
  isInverted = false,
  label,
  sublabel,
}: Props) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const safePct = Math.max(0, Math.min(100, pct));
  const dashOffset = c * (1 - safePct / 100);

  const overshoot = rawPct > 100;
  // Color real del trazo. En expense_cap el color cambia con el ritmo.
  let strokeColor = color;
  if (isInverted) {
    if (rawPct >= 100) strokeColor = "#F43F5E";       // rose-500: over the cap
    else if (rawPct >= 90) strokeColor = "#F97316";   // orange-500
    else if (rawPct >= 70) strokeColor = "#F59E0B";   // theme-500
    else strokeColor = "#10B981";                     // theme-500: holgura
  } else if (overshoot) {
    strokeColor = "#10B981"; // overcumplió: verde brillante
  }

  const gradientId = `brandGradient-${size}`;
  const isBrandColor = !isInverted;
  const finalStroke = isBrandColor ? `url(#${gradientId})` : strokeColor;
  const shadowColor = isBrandColor ? "#D0005F" : strokeColor;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D0005F" />
            <stop offset="100%" stopColor="#00CFFF" />
          </linearGradient>
        </defs>
        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/5"
        />
        {/* progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={finalStroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={dashOffset}
          style={{
            transition: "stroke-dashoffset 600ms cubic-bezier(0.16, 1, 0.3, 1), stroke 200ms",
            filter: `drop-shadow(0 0 6px ${shadowColor}80)`,
          }}
        />
        {/* milestones (25/50/75) en el track */}
        {MILESTONES.map((m) => {
          const angle = (m / 100) * 2 * Math.PI;
          const cx = size / 2 + r * Math.cos(angle);
          const cy = size / 2 + r * Math.sin(angle);
          const reached = safePct >= m;
          const dotColor = reached 
            ? (isBrandColor ? "#00CFFF" : strokeColor)
            : "rgba(255,255,255,0.2)";
          return (
            <circle
              key={m}
              cx={cx}
              cy={cy}
              r={3}
              fill={dotColor}
              style={{ transition: "fill 200ms" }}
            />
          );
        })}
      </svg>
      <div
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center text-center",
        )}
      >
        {label}
        {sublabel}
      </div>
    </div>
  );
}
