import { Sprout } from "lucide-react";

import { cn } from "@/lib/utils";

/** Isotipo de la marca: brote sobre fondo del degradado principal. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3E9B94] to-[#206B48] text-white shadow-md",
        className,
      )}
    >
      <Sprout className="size-6" strokeWidth={2.2} />
    </span>
  );
}

export function BrandLockup({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark />
      <span className="text-xl font-bold tracking-tight text-foreground">
        Planea
      </span>
    </span>
  );
}
