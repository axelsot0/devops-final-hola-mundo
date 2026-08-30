import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ForgotPasswordForm } from "./forgot-form";

export const metadata: Metadata = { title: "Recuperar contraseña · Planea" };

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Recupera tu contraseña</CardTitle>
        <CardDescription>
          Te generaremos un enlace para crear una nueva contraseña.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Volver a iniciar sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
