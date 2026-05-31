import { Shell } from "@/components/layout/shell";

export default function Loading() {
  return (
    <Shell>
      <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-4">
        {/* Skeleton simple para la carga entre navegaciones SSR */}
        <div className="relative flex items-center justify-center">
          <div className="size-16 animate-pulse rounded-2xl bg-theme-500/20" />
          <div className="absolute size-8 animate-spin rounded-xl border-4 border-theme-500 border-t-transparent" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">
          Cargando FiMe...
        </p>
      </div>
    </Shell>
  );
}
