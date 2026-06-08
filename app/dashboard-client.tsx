"use client";

import { Suspense } from "react";
import { Shell } from "@/components/layout/shell";
import { HeroKpis } from "@/components/dashboard/hero-kpis";
import { CashflowSankey } from "@/components/dashboard/cashflow-sankey";
import { PortfolioSnapshot } from "@/components/dashboard/portfolio-snapshot";
import { SmartInsightsCarousel } from "@/components/dashboard/smart-insights-carousel";
import { HealthGauge } from "@/components/dashboard/health-gauge";
import { GoalsStrip } from "@/components/dashboard/goals-strip";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

export default function DashboardClient() {
  return (
    <Shell>
      <div className="flex flex-col gap-6 p-4 md:p-8 w-full max-w-7xl mx-auto overflow-x-hidden">
        {/* 1. HERO - KPIs */}
        <section className="w-full">
          <Suspense fallback={<div className="h-40 rounded-xl border border-white/5 bg-card/60 animate-pulse" />}>
            <HeroKpis />
          </Suspense>
        </section>

        {/* 2. Row 2: Sankey (Left) + Portfolio Snapshot (Right) */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Suspense fallback={<div className="h-80 rounded-xl border border-white/5 bg-card/60 animate-pulse" />}>
              <CashflowSankey />
            </Suspense>
          </div>
          <div className="lg:col-span-1">
            <Suspense fallback={<div className="h-80 rounded-xl border border-white/5 bg-card/60 animate-pulse" />}>
              <PortfolioSnapshot />
            </Suspense>
          </div>
        </section>

        {/* 3. SMART INSIGHTS CAROUSEL */}
        <section className="w-full">
          <Suspense fallback={<div className="h-40 rounded-xl border border-white/5 bg-card/60 animate-pulse" />}>
            <SmartInsightsCarousel />
          </Suspense>
        </section>

        {/* 4. Row 3: Goals (Left) + Health Gauge (Right) */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Suspense fallback={<div className="h-40 rounded-xl border border-white/5 bg-card/60 animate-pulse" />}>
              <GoalsStrip />
            </Suspense>
          </div>
          <div className="lg:col-span-1">
            <Suspense fallback={<div className="h-40 rounded-xl border border-white/5 bg-card/60 animate-pulse" />}>
              <HealthGauge />
            </Suspense>
          </div>
        </section>

        {/* 5. Row 3: Activity */}
        <section className="w-full pb-20">
          <Suspense fallback={<div className="h-64 rounded-xl border border-white/5 bg-card/60 animate-pulse" />}>
            <ActivityFeed />
          </Suspense>
        </section>
      </div>
    </Shell>
  );
}
