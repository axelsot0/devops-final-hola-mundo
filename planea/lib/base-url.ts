import { headers } from "next/headers";

/**
 * Origen público de la aplicación (p. ej. https://planea.vercel.app),
 * resuelto en el servidor a partir de la petición. Se usa para armar links
 * de invitación completos sin depender de `window` en el cliente.
 */
export async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocol =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}
