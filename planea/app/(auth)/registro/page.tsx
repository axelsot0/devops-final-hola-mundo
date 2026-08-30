import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Crear cuenta · Planea" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const params = await searchParams;
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Crea tu cuenta</CardTitle>
        <CardDescription>
          Organiza tus finanzas y ahorra en grupo en minutos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm redirectTo={params.redirectTo} />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link
            href={
              params.redirectTo
                ? `/login?redirectTo=${encodeURIComponent(params.redirectTo)}`
                : "/login"
            }
            className="font-medium text-primary hover:underline"
          >
            Inicia sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
