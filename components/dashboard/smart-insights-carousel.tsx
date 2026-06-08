"use client";

import { useSmartInsights } from "@/hooks/use-smart-insights";
import { SmartInsightCard } from "@/components/smart-insight-card";
import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function SmartInsightsCarousel() {
  const { insights, dismiss, isLoading } = useSmartInsights("dashboard");

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-white/60">
          <Sparkles className="size-4" />
          <h3 className="text-sm font-medium uppercase tracking-widest">Smart Insights</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl hidden md:block" />
          <Skeleton className="h-32 rounded-xl hidden lg:block" />
        </div>
      </div>
    );
  }

  if (insights.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-white/60">
        <Sparkles className="size-4" />
        <h3 className="text-sm font-medium uppercase tracking-widest">Smart Insights</h3>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {insights.map((insight) => (
          <SmartInsightCard key={insight.id} insight={insight} onDismiss={dismiss} />
        ))}
      </div>
    </div>
  );
}
