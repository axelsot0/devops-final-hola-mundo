"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-destructive/30 bg-destructive/5 px-6 py-14 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-7" strokeWidth={1.8} />
      </span>
      <h2 className="mt-4 text-base font-semibold">Algo salió mal</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {error.message || "No pudimos cargar esta sección. Intenta de nuevo."}
      </p>
      <Button className="mt-5" onClick={reset}>
        <RefreshCw /> Reintentar
      </Button>
    </div>
  );
}
