"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { QuickAdd } from "@/components/gastos/quick-add";
import { NewTransactionDialog } from "@/components/inversiones/new-transaction-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function MobileFab() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-[72px] right-4 z-40 md:hidden flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-2 p-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-xl"
          >
            <div className="[&>button]:w-full [&_button]:justify-start [&_button]:shadow-none">
              <QuickAdd />
            </div>
            <div className="[&>button]:w-full [&_button]:justify-start [&_button]:shadow-none">
              <NewTransactionDialog />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all active:scale-95",
          open 
            ? "bg-white/[0.1] border border-white/10 text-white" 
            : "bg-theme-500 text-white border border-theme-400"
        )}
      >
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Plus className="size-6" />
        </motion.div>
      </button>
    </div>
  );
}
