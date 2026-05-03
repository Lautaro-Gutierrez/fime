"use client";

import { useMemo } from "react";
import { useExpenses } from "@/hooks/use-expenses";
import { useInvestments } from "@/hooks/use-investments";
import { usePrefsContext } from "@/components/providers/preferences-provider";
import { formatUSD } from "@/lib/format";
import { ShoppingCart, TrendingUp, Activity } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function ActivityFeed() {
  const { stealthMode: isStealthMode } = usePrefsContext();
  const currentMonth = useMemo(() => new Date(), []);
  
  const expensesQ = useExpenses(currentMonth);
  const investmentsQ = useInvestments();

  const combinedActivity = useMemo(() => {
    const expenses = (expensesQ.data ?? []).map(e => ({
      id: e.id,
      type: "expense",
      date: e.date,
      created_at: e.created_at,
      amount: e.amount,
      currency: e.currency,
      category: e.category,
      label: e.note || e.category,
    }));

    const investments = (investmentsQ.data ?? []).map(i => ({
      id: i.id,
      type: "investment",
      date: i.date,
      created_at: i.created_at,
      amount: (i.quantity * (i.price_usd || 0)) + i.fees_usd,
      currency: "USD", // aproximado si no hay fx rate real
      category: i.asset_type,
      label: `${i.tx_type === "buy" ? "Compra" : "Venta"} ${i.ticker || i.asset_type}`,
    }));

    return [...expenses, ...investments]
      .sort((a, b) => {
        // Sort by date desc, then by created_at desc
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.created_at.localeCompare(a.date);
      })
      .slice(0, 5); // Últimas 5 operaciones
  }, [expensesQ.data, investmentsQ.data]);

  const isLoading = expensesQ.isLoading || investmentsQ.isLoading;

  if (isLoading) {
    return <div className="rounded-3xl border border-white/5 bg-card/60 backdrop-blur p-6 h-full min-h-[250px] animate-pulse" />;
  }

  return (
    <div className="rounded-3xl border border-white/5 bg-card/60 backdrop-blur p-6 h-full flex flex-col relative group hover:border-white/10 transition-colors">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-5 h-5 text-indigo-400" />
        <h3 className="text-lg font-medium text-foreground/80">Activity Feed</h3>
      </div>

      {combinedActivity.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          No hay operaciones recientes
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {combinedActivity.map((item) => {
            const isExpense = item.type === "expense";
            const Icon = isExpense ? ShoppingCart : TrendingUp;
            const iconBg = isExpense ? "bg-emerald-500/10 text-emerald-500" : "bg-indigo-500/10 text-indigo-500";
            
            return (
              <div key={`${item.type}-${item.id}`} className="flex items-center justify-between group/item">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${iconBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium capitalize truncate max-w-[150px] md:max-w-[200px]">
                      {item.label}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {format(parseISO(item.date), "d MMM", { locale: es })} • {item.category}
                    </div>
                  </div>
                </div>
                <div className={`text-sm font-medium tabular-nums ${isExpense ? "" : "text-foreground"}`}>
                  {isStealthMode ? "******" : `${item.currency === "USD" ? "USD " : "ARS "}${formatUSD(item.amount, false).replace('$', '')}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
