"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface ConfirmButtonProps {
  title: string;
  description: string;
  confirmLabel?: string;
  /** Server action a ejecutar al confirmar. Puede devolver {error} */
  action: () => Promise<{ ok: boolean; error?: string; message?: string } | void>;
  children: React.ReactNode;
  variant?: "destructive" | "default";
}

/** Botón con diálogo de confirmación para acciones destructivas. */
export function ConfirmButton({
  title,
  description,
  confirmLabel = "Eliminar",
  action,
  children,
  variant = "destructive",
}: ConfirmButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await action();
      if (result && !result.ok && result.error) {
        toast.error(result.error);
      } else {
        if (result?.message) toast.success(result.message);
        setOpen(false);
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <Button variant={variant} onClick={handleConfirm} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
