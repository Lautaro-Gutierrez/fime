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
    bgClass: string;
    textClass: string;
  }
> = {
  tip: {
    icon: Lightbulb,
    bgClass: "bg-amber-500/10",
    textClass: "text-amber-400",
  },
  reminder: {
    icon: Bell,
    bgClass: "bg-blue-500/10",
    textClass: "text-blue-400",
  },
  opportunity: {
    icon: Zap,
    bgClass: "bg-emerald-500/10",
    textClass: "text-emerald-400",
  },
  warning: {
    icon: AlertTriangle,
    bgClass: "bg-rose-500/10",
    textClass: "text-rose-400",
  },
  achievement: {
    icon: Trophy,
    bgClass: "bg-violet-500/10",
    textClass: "text-violet-400",
  },
};

export function SmartInsightCard({ insight, onDismiss }: SmartInsightCardProps) {
  const config = CATEGORY_CONFIG[insight.category];
  const Icon = config.icon;

  const content = (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-[#1A1D24] p-4 transition-all hover:border-white/[0.1]"
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", config.bgClass)}>
            <Icon className={cn("size-5", config.textClass)} />
          </div>
          <h4 className="text-slate-200 font-semibold text-base">{insight.title}</h4>
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
            <X className="size-3.5" />
            <span className="sr-only">Descartar</span>
          </Button>
        )}
      </div>
      <p className="text-slate-400 text-sm leading-relaxed">{insight.message}</p>
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
