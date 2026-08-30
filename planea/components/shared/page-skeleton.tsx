import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PageSkeletonProps {
  /** Cantidad de tarjetas de resumen en la fila superior */
  stats?: number;
  /** Distribución del contenido principal */
  variant?: "list" | "grid" | "split";
}

/** Skeleton loader que imita la estructura de las pantallas principales. */
export function PageSkeleton({ stats = 0, variant = "list" }: PageSkeletonProps) {
  return (
    <div aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-7 w-52" />
      <Skeleton className="mt-2 h-4 w-72" />

      {stats > 0 && (
        <div
          className={cn(
            "mt-6 grid grid-cols-2 gap-3",
            stats >= 4 ? "xl:grid-cols-4" : "lg:grid-cols-3",
          )}
        >
          {Array.from({ length: stats }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      )}

      {variant === "split" && (
        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            <Skeleton className="h-12 rounded-2xl" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      )}

      {variant === "grid" && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      )}

      {variant === "list" && (
        <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      )}
    </div>
  );
}
