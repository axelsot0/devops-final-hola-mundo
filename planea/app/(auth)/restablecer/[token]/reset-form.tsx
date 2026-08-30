"use client";

import { useActionState } from "react";

import { resetPasswordAction } from "@/modules/users/actions";
import { initialActionState } from "@/lib/action-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FieldError,
  FormMessage,
  FormRow,
  SubmitButton,
} from "@/components/shared/form-bits";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(
    resetPasswordAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <input type="hidden" name="token" value={token} />
      <FormRow>
        <Label htmlFor="password">Nueva contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          required
          minLength={8}
        />
        <FieldError state={state} name="password" />
      </FormRow>
      <SubmitButton size="lg" className="mt-2 w-full">
        Guardar contraseña
      </SubmitButton>
    </form>
  );
}
