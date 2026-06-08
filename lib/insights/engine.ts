import type { InsightContext, InsightRule, InsightModule, SmartInsight } from "./types";

const PRIORITY_WEIGHTS = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function evaluateInsights(
  ctx: InsightContext,
  rules: InsightRule[],
  dismissed: Set<string>,
  maxPerModule: Record<InsightModule, number>
): Record<InsightModule, SmartInsight[]> {
  const result: Record<InsightModule, SmartInsight[]> = {
    dashboard: [],
    gastos: [],
    inversiones: [],
    ingresos: [],
    metas: [],
  };

  const generatedInsights: SmartInsight[] = [];

  // 1. Evaluate all rules
  for (const rule of rules) {
    try {
      const insight = rule.evaluate(ctx);
      if (insight) {
        generatedInsights.push(insight);
      }
    } catch (e) {
      console.error(`Error evaluating rule ${rule.id}:`, e);
    }
  }

  // 2. Filter dismissed and sort by priority
  const activeInsights = generatedInsights
    .filter((insight) => !dismissed.has(insight.id))
    .sort((a, b) => PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority]);

  // 3. Group by module and apply limits
  for (const insight of activeInsights) {
    const moduleList = result[insight.module];
    if (moduleList.length < maxPerModule[insight.module]) {
      moduleList.push(insight);
    }
  }

  return result;
}
