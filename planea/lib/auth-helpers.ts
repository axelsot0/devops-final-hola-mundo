import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

/**
 * Obtiene el usuario autenticado o redirige a /login.
 * Úsalo en páginas y layouts protegidos.
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    image: session.user.image ?? null,
  };
}

/**
 * Igual que requireUser pero para server actions: lanza en lugar de redirigir,
 * de modo que ningún action pueda ejecutarse sin sesión válida.
 */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  return session.user.id;
}
