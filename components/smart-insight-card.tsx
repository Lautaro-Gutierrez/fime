import { type InsightCategory, type SmartInsight } from "@/lib/insights/types";
import { cn } from "@/lib/utils";
import { Lightbulb, Bell, Zap, AlertTriangle, Trophy, X, LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface SmartInsightCardProps {
  insight: SmartInsight;
  onDismiss: (id: string) => void;
}

const CATEGORY_CONFIG: Record<
  InsightCategory,
  {
    icon: LucideIcon;
    borderClass: string;
    bgClass: string;
    textClass: string;
  }
> = {
  tip: {
    icon: Lightbulb,
    borderClass: "border-l-amber-500",
    bgClass: "bg-amber-500/10",
    textClass: "text-amber-500",
  },
  reminder: {
    icon: Bell,
    borderClass: "border-l-blue-500",
    bgClass: "bg-blue-500/10",
    textClass: "text-blue-500",
  },
  opportunity: {
    icon: Zap,
    borderClass: "border-l-emerald-500",
    bgClass: "bg-emerald-500/10",
    textClass: "text-emerald-500",
  },
  warning: {
    icon: AlertTriangle,
    borderClass: "border-l-rose-500",
    bgClass: "bg-rose-500/10",
    textClass: "text-rose-500",
  },
  achievement: {
    icon: Trophy,
    borderClass: "border-l-violet-500",
    bgClass: "bg-violet-500/10",
    textClass: "text-violet-500",
  },
};

export function SmartInsightCard({ insight, onDismiss }: SmartInsightCardProps) {
  const config = CATEGORY_CONFIG[insight.category];
  const Icon = config.icon; // Could map insight.icon string if needed

  const content = (
    <div
      className={cn(
        "group relative flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-xl transition-all hover:bg-white/[0.05]",
        "border-l-4",
        config.borderClass
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className={cn("flex size-8 items-center justify-center rounded-lg", config.bgClass)}>
            <Icon className={cn("size-4", config.textClass)} />
          </div>
          <h4 className="font-semibold tracking-tight text-white/90">{insight.title}</h4>
        </div>
        {insight.dismissible && (
          <Button
            variant="ghost"
            size="icon"
            className="size-6 shrink-0 rounded-full text-white/40 hover:bg-white/10 hover:text-white"
            onClick={(e) => {
              e.preventDefault();
              onDismiss(insight.id);
            }}
          >
            <X className="size-3" />
            <span className="sr-only">Descartar</span>
          </Button>
        )}
      </div>
      <p className="text-sm text-white/60 leading-relaxed">{insight.message}</p>
    </div>
  );

  if (insight.href) {
    return (
      <Link href={insight.href} className="block outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-theme-400 focus-visible:ring-offset-2 rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
}
