"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { initialActionState, type ActionState } from "@/lib/action-state";

type ServerAction = (
  prev: ActionState,
  formData: FormData,
) => Promise<ActionState>;

/**
 * Ejecuta un server action desde un formulario que vive dentro de un diálogo.
 *
 * Al terminar con éxito muestra el mensaje y ejecuta `onSuccess` (normalmente
 * cerrar el diálogo) en la misma continuación del action, sin un efecto que
 * observe el estado: así no se dispara un render en cascada.
 */
export function useDialogAction(action: ServerAction, onSuccess?: () => void) {
  const [state, setState] = useState<ActionState>(initialActionState);
  const [pending, startTransition] = useTransition();

  function formAction(formData: FormData) {
    startTransition(async () => {
      const result = await action(initialActionState, formData);
      setState(result);
      if (result.ok) {
        if (result.message) toast.success(result.message);
        onSuccess?.();
      }
    });
  }

  return { state, formAction, pending };
}
