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
            title: "Concentración de Activos",
            message: `El activo ${holding.ticker || holding.label} representa el ${holding.weight_pct.toFixed(1)}% del portafolio total. Incrementar la diversificación contribuye a mitigar el riesgo de la cartera ante fluctuaciones de emisores específicos.`,
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
          title: "Oportunidad de Diversificación",
          message: "Actualmente, tu capital está concentrado en opciones de riesgo. Agregar instrumentos más conservadores, como los bonos, ayuda a proteger tu dinero ante caídas del mercado.",
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
            title: "Estructura del Portafolio",
            message: `El tipo de activo "${typeLabel}" representa el ${Math.round(pct)}% del portafolio. Distribuir el capital en diferentes tipos de instrumentos reduce la exposición ante caídas del mercado.`,
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
            title: `Estado de la Cartera: ${holding.ticker || holding.label}`,
            message: `Este activo presenta un rendimiento negativo temporal de ${Math.abs(holding.unrealized_pnl_pct).toFixed(1)}%. En las inversiones a largo plazo, las fluctuaciones son normales. Evalúa si mantener esta posición sigue alineado con tu estrategia.`,
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
          title: "Gestión de Liquidez",
          message: `La tenencia de efectivo representa el ${Math.round(cashPct)}% de la cartera. Evaluar la colocación de este capital en instrumentos adecuados permite resguardar el poder adquisitivo frente a la inflación de la moneda.`,
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
      const buyTxs = ctx.investments.filter((i) => i.tx_type === "buy" && i.ticker);
      if (buyTxs.length === 0) return null;

      const buysByTicker: Record<string, typeof buyTxs> = {};
      for (const tx of buyTxs) {
        const ticker = tx.ticker!.toUpperCase();
        buysByTicker[ticker] = buysByTicker[ticker] || [];
        buysByTicker[ticker].push(tx);
      }

      for (const [ticker, txs] of Object.entries(buysByTicker)) {
        if (txs.length >= 2) {
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
              title: "Continuidad del Plan de Inversión",
              message: `Han transcurrido ${diffDays} días desde la última incorporación en el activo ${ticker}. Mantener la regularidad de los aportes periódicos favorece el promedio de costo del activo en el largo plazo.`,
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
  // 7. inv-dca-success
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
          title: "Consistencia en Inversiones",
          message: `Se registra un hábito consolidado de aportes periódicos en el tiempo, sumando ${displayMonths} meses de aportaciones. La regularidad es un factor clave para la consolidación de su patrimonio de largo plazo.`,
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
          title: "Consistencia en Inversiones",
          message: "Se registra un hábito consolidado de aportes periódicos en el tiempo. La regularidad es un factor clave para la consolidación de su patrimonio de largo plazo.",
          href: "/inversiones",
          icon: "CheckCircle2",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }

      return null;
    },
  },
  // 8. inv-performance-beats-sp500
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
            title: "Rendimiento de Cartera",
            message: `El rendimiento mensual de las inversiones supera el desempeño de los principales índices internacionales en un ${diff.toFixed(1)}%. Esta evolución refleja el resultado favorable de la estrategia actual de selección de activos.`,
            href: "/portfolio",
            dismissible: true,
            createdAt: new Date().toISOString(),
          };
        }
      }
      return null;
    },
  },
  // 9. inv-no-investments
  {
    id: "inv-no-investments",
    module: "inversiones",
    evaluate: (ctx): SmartInsight | null => {
      if (ctx.investments.length === 0 && ctx.holdings.length === 0) {
        return {
          id: "inv-no-investments",
          ruleId: "inv-no-investments",
          module: "inversiones",
          category: "tip",
          priority: "low",
          title: "Introducción al Mercado Financiero",
          message: "No se registran colocaciones financieras activas. Comenzar a asignar una fracción del excedente mensual a instrumentos de inversión favorece la protección y crecimiento de los ahorros.",
          href: "/inversiones",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 10. inv-balanced-portfolio
  {
    id: "inv-balanced-portfolio",
    module: "inversiones",
    evaluate: (ctx): SmartInsight | null => {
      if (ctx.holdings.length < 3) return null;

      const typeSums: Record<string, number> = {};
      let totalValue = 0;

      for (const h of ctx.holdings) {
        typeSums[h.asset_type] = (typeSums[h.asset_type] || 0) + h.current_value_usd;
        totalValue += h.current_value_usd;
      }

      if (totalValue <= 0) return null;

      // Ningún tipo de activo > 50% y ningún activo individual > 20%
      const meetsTypeDiversification = Object.values(typeSums).every((val) => (val / totalValue) * 100 <= 50);
      const meetsHoldingDiversification = ctx.holdings.every((h) => h.weight_pct <= 20);

      if (meetsTypeDiversification && meetsHoldingDiversification) {
        return {
          id: `inv-balanced-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "inv-balanced-portfolio",
          module: "inversiones",
          category: "achievement",
          priority: "medium",
          title: "Portafolio Balanceado",
          message: "La distribución de activos en cartera presenta una adecuada diversificación por emisor y clase de instrumento. Esta estructura contribuye a equilibrar de forma eficiente el riesgo y el rendimiento.",
          href: "/portfolio",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 11. inv-crypto-heavy
  {
    id: "inv-crypto-heavy",
    module: "inversiones",
    evaluate: (ctx): SmartInsight | null => {
      if (ctx.holdings.length === 0) return null;

      const cryptoVal = ctx.holdings
        .filter((h) => h.asset_type === "crypto")
        .reduce((sum, h) => sum + h.current_value_usd, 0);

      const totalValue = ctx.holdings.reduce((sum, h) => sum + h.current_value_usd, 0);
      if (totalValue <= 0) return null;

      const cryptoPct = (cryptoVal / totalValue) * 100;
      if (cryptoPct > 25) {
        return {
          id: `inv-crypto-heavy-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "inv-crypto-heavy",
          module: "inversiones",
          category: "warning",
          priority: "medium",
          title: "Exposición a Criptoactivos",
          message: `Las inversiones en criptoactivos representan una proporción significativa de la cartera (${Math.round(cryptoPct)}%). Se recomienda evaluar periódicamente si esta exposición se corresponde con su perfil de tolerancia al riesgo.`,
          href: "/portfolio",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
];
