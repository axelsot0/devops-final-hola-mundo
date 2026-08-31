"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth-helpers";
import { syncAccount } from "./service";

function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export async function syncAccountAction(accountId: string) {
  const userId = await requireUserId();

  try {
    const result = await syncAccount(userId, accountId);

    if (!result.ok) {
      revalidatePath("/cuentas");
      return {
        ok: false as const,
        error: result.error ?? "No se pudo sincronizar.",
        needsReauth: result.needsReauth ?? false,
      };
    }

    revalidatePath("/cuentas");
    revalidatePath("/");

    const parts = [
      pluralize(
        result.imported,
        "transacción nueva detectada",
        "transacciones nuevas detectadas",
      ),
    ];
    if (result.skipped > 0) {
      parts.push(pluralize(result.skipped, "ya registrada", "ya registradas"));
    }
    if (result.filtered > 0) {
      parts.push(
        pluralize(
          result.filtered,
          "correo no reconocido",
          "correos no reconocidos",
        ),
      );
    }

    return { ok: true as const, message: parts.join(" · ") };
  } catch (error) {
    console.error("[email-sync] Error sincronizando la cuenta:", error);
    revalidatePath("/cuentas");
    return {
      ok: false as const,
      error: "Ocurrió un error al sincronizar los correos de la cuenta.",
      needsReauth: false,
    };
  }
}
