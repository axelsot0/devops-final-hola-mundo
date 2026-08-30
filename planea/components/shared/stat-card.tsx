import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  tone?: "default" | "positive" | "negative";
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
  className,
}: StatCardProps) {
  return (
    // El icono y la etiqueta comparten fila y el monto ocupa el ancho completo:
    // en móvil una fila horizontal dejaría muy poco espacio y truncaría cifras
    // como RD$156,750.
    <Card className={cn("p-4 md:p-5", className)}>
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl",
            tone === "positive" && "bg-success/10 text-success",
            tone === "negative" && "bg-destructive/10 text-destructive",
            tone === "default" && "bg-accent text-primary",
          )}
        >
          <Icon className="size-4.5" strokeWidth={2} />
        </span>
        <p className="min-w-0 text-xs font-medium leading-tight text-muted-foreground">
          {label}
        </p>
      </div>
      <p
        className={cn(
          "mt-2 text-lg font-bold tracking-tight tabular-nums md:text-xl",
          tone === "positive" && "text-success",
          tone === "negative" && "text-destructive",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
