"use client";

import { usePrefsContext } from "@/components/providers/preferences-provider";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Wrapper that blurs monetary amounts when stealth mode is active.
 * Usage: <PrivateAmount>{formatARS(1234)}</PrivateAmount>
 */
export function PrivateAmount({ children, className }: Props) {
  const { stealthMode } = usePrefsContext();

  return (
    <span
      data-private
      className={cn(
        "transition-[filter] duration-200",
        stealthMode && "select-none blur-[6px] hover:blur-none",
        className,
      )}
    >
      {children}
    </span>
  );
}
