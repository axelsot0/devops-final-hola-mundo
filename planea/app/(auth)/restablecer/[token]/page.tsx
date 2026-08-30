import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = { title: "Nueva contraseña · Planea" };

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Crea una nueva contraseña</CardTitle>
        <CardDescription>
          Escribe la nueva contraseña para tu cuenta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm token={token} />
      </CardContent>
    </Card>
  );
}
