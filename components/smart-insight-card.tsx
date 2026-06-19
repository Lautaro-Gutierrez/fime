"use client";

import { type InsightCategory, type SmartInsight } from "@/lib/insights/types";
import { cn } from "@/lib/utils";
import {
  Lightbulb,
  Bell,
  Zap,
  AlertTriangle,
  Trophy,
  X,
  PieChart,
  CheckCircle2,
  LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface SmartInsightCardProps {
  insight: SmartInsight;
  onDismiss: (id: string) => void;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Lightbulb,
  Bell,
  Zap,
  AlertTriangle,
  Trophy,
  PieChart,
  CheckCircle2,
};

const CATEGORY_CONFIG: Record<
  InsightCategory,
  {
    icon: LucideIcon;
    bgStyle: string;
    borderStyle: string;
    iconBg: string;
    textClass: string;
  }
> = {
  tip: {
    icon: Lightbulb,
    bgStyle: "linear-gradient(135deg, rgba(245,158,11,0.06), rgba(245,158,11,0.01)), #111218",
    borderStyle: "rgba(245,158,11,0.25)",
    iconBg: "rgba(245,158,11,0.12)",
    textClass: "text-amber-400",
  },
  reminder: {
    icon: Bell,
    bgStyle: "linear-gradient(135deg, rgba(59,130,246,0.06), rgba(59,130,246,0.01)), #111218",
    borderStyle: "rgba(59,130,246,0.25)",
    iconBg: "rgba(59,130,246,0.12)",
    textClass: "text-blue-400",
  },
  opportunity: {
    icon: Zap,
    bgStyle: "linear-gradient(135deg, rgba(16,185,129,0.06), rgba(16,185,129,0.01)), #111218",
    borderStyle: "rgba(16,185,129,0.25)",
    iconBg: "rgba(16,185,129,0.12)",
    textClass: "text-emerald-400",
  },
  warning: {
    icon: AlertTriangle,
    bgStyle: "linear-gradient(135deg, rgba(244,63,94,0.06), rgba(244,63,94,0.01)), #111218",
    borderStyle: "rgba(244,63,94,0.25)",
    iconBg: "rgba(244,63,94,0.12)",
    textClass: "text-rose-400",
  },
  achievement: {
    icon: Trophy,
    bgStyle: "linear-gradient(135deg, rgba(139,92,246,0.06), rgba(139,92,246,0.01)), #111218",
    borderStyle: "rgba(139,92,246,0.25)",
    iconBg: "rgba(139,92,246,0.12)",
    textClass: "text-violet-400",
  },
};

export function SmartInsightCard({ insight, onDismiss }: SmartInsightCardProps) {
  const config = CATEGORY_CONFIG[insight.category];
  
  // Resolve icon dynamically if overwritten, otherwise fall back to category default
  const Icon = insight.icon && ICON_MAP[insight.icon] 
    ? ICON_MAP[insight.icon] 
    : config.icon;

  const content = (
    <div
      className="group relative flex flex-col rounded-2xl border p-4 transition-all hover:scale-[1.01] hover:shadow-md"
      style={{
        background: config.bgStyle,
        borderColor: config.borderStyle,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ background: config.iconBg }}
        >
          <Icon className={cn("w-4 h-4", config.textClass)} />
        </div>
        <span className={cn("text-xs font-bold uppercase tracking-wider", config.textClass)}>
          {insight.title}
        </span>
      </div>
      <p className="text-sm text-slate-300 leading-relaxed pr-6">{insight.message}</p>
      
      {insight.dismissible && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 size-6 rounded-lg text-slate-500 hover:bg-white/10 hover:text-white transition-colors"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDismiss(insight.id);
          }}
        >
          <X className="size-3.5" />
          <span className="sr-only">Descartar</span>
        </Button>
      )}
    </div>
  );

  if (insight.href) {
    return (
      <Link href={insight.href} className="block outline-none rounded-2xl">
        {content}
      </Link>
    );
  }

  return content;
}
