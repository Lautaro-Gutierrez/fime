"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  Rocket,
  Shield,
  Gem,
  Landmark,
  TrendingUp,
  Zap,
  Globe,
  Target,
  Coins,
  Lock,
  Home,
  ChevronDown,
  Check,
  Plus,
  Settings,
  Globe2,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

import { cn } from "@/lib/utils";
import { formatUSD } from "@/lib/format";
import type { Portfolio } from "@/hooks/use-portfolios";
import { CreatePortfolioDialog } from "./create-portfolio-dialog";
import { ManagePortfoliosDialog } from "./manage-portfolios-dialog";

export const PORTFOLIO_ICONS = {
  briefcase: Briefcase,
  rocket: Rocket,
  shield: Shield,
  gem: Gem,
  landmark: Landmark,
  trending: TrendingUp,
  zap: Zap,
  globe: Globe,
  target: Target,
  coins: Coins,
  lock: Lock,
  home: Home,
} as const;

export const PORTFOLIO_COLORS: Record<string, string> = {
  indigo: "bg-indigo-500",
  rose: "bg-rose-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  cyan: "bg-cyan-500",
  violet: "bg-violet-500",
  sky: "bg-sky-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  lime: "bg-lime-500",
  teal: "bg-teal-500",
  slate: "bg-slate-500",
};

export const PORTFOLIO_TEXT_COLORS: Record<string, string> = {
  indigo: "text-indigo-400",
  rose: "text-rose-400",
  amber: "text-amber-400",
  emerald: "text-emerald-400",
  cyan: "text-cyan-400",
  violet: "text-violet-400",
  sky: "text-sky-400",
  orange: "text-orange-400",
  pink: "text-pink-400",
  lime: "text-lime-400",
  teal: "text-teal-400",
  slate: "text-slate-400",
};

interface PortfolioSelectorProps {
  portfolios: Portfolio[];
  activeId: string | "ALL";
  currentTotalUsd?: number;
  holdingsCount?: number;
}

export function PortfolioSelector({
  portfolios,
  activeId,
  currentTotalUsd = 0,
  holdingsCount = 0,
}: PortfolioSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showManage, setShowManage] = useState(false);

  const activePortfolio = portfolios.find((p) => p.id === activeId);
  const isAll = activeId === "ALL";

  function handleSelect(id: string) {
    const tab = searchParams.get("tab") || "bitacora";
    router.push(`/inversiones/${id}?tab=${tab}`);
  }

  return (
    <>
      <DropdownMenu.Root open={open} onOpenChange={setOpen}>
        <DropdownMenu.Trigger asChild>
          <button className="group relative flex items-center gap-2 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium backdrop-blur-xl transition-all hover:bg-white/[0.06] hover:border-white/[0.12] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50">
            {isAll ? (
              <div className="flex items-center gap-2">
                <Globe2 className="size-4 text-indigo-400" />
                <span>Todos los Portfolios</span>
              </div>
            ) : activePortfolio ? (
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "size-2.5 rounded-full shadow-[0_0_8px_currentColor]",
                    PORTFOLIO_COLORS[activePortfolio.color] || "bg-indigo-500",
                  )}
                  style={{
                    color: `var(--${activePortfolio.color}-500, currentColor)`,
                  }}
                />
                <span>{activePortfolio.name}</span>
              </div>
            ) : (
              <span>Seleccionar...</span>
            )}
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform duration-200",
                open && "rotate-180",
              )}
            />

            {/* Subtle glow effect */}
            {!isAll && activePortfolio && (
              <div
                className={cn(
                  "absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-10",
                  PORTFOLIO_COLORS[activePortfolio.color] || "bg-indigo-500",
                )}
              />
            )}
          </button>
        </DropdownMenu.Trigger>

        <AnimatePresence>
          {open && (
            <DropdownMenu.Portal forceMount>
              <DropdownMenu.Content
                asChild
                align="start"
                sideOffset={8}
                className="z-50 min-w-[240px] overflow-hidden rounded-xl border border-white/10 bg-zinc-950/90 p-1 shadow-2xl shadow-black/50 backdrop-blur-xl"
              >
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  <div className="flex flex-col">
                    {/* All Portfolios */}
                    <DropdownMenu.Item
                      onSelect={() => handleSelect("ALL")}
                      className="group flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 outline-none transition-colors hover:bg-white/5 focus:bg-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-7 items-center justify-center rounded-md bg-white/5 text-muted-foreground transition-colors group-hover:text-indigo-400">
                          <Globe2 className="size-4" />
                        </div>
                        <span className="text-sm font-medium">Todos los Portfolios</span>
                      </div>
                      {isAll && <Check className="size-4 text-indigo-400" />}
                    </DropdownMenu.Item>

                    <DropdownMenu.Separator className="my-1 h-px bg-white/5" />

                    {/* Individual Portfolios */}
                    <div className="max-h-[280px] overflow-y-auto overflow-x-hidden p-0.5">
                      {portfolios.map((p) => {
                        const Icon = PORTFOLIO_ICONS[p.icon as keyof typeof PORTFOLIO_ICONS] || Briefcase;
                        const isSelected = activeId === p.id;
                        const colorClass = PORTFOLIO_TEXT_COLORS[p.color] || "text-indigo-400";
                        const bgClass = PORTFOLIO_COLORS[p.color] || "bg-indigo-500";

                        return (
                          <DropdownMenu.Item
                            key={p.id}
                            onSelect={() => handleSelect(p.id)}
                            className="group flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 outline-none transition-colors hover:bg-white/5 focus:bg-white/5"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "flex size-7 items-center justify-center rounded-md bg-white/5 transition-colors",
                                  isSelected ? colorClass : "text-muted-foreground group-hover:text-foreground",
                                )}
                              >
                                <Icon className="size-3.5" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{p.name}</span>
                                {isSelected && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {holdingsCount} ops · {formatUSD(currentTotalUsd)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isSelected && (
                                <motion.div
                                  layoutId="active-portfolio-check"
                                  className={colorClass}
                                >
                                  <Check className="size-4" />
                                </motion.div>
                              )}
                              {!isSelected && (
                                <span
                                  className={cn(
                                    "size-1.5 rounded-full opacity-50",
                                    bgClass,
                                  )}
                                />
                              )}
                            </div>
                          </DropdownMenu.Item>
                        );
                      })}
                    </div>

                    <DropdownMenu.Separator className="my-1 h-px bg-white/5" />

                    {/* Actions */}
                    <DropdownMenu.Item
                      onSelect={() => setShowCreate(true)}
                      className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 outline-none transition-colors hover:bg-white/5 focus:bg-white/5"
                    >
                      <Plus className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                      <span className="text-sm text-muted-foreground transition-colors group-hover:text-foreground">
                        Crear Portfolio
                      </span>
                    </DropdownMenu.Item>

                    <DropdownMenu.Item
                      onSelect={() => setShowManage(true)}
                      className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 outline-none transition-colors hover:bg-white/5 focus:bg-white/5"
                    >
                      <Settings className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                      <span className="text-sm text-muted-foreground transition-colors group-hover:text-foreground">
                        Administrar
                      </span>
                    </DropdownMenu.Item>
                  </div>
                </motion.div>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          )}
        </AnimatePresence>
      </DropdownMenu.Root>

      <CreatePortfolioDialog open={showCreate} onOpenChange={setShowCreate} />
      <ManagePortfoliosDialog
        open={showManage}
        onOpenChange={setShowManage}
        portfolios={portfolios}
      />
    </>
  );
}
