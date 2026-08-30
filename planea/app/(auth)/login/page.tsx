import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión · Planea" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; reset?: string }>;
}) {
  const params = await searchParams;
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Bienvenido de nuevo</CardTitle>
        <CardDescription>
          Inicia sesión para ver tus finanzas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm redirectTo={params.redirectTo} resetDone={params.reset === "1"} />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿No tienes cuenta?{" "}
          <Link
            href={
              params.redirectTo
                ? `/registro?redirectTo=${encodeURIComponent(params.redirectTo)}`
                : "/registro"
            }
            className="font-medium text-primary hover:underline"
          >
            Regístrate gratis
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
