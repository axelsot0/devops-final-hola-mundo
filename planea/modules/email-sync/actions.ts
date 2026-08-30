"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth-helpers";
import { syncAccount } from "./service";

export async function syncAccountAction(accountId: string) {
  const userId = await requireUserId();
  const result = await syncAccount(userId, accountId);

  if (!result.ok) {
    return { ok: false as const, error: result.error ?? "No se pudo sincronizar." };
  }

  revalidatePath("/cuentas");
  revalidatePath("/");

  const parts: string[] = [];
  parts.push(
    result.imported === 1
      ? "1 transacción nueva detectada"
      : `${result.imported} transacciones nuevas detectadas`,
  );
  if (result.skipped > 0) {
    parts.push(`${result.skipped} ya registradas (omitidas)`);
  }
  return { ok: true as const, message: parts.join(" · ") };
}
