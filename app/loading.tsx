import { Shell } from "@/components/layout/shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Shell>
      <div className="relative flex flex-col gap-6 p-4 pb-10 sm:p-6 md:p-8 w-full">
        {/* Header Skeleton */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-16 bg-white/5" />
            <Skeleton className="h-10 w-48 bg-white/5" />
            <Skeleton className="h-4 w-64 bg-white/5" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-40 rounded-lg bg-white/5" />
            <Skeleton className="h-10 w-10 rounded-full bg-white/5" />
          </div>
        </div>

        {/* Dashboard Cards Skeleton */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-xl bg-white/5" />
          <Skeleton className="h-48 w-full rounded-xl bg-white/5" />
        </div>

        {/* List Skeleton */}
        <div className="mt-4 flex flex-col gap-4">
          <Skeleton className="h-8 w-32 bg-white/5" />
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl bg-white/5" />
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
