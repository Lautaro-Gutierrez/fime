"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, FileJson, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/layout/shell";
import { ConfigHeader } from "@/components/config/header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const TABLES = [
  "expenses",
  "incomes",
  "investments",
  "initial_positions",
  "goals",
  "portfolio_snapshots",
  "credit_cards",
  "user_preferences",
] as const;

export default function ConfigDatosPage() {
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleExport() {
    setExporting(true);
    setDone(false);

    try {
      const supabase = createClient();
      const result: Record<string, unknown[]> = {};

      for (const table of TABLES) {
        const { data, error } = await supabase.from(table).select("*");
        if (error) {
          console.warn(`Skipping ${table}: ${error.message}`);
          result[table] = [];
        } else {
          result[table] = data ?? [];
        }
      }

      const exportPayload = {
        exported_at: new Date().toISOString(),
        version: "1.0",
        app: "FiMe",
        data: result,
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fime-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDone(true);
      toast.success("Datos exportados correctamente");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al exportar");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Shell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
        <ConfigHeader
          title="Tus Datos"
          eyebrow="Export"
          description="Descargá toda tu información financiera en formato JSON."
          backHref="/config"
        />

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-white/5 bg-card/60 p-6 backdrop-blur sm:p-8"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-amber-500/8 blur-3xl" />

          <div className="relative flex flex-col items-center gap-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20">
              <FileJson className="size-8" />
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="font-heading text-xl font-semibold tracking-tight">
                Exportar datos
              </h2>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Descargá un archivo JSON con todos tus gastos, ingresos,
                inversiones, metas, tarjetas y preferencias. Tus datos son tuyos.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Tablas incluidas
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {TABLES.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-white/5 bg-card/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <Button
              onClick={handleExport}
              disabled={exporting}
              size="lg"
              className="mt-2 h-12 min-w-[220px] gap-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-orange-500 hover:shadow-amber-500/40"
            >
              {exporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : done ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <Download className="size-4" />
              )}
              {exporting
                ? "Exportando..."
                : done
                  ? "¡Descargado!"
                  : "Descargar JSON"}
            </Button>
          </div>
        </motion.div>
      </div>
    </Shell>
  );
}
