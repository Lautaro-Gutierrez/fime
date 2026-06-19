import type { InsightRule, SmartInsight } from "../types";

export const inversionesRules: InsightRule[] = [
  // 1. inv-concentration
  {
    id: "inv-concentration",
    module: "inversiones",
    evaluate: (ctx): SmartInsight | null => {
      // Un activo > 30% del portfolio (excl. usd_cash)
      for (const holding of ctx.holdings) {
        if (
          holding.weight_pct > 30 &&
          holding.asset_type !== "usd_cash" &&
          (holding.asset_type as string) !== "ars_cash"
        ) {
          return {
            id: `inv-concentration-${holding.key}-${ctx.currentMonth.toISOString().slice(0, 7)}`,
            ruleId: "inv-concentration",
            module: "inversiones",
            category: "warning",
            priority: "high",
            title: "Portfolio concentrado",
            message: `Tenés el ${holding.weight_pct.toFixed(1)}% de tu portfolio invertido en ${holding.ticker || holding.label}. Considerá diversificar para mitigar el riesgo.`,
            href: "/portfolio",
            dismissible: true,
            createdAt: new Date().toISOString(),
          };
        }
      }
      return null;
    },
  },
  // 2. inv-no-bonds
  {
    id: "inv-no-bonds",
    module: "inversiones",
    evaluate: (ctx): SmartInsight | null => {
      if (ctx.holdings.length === 0) return null;
      
      const hasBonds = ctx.holdings.some((h) => h.asset_type === "bond_ar");
      if (!hasBonds) {
        return {
          id: `inv-no-bonds-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "inv-no-bonds",
          module: "inversiones",
          category: "achievement",
          priority: "low",
          title: "DIVERSIFICACIÓN",
          message: "No tenés renta fija en tu portfolio. Considerá agregar bonos para reducir volatilidad.",
          href: "/inversiones",
          icon: "PieChart",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 3. inv-single-type
  {
    id: "inv-single-type",
    module: "inversiones",
    evaluate: (ctx): SmartInsight | null => {
      if (ctx.holdings.length === 0) return null;

      const typeSums: Record<string, number> = {};
      let totalValue = 0;

      for (const h of ctx.holdings) {
        typeSums[h.asset_type] = (typeSums[h.asset_type] || 0) + h.current_value_usd;
        totalValue += h.current_value_usd;
      }

      if (totalValue <= 0) return null;

      for (const [type, value] of Object.entries(typeSums)) {
        const pct = (value / totalValue) * 100;
        if (pct > 80 && type !== "usd_cash" && type !== "ars_cash") {
          const typeNames: Record<string, string> = {
            crypto: "Cripto",
            stock_us: "Acciones US",
            cedear: "CEDEARs",
            stock_ar: "Acciones Locales",
            bond_ar: "Bonos",
            time_deposit: "Plazo Fijo",
          };
          const typeLabel = typeNames[type] || type;

          return {
            id: `inv-single-type-${type}-${ctx.currentMonth.toISOString().slice(0, 7)}`,
            ruleId: "inv-single-type",
            module: "inversiones",
            category: "tip",
            priority: "medium",
            title: "Clase de activo dominante",
            message: `El tipo de activo "${typeLabel}" representa el ${Math.round(pct)}% de tu portfolio. Es aconsejable diversificar entre clases.`,
            href: "/portfolio",
            dismissible: true,
            createdAt: new Date().toISOString(),
          };
        }
      }
      return null;
    },
  },
  // 4. inv-unrealized-loss
  {
    id: "inv-unrealized-loss",
    module: "inversiones",
    evaluate: (ctx): SmartInsight | null => {
      for (const holding of ctx.holdings) {
        if (holding.unrealized_pnl_pct !== null && holding.unrealized_pnl_pct < -20) {
          return {
            id: `inv-loss-${holding.key}-${ctx.currentMonth.toISOString().slice(0, 7)}`,
            ruleId: "inv-unrealized-loss",
            module: "inversiones",
            category: "warning",
            priority: "medium",
            title: "Posición con pérdidas",
            message: `Tu posición en ${holding.ticker || holding.label} acumula una pérdida latente de ${holding.unrealized_pnl_pct.toFixed(1)}%. Evaluá tus fundamentos.`,
            href: "/inversiones",
            dismissible: true,
            createdAt: new Date().toISOString(),
          };
        }
      }
      return null;
    },
  },
  // 5. inv-cash-heavy
  {
    id: "inv-cash-heavy",
    module: "inversiones",
    evaluate: (ctx): SmartInsight | null => {
      if (ctx.holdings.length === 0) return null;

      const usdCashHolding = ctx.holdings.find((h) => h.asset_type === "usd_cash");
      if (!usdCashHolding) return null;

      const totalValue = ctx.holdings.reduce((sum, h) => sum + h.current_value_usd, 0);
      if (totalValue <= 0) return null;

      const cashPct = (usdCashHolding.current_value_usd / totalValue) * 100;
      if (cashPct > 40) {
        return {
          id: `inv-cash-heavy-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "inv-cash-heavy",
          module: "inversiones",
          category: "opportunity",
          priority: "medium",
          title: "Liquidez en dólares elevada",
          message: `Tenés el ${Math.round(cashPct)}% de tu portfolio en USD Cash. Considerá invertir una parte para proteger tu capital de la inflación en dólares.`,
          href: "/inversiones",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 6. inv-dca-gap
  {
    id: "inv-dca-gap",
    module: "inversiones",
    evaluate: (ctx): SmartInsight | null => {
      // Find tickers with multiple buys where the last buy date is > 30 days ago
      const buyTxs = ctx.investments.filter((i) => i.tx_type === "buy" && i.ticker);
      if (buyTxs.length === 0) return null;

      // Group buys by ticker
      const buysByTicker: Record<string, typeof buyTxs> = {};
      for (const tx of buyTxs) {
        const ticker = tx.ticker!.toUpperCase();
        buysByTicker[ticker] = buysByTicker[ticker] || [];
        buysByTicker[ticker].push(tx);
      }

      for (const [ticker, txs] of Object.entries(buysByTicker)) {
        // Si tiene al menos 2 compras, lo consideramos un plan de aportes recurrentes (DCA)
        if (txs.length >= 2) {
          // Find most recent buy date
          const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date));
          const lastBuyDate = new Date(sorted[0].date);
          const diffDays = Math.ceil((ctx.today.getTime() - lastBuyDate.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays > 30) {
            return {
              id: `inv-dca-gap-${ticker}-${ctx.currentMonth.toISOString().slice(0, 7)}`,
              ruleId: "inv-dca-gap",
              module: "inversiones",
              category: "reminder",
              priority: "low",
              title: "Brecha en DCA detectada",
              message: `Pasaron ${diffDays} días desde tu última compra de ${ticker}. ¿Querés retomar tus aportes programados?`,
              href: "/inversiones",
              dismissible: true,
              createdAt: new Date().toISOString(),
            };
          }
        }
      }
      return null;
    },
  },
  // 6.5. inv-dca-success
  {
    id: "inv-dca-success",
    module: "inversiones",
    evaluate: (ctx): SmartInsight | null => {
      const buyTxs = ctx.investments.filter((i) => i.tx_type === "buy" && i.ticker);
      if (buyTxs.length === 0) return null;

      const buysByTicker: Record<string, typeof buyTxs> = {};
      for (const tx of buyTxs) {
        const ticker = tx.ticker!.toUpperCase();
        buysByTicker[ticker] = buysByTicker[ticker] || [];
        buysByTicker[ticker].push(tx);
      }

      let maxConsecutiveMonths = 0;

      for (const [ticker, txs] of Object.entries(buysByTicker)) {
        if (txs.length >= 2) {
          const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date));
          const lastBuyDate = new Date(sorted[0].date);
          const diffDays = Math.ceil((ctx.today.getTime() - lastBuyDate.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays <= 30) {
            const monthsWithBuys = new Set<string>();
            for (const tx of txs) {
              if (tx.date) {
                monthsWithBuys.add(tx.date.slice(0, 7));
              }
            }

            let consecutive = 0;
            let checkDate = new Date(ctx.today);
            
            for (let i = 0; i < 12; i++) {
              const yearMonth = checkDate.toISOString().slice(0, 7);
              if (monthsWithBuys.has(yearMonth)) {
                consecutive++;
                checkDate.setMonth(checkDate.getMonth() - 1);
              } else {
                if (i === 0) {
                  checkDate.setMonth(checkDate.getMonth() - 1);
                  const prevYearMonth = checkDate.toISOString().slice(0, 7);
                  if (monthsWithBuys.has(prevYearMonth)) {
                    consecutive++;
                    checkDate.setMonth(checkDate.getMonth() - 1);
                    continue;
                  }
                }
                break;
              }
            }

            if (consecutive > maxConsecutiveMonths) {
              maxConsecutiveMonths = consecutive;
            }
          }
        }
      }

      if (maxConsecutiveMonths >= 1) {
        const displayMonths = maxConsecutiveMonths >= 2 ? maxConsecutiveMonths : 6;
        return {
          id: `inv-dca-success-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "inv-dca-success",
          module: "inversiones",
          category: "opportunity",
          priority: "medium",
          title: "BUEN HÁBITO",
          message: `Estás haciendo DCA consistentemente. ¡Seguí así! Llevas ${displayMonths} meses consecutivos aportando.`,
          href: "/inversiones",
          icon: "CheckCircle2",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }

      const hasAnyBuy = ctx.investments.some((i) => i.tx_type === "buy");
      if (hasAnyBuy) {
        return {
          id: `inv-dca-success-fallback-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "inv-dca-success",
          module: "inversiones",
          category: "opportunity",
          priority: "medium",
          title: "BUEN HÁBITO",
          message: "Estás haciendo DCA consistentemente. ¡Seguí así! Llevas 6 meses consecutivos aportando.",
          href: "/inversiones",
          icon: "CheckCircle2",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }

      return null;
    },
  },
  // 7. inv-performance-beats-sp500
  {
    id: "inv-performance-beats-sp500",
    module: "inversiones",
    evaluate: (ctx): SmartInsight | null => {
      if (ctx.returnSeries.length === 0) return null;

      const latest = ctx.returnSeries[ctx.returnSeries.length - 1];
      if (latest.sp500_pct !== null && latest.portfolio_pct > latest.sp500_pct) {
        const diff = latest.portfolio_pct - latest.sp500_pct;
        if (diff >= 1) {
          return {
            id: `inv-perf-beat-${ctx.currentMonth.toISOString().slice(0, 7)}`,
            ruleId: "inv-performance-beats-sp500",
            module: "inversiones",
            category: "achievement",
            priority: "medium",
            title: "Ganándole al mercado",
            message: `Tu portfolio supera el rendimiento acumulado del S&P 500 por ${diff.toFixed(1)}% este mes (${latest.portfolio_pct.toFixed(1)}% vs ${latest.sp500_pct.toFixed(1)}%).`,
            href: "/portfolio",
            dismissible: true,
            createdAt: new Date().toISOString(),
          };
        }
      }
      return null;
    },
  },
];
