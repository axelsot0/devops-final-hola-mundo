"use client";

import { useActionState, useEffect } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

import {
  changePasswordAction,
  logoutAction,
  updateProfileAction,
} from "@/modules/users/actions";
import { initialActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FieldError,
  FormMessage,
  FormRow,
  SubmitButton,
} from "@/components/shared/form-bits";

export function ProfileForm({
  user,
}: {
  user: { name: string; email: string; image: string | null };
}) {
  const [state, formAction] = useActionState(updateProfileAction, initialActionState);

  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos personales</CardTitle>
        <CardDescription>Así te ven los miembros de tus grupos.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {!state.ok && <FormMessage state={state} />}
          <FormRow>
            <Label htmlFor="profile-name">Nombre</Label>
            <Input
              id="profile-name"
              name="name"
              defaultValue={user.name}
              required
            />
            <FieldError state={state} name="name" />
          </FormRow>
          <FormRow>
            <Label htmlFor="profile-email">Correo electrónico</Label>
            <Input
              id="profile-email"
              value={user.email}
              disabled
              readOnly
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              El correo de tu cuenta no se puede cambiar.
            </p>
          </FormRow>
          <FormRow>
            <Label htmlFor="profile-image">
              Foto de perfil{" "}
              <span className="font-normal text-muted-foreground">
                (URL, opcional)
              </span>
            </Label>
            <Input
              id="profile-image"
              name="image"
              type="url"
              defaultValue={user.image ?? ""}
              placeholder="https://…"
            />
            <FieldError state={state} name="image" />
          </FormRow>
          <SubmitButton className="w-full sm:w-fit">Guardar cambios</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

export function PasswordForm() {
  const [state, formAction] = useActionState(
    changePasswordAction,
    initialActionState,
  );

  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seguridad</CardTitle>
        <CardDescription>Cambia la contraseña de tu cuenta.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <form action={formAction} className="flex flex-col gap-4">
          {!state.ok && <FormMessage state={state} />}
          <FormRow>
            <Label htmlFor="current-password">Contraseña actual</Label>
            <Input
              id="current-password"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
            <FieldError state={state} name="currentPassword" />
          </FormRow>
          <FormRow>
            <Label htmlFor="new-password">Nueva contraseña</Label>
            <Input
              id="new-password"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <FieldError state={state} name="newPassword" />
          </FormRow>
          <SubmitButton className="w-full sm:w-fit">
            Actualizar contraseña
          </SubmitButton>
        </form>

        <div className="border-t pt-4">
          <form action={logoutAction}>
            <Button type="submit" variant="outline" className="w-full sm:w-fit">
              <LogOut /> Cerrar sesión
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
