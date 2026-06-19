"use client";

import { useSmartInsights } from "@/hooks/use-smart-insights";
import { SmartInsightCard } from "./smart-insight-card";
import { Sparkles } from "lucide-react";
import type { InsightModule } from "@/lib/insights/types";

interface ModuleInsightsPanelProps {
  module: InsightModule;
  className?: string;
}

export function ModuleInsightsPanel({ module, className }: ModuleInsightsPanelProps) {
  const { insights, dismiss, isLoading } = useSmartInsights(module);

  if (isLoading || insights.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3 text-white/60">
        <Sparkles className="size-4 text-violet-400" />
        <h3 className="text-xs font-semibold uppercase tracking-wider">Sugerencias y Alertas</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {insights.map((insight) => (
          <SmartInsightCard
            key={insight.id}
            insight={insight}
            onDismiss={dismiss}
          />
        ))}
      </div>
    </div>
  );
}
