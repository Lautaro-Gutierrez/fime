"use client";

import { Suspense } from "react";
import { Shell } from "@/components/layout/shell";
import { HeroKpis } from "@/components/dashboard/hero-kpis";
import { CashflowSankey } from "@/components/dashboard/cashflow-sankey";
import { PortfolioSnapshot } from "@/components/dashboard/portfolio-snapshot";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { GoalsStrip } from "@/components/dashboard/goals-strip";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { QuickActions } from "@/components/dashboard/quick-actions";

export default function DashboardPage() {
  return (
    <Shell>
      <div className="flex flex-col gap-6 p-4 md:p-8 w-full max-w-7xl mx-auto">
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

        {/* 3. ALERTS PANEL */}
        <section className="w-full">
          <Suspense fallback={<div className="h-16 rounded-xl border border-white/5 bg-card/60 animate-pulse" />}>
            <AlertsPanel />
          </Suspense>
        </section>

        {/* 4. GOALS STRIP */}
        <section className="w-full">
          <Suspense fallback={<div className="h-32 rounded-xl border border-white/5 bg-card/60 animate-pulse" />}>
            <GoalsStrip />
          </Suspense>
        </section>

        {/* 5. Row 3: Activity + Quick Actions */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-20">
          <div className="lg:col-span-2">
            <Suspense fallback={<div className="h-64 rounded-xl border border-white/5 bg-card/60 animate-pulse" />}>
              <ActivityFeed />
            </Suspense>
          </div>
          <div className="lg:col-span-1 flex flex-col gap-4">
            <QuickActions />
          </div>
        </section>
      </div>
    </Shell>
  );
}
