"use client";

import { useActionState } from "react";

import { registerAction } from "@/modules/users/actions";
import { initialActionState } from "@/lib/action-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FieldError,
  FormMessage,
  FormRow,
  SubmitButton,
} from "@/components/shared/form-bits";

export function RegisterForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction] = useActionState(registerAction, initialActionState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <input type="hidden" name="redirectTo" value={redirectTo ?? "/"} />
      <FormRow>
        <Label htmlFor="name">Nombre completo</Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          placeholder="María Pérez"
          required
        />
        <FieldError state={state} name="name" />
      </FormRow>
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
        <Label htmlFor="password">Contraseña</Label>
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
        Crear cuenta
      </SubmitButton>
    </form>
  );
}
