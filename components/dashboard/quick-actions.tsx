"use client";

import { QuickAdd } from "@/components/gastos/quick-add";
import { NewTransactionDialog } from "@/components/inversiones/new-transaction-dialog";
import { Zap } from "lucide-react";

export function QuickActions() {
  return (
    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl backdrop-blur p-6 flex flex-col gap-4 h-full group hover:border-white/10 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-5 h-5 text-yellow-500" />
        <h3 className="text-lg font-medium text-foreground/80">Quick Actions</h3>
      </div>
      
      <div className="flex flex-col gap-3 flex-1 justify-center [&>div]:w-full [&_button]:w-full">
        <QuickAdd />
        <NewTransactionDialog />
      </div>
    </div>
  );
}
