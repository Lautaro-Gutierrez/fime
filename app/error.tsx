"use client";

import { useEffect } from "react";
import { Shell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service in production
    console.error("Global boundary caught error:", error);
  }, [error]);

  return (
    <Shell>
      <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-4 text-center px-4">
        <div className="rounded-full bg-destructive/10 p-4">
          <svg
            className="size-10 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold tracking-tight">
            Oops, algo salió mal
          </h2>
          <p className="text-muted-foreground max-w-sm">
            Tuvimos un problema al cargar esta página. Podés intentar recargarla.
          </p>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <Button onClick={() => reset()} variant="default">
            Intentar de nuevo
          </Button>
          <Button onClick={() => window.location.href = "/"} variant="outline">
            Volver al inicio
          </Button>
        </div>
      </div>
    </Shell>
  );
}
