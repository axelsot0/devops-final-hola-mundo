"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { forgotPasswordAction } from "@/modules/users/actions";
import { initialActionState } from "@/lib/action-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FieldError,
  FormMessage,
  FormRow,
  SubmitButton,
} from "@/components/shared/form-bits";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(
    forgotPasswordAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormMessage state={state} />
      {state.ok && state.data?.resetUrl && (
        <div className="rounded-lg border border-primary/30 bg-accent px-3 py-3 text-sm">
          <p className="font-medium text-accent-foreground">
            Modo demostración: sin servicio de correo configurado, usa este
            enlace para continuar.
          </p>
          <Link
            href={state.data.resetUrl}
            className="mt-1.5 inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            Restablecer contraseña <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}
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
      <SubmitButton size="lg" className="mt-2 w-full">
        Enviar enlace
      </SubmitButton>
    </form>
  );
}
