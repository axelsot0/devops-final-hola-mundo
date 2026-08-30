"use client";

import { useActionState } from "react";
import Link from "next/link";

import { loginAction } from "@/modules/users/actions";
import { initialActionState } from "@/lib/action-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FieldError,
  FormMessage,
  FormRow,
  SubmitButton,
} from "@/components/shared/form-bits";

export function LoginForm({
  redirectTo,
  resetDone,
}: {
  redirectTo?: string;
  resetDone?: boolean;
}) {
  const [state, formAction] = useActionState(loginAction, initialActionState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {resetDone && !state.error && (
        <div className="rounded-lg border border-success/30 bg-success/8 px-3 py-2.5 text-sm text-success">
          Contraseña actualizada. Inicia sesión con tu nueva contraseña.
        </div>
      )}
      <FormMessage state={state} />
      <input type="hidden" name="redirectTo" value={redirectTo ?? "/"} />
      <FormRow>
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          required
        />
        <FieldError state={state} name="email" />
      </FormRow>
      <FormRow>
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Contraseña</Label>
          <Link
            href="/recuperar"
            className="text-xs font-medium text-primary hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
        <FieldError state={state} name="password" />
      </FormRow>
      <SubmitButton size="lg" className="mt-2 w-full">
        Iniciar sesión
      </SubmitButton>
    </form>
  );
}
