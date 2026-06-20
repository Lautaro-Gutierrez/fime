import type { InsightRule, SmartInsight } from "../types";

export const inversionesRules: InsightRule[] = [
  // 1. inv-concentration
  {
    id: "inv-concentration",
    module: "inversiones",
    evaluate: (ctx): SmartInsight | null => {
      // Umbral dinámico según perfil de inversor (conservador es más estricto, agresivo tolera más)
      const threshold = ctx.investorProfile === "conservador" ? 20 
                      : ctx.investorProfile === "agresivo" ? 45 
                      : 30; // default / moderado

      for (const holding of ctx.holdings) {
        if (
          holding.weight_pct > threshold &&
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
            message: `El activo ${holding.ticker || holding.label} representa el ${holding.weight_pct.toFixed(1)}% de tu portafolio, superando el límite sugerido del ${threshold}% para tu perfil ${ctx.investorProfile || "moderado"}. Considerá diversificar para mitigar el riesgo.`,
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
  // 12. inv-gain-position
  {
    id: "inv-gain-position",
    module: "inversiones",
    evaluate: (ctx): SmartInsight | null => {
      for (const holding of ctx.holdings) {
        if (holding.unrealized_pnl_pct !== null && holding.unrealized_pnl_pct > 20) {
          const ticker = holding.ticker || holding.label;
          return {
            id: `inv-gain-pos-${ticker}-${ctx.currentMonth.toISOString().slice(0, 7)}`,
            ruleId: "inv-gain-position",
            module: "inversiones",
            category: "achievement",
            priority: "medium",
            title: "Una inversión viene rindiendo muy bien",
            message: `El activo ${ticker} acumula una ganancia del ${Math.round(holding.unrealized_pnl_pct)}%. Invertir con visión de largo plazo da sus frutos. Podés evaluar si mantener o tomar ganancias parciales.`,
            href: "/portfolio",
            dismissible: true,
            createdAt: new Date().toISOString(),
          };
        }
      }
      return null;
    },
  },
  // 13. inv-all-green
  {
    id: "inv-all-green",
    module: "inversiones",
    evaluate: (ctx): SmartInsight | null => {
      const activeHoldings = ctx.holdings.filter(
        (h) => h.asset_type !== "usd_cash" && (h.asset_type as string) !== "ars_cash"
      );
      if (activeHoldings.length < 2) return null;

      const allPositive = activeHoldings.every(
        (h) => h.unrealized_pnl_pct !== null && h.unrealized_pnl_pct > 0
      );

      if (allPositive) {
        return {
          id: `inv-all-green-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "inv-all-green",
          module: "inversiones",
          category: "achievement",
          priority: "medium",
          title: "Todas tus inversiones están en verde",
          message: "Cada posición de tu cartera acumula ganancias en este momento. Es un resultado poco común — seguí con la estrategia actual.",
          href: "/portfolio",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 14. inv-portfolio-milestone-10k
  {
    id: "inv-portfolio-milestone-10k",
    module: "inversiones",
    evaluate: (ctx): SmartInsight | null => {
      if (ctx.portfolioTotals.total_usd >= 10000) {
        return {
          id: `inv-milestone-10k-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "inv-portfolio-milestone-10k",
          module: "inversiones",
          category: "achievement",
          priority: "high",
          title: "Superaste los USD 10.000 en inversiones",
          message: "Tu cartera de inversiones supera los USD 10.000. Este es un hito importante en la construcción de tu patrimonio financiero.",
          href: "/portfolio",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 15. inv-portfolio-milestone-1k
  {
    id: "inv-portfolio-milestone-1k",
    module: "inversiones",
    evaluate: (ctx): SmartInsight | null => {
      const total = ctx.portfolioTotals.total_usd;
      if (total >= 1000 && total < 10000) {
        return {
          id: `inv-milestone-1k-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "inv-portfolio-milestone-1k",
          module: "inversiones",
          category: "achievement",
          priority: "medium",
          title: "Superaste los USD 1.000 en inversiones",
          message: "Tu cartera ya supera los USD 1.000. Cada aporte cuenta: los primeros USD 1.000 suelen ser los más difíciles de acumular.",
          href: "/portfolio",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 16. inv-positive-return
  {
    id: "inv-positive-return",
    module: "inversiones",
    evaluate: (ctx): SmartInsight | null => {
      if (ctx.returnSeries.length === 0) return null;
      const latest = ctx.returnSeries[ctx.returnSeries.length - 1];
      if (latest.portfolio_pct !== null && latest.portfolio_pct > 5) {
        return {
          id: `inv-pos-ret-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "inv-positive-return",
          module: "inversiones",
          category: "achievement",
          priority: "medium",
          title: "Tu cartera viene rindiendo bien",
          message: `El rendimiento acumulado de tu cartera es de +${latest.portfolio_pct.toFixed(1)}%. Mantenerse invertido y con consistencia es la base del crecimiento patrimonial.`,
          href: "/portfolio",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 17. inv-realized-gains
  {
    id: "inv-realized-gains",
    module: "inversiones",
    evaluate: (ctx): SmartInsight | null => {
      const realized = ctx.portfolioTotals.realized_pnl_usd;
      if (realized > 0) {
        return {
          id: `inv-realized-gains-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "inv-realized-gains",
          module: "inversiones",
          category: "achievement",
          priority: "medium",
          title: "Tuviste ganancias en ventas",
          message: `Acumulás USD ${Math.round(realized).toLocaleString("es-AR")} en ganancias realizadas por ventas de activos. Esas ganancias ya son tuyas.`,
          href: "/portfolio",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 18. inv-low-usd-reserve
  {
    id: "inv-low-usd-reserve",
    module: "inversiones",
    evaluate: (ctx): SmartInsight | null => {
      const totalValue = ctx.holdings.reduce((sum, h) => sum + h.current_value_usd, 0);
      if (totalValue <= 500) return null;

      const hasUsdCash = ctx.holdings.some((h) => h.asset_type === "usd_cash");
      if (!hasUsdCash) {
        return {
          id: `inv-low-usd-res-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "inv-low-usd-reserve",
          module: "inversiones",
          category: "tip",
          priority: "low",
          title: "No tenés reservas en dólares",
          message: "Tu cartera no incluye dólares en efectivo. Tener una pequeña reserva en moneda fuerte ayuda a estar preparado ante imprevistos o nuevas oportunidades de compra.",
          href: "/inversiones",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 19. inv-sell-recent
  {
    id: "inv-sell-recent",
    module: "inversiones",
    evaluate: (ctx): SmartInsight | null => {
      const hasRecentSell = ctx.investments.some((inv) => {
        if (inv.tx_type !== "sell") return false;
        const txDate = new Date(inv.date);
        const diffDays = (ctx.today.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 30;
      });

      if (hasRecentSell) {
        return {
          id: `inv-sell-recent-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "inv-sell-recent",
          module: "inversiones",
          category: "tip",
          priority: "low",
          title: "Tuviste una venta reciente",
          message: "Vendiste activos en los últimos días. Si todavía no reinvertiste ese capital, es un buen momento para evaluar nuevas oportunidades.",
          href: "/inversiones",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 20. inv-time-deposit-present
  {
    id: "inv-time-deposit-present",
    module: "inversiones",
    evaluate: (ctx): SmartInsight | null => {
      const hasTimeDeposit = ctx.holdings.some((h) => h.asset_type === "time_deposit");
      if (hasTimeDeposit) {
        return {
          id: `inv-td-present-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "inv-time-deposit-present",
          module: "inversiones",
          category: "reminder",
          priority: "low",
          title: "Tenés un plazo fijo en tu cartera",
          message: "Registrás un plazo fijo como parte de tu cartera. Recordá verificar su fecha de vencimiento para decidir si renovarlo o redirigirlo a otra inversión.",
          href: "/inversiones",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 21. inv-on-opportunity
  {
    id: "inv-on-opportunity",
    module: "inversiones",
    evaluate: (ctx): SmartInsight | null => {
      const totalValue = ctx.holdings.reduce((sum, h) => sum + h.current_value_usd, 0);
      if (totalValue <= 2000) return null;

      const hasOn = ctx.holdings.some((h) => h.asset_type === "on");
      if (!hasOn) {
        return {
          id: `inv-on-opp-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "inv-on-opportunity",
          module: "inversiones",
          category: "opportunity",
          priority: "low",
          title: "¿Conocés las Obligaciones Negociables?",
          message: "Las ONs son instrumentos de renta fija corporativa que pueden ofrecer rendimientos en dólares. Son una opción interesante para diversificar tu cartera conservadora.",
          href: "/inversiones",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 22. inv-profile-missing
  {
    id: "inv-profile-missing",
    module: "inversiones",
    evaluate: (ctx): SmartInsight | null => {
      if (ctx.investorProfile !== null) return null;
      return {
        id: `inv-prof-missing-${ctx.currentMonth.toISOString().slice(0, 7)}`,
        ruleId: "inv-profile-missing",
        module: "inversiones",
        category: "reminder",
        priority: "medium",
        title: "Completá tu Perfil de Inversor",
        message: "Para recibir consejos y alertas personalizadas según tu tolerancia al riesgo, te recomendamos completar tu Perfil de Inversor en Configuración.",
        href: "/config",
        dismissible: true,
        createdAt: new Date().toISOString(),
      };
    },
  },
  // 23. inv-profile-stale
  {
    id: "inv-profile-stale",
    module: "inversiones",
    evaluate: (ctx): SmartInsight | null => {
      if (!ctx.investorProfile || !ctx.investorProfileCompletedAt) return null;
      
      const completedDate = new Date(ctx.investorProfileCompletedAt);
      const msDiff = ctx.today.getTime() - completedDate.getTime();
      const daysDiff = msDiff / (1000 * 60 * 60 * 24);

      if (daysDiff > 365) {
        return {
          id: `inv-prof-stale-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "inv-profile-stale",
          module: "inversiones",
          category: "reminder",
          priority: "low",
          title: "Actualizá tu Perfil de Inversor",
          message: "Pasó más de un año desde que realizaste tu test de perfil. Es un buen momento para rehacerlo en Configuración y adecuarlo a tus condiciones actuales.",
          href: "/config",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 24. inv-high-equity-for-conservative
  {
    id: "inv-high-equity-for-conservative",
    module: "inversiones",
    evaluate: (ctx): SmartInsight | null => {
      if (ctx.investorProfile !== "conservador" || ctx.holdings.length === 0) return null;

      const equityPct = ctx.holdings
        .filter((h) => ["cedear", "stock_ar", "stock_us", "crypto", "etf"].includes(h.asset_type))
        .reduce((sum, h) => sum + h.weight_pct, 0);

      if (equityPct > 30) {
        return {
          id: `inv-high-eq-cons-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "inv-high-equity-for-conservative",
          module: "inversiones",
          category: "warning",
          priority: "high",
          title: "Riesgo Elevado para Perfil Conservador",
          message: `Tenés el ${equityPct.toFixed(1)}% de tu portafolio en activos de alta volatilidad (renta variable/cripto). Como perfil Conservador, se sugiere mantener esta exposición por debajo del 30% para evitar grandes oscilaciones.`,
          href: "/portfolio",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 25. inv-low-equity-for-aggressive
  {
    id: "inv-low-equity-for-aggressive",
    module: "inversiones",
    evaluate: (ctx): SmartInsight | null => {
      if (ctx.investorProfile !== "agresivo" || ctx.holdings.length === 0) return null;

      const equityPct = ctx.holdings
        .filter((h) => ["cedear", "stock_ar", "stock_us", "crypto", "etf"].includes(h.asset_type))
        .reduce((sum, h) => sum + h.weight_pct, 0);

      if (equityPct < 40) {
        return {
          id: `inv-low-eq-aggr-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "inv-low-equity-for-aggressive",
          module: "inversiones",
          category: "tip",
          priority: "medium",
          title: "Potenciá tu Perfil Agresivo",
          message: `Tu perfil es Agresivo pero tenés solo un ${equityPct.toFixed(1)}% en activos de renta variable. Considerá incrementar tu exposición en acciones o CEDEARs para buscar retornos más competitivos.`,
          href: "/inversiones",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
  // 26. inv-no-fixed-income
  {
    id: "inv-no-fixed-income",
    module: "inversiones",
    evaluate: (ctx): SmartInsight | null => {
      if (!ctx.investorProfile || ctx.investorProfile === "agresivo" || ctx.holdings.length === 0) return null;

      const hasFixedIncome = ctx.holdings.some((h) =>
        ["bond_ar", "time_deposit", "on"].includes(h.asset_type)
      );

      if (!hasFixedIncome) {
        return {
          id: `inv-no-fixed-${ctx.currentMonth.toISOString().slice(0, 7)}`,
          ruleId: "inv-no-fixed-income",
          module: "inversiones",
          category: "opportunity",
          priority: "high",
          title: "Diversificación en Renta Fija",
          message: `Tu perfil es ${ctx.investorProfile === "conservador" ? "Conservador" : "Moderado"} y no contás con instrumentos de Renta Fija (Bonos, ONs o Plazos Fijos). Incorporarlos te ayudará a dar previsibilidad a tus retornos.`,
          href: "/inversiones",
          dismissible: true,
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    },
  },
];
