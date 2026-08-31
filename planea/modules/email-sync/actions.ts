"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth-helpers";
import { gmailEmailProvider } from "./gmail-provider";
import { syncAccount } from "./service";

export async function syncAccountAction(accountId: string) {
  try {
    const userId = await requireUserId();

    // IMPORTANTE:
    // Pasamos explícitamente Gmail para no utilizar mockEmailProvider.
    console.log("[action] gmailEmailProvider:", gmailEmailProvider);

    const result = await syncAccount(
      userId,
      accountId,
      gmailEmailProvider,
    );

    if (!result.ok) {
      return {
        ok: false as const,
        error: result.error ?? "No se pudo sincronizar.",
      };
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
      parts.push(
        `${result.skipped} ${
          result.skipped === 1
            ? "ya registrada (omitida)"
            : "ya registradas (omitidas)"
        }`,
      );
    }

    if (result.filtered > 0) {
      parts.push(
        `${result.filtered} ${
          result.filtered === 1
            ? "correo no reconocido"
            : "correos no reconocidos"
        }`,
      );
    }

    return {
      ok: true as const,
      message: parts.join(" · "),
      imported: result.imported,
      skipped: result.skipped,
      filtered: result.filtered,
    };
  } catch (error) {
    console.error("[syncAccountAction] Error sincronizando cuenta:", error);

    return {
      ok: false as const,
      error: "Ocurrió un error al sincronizar los correos de la cuenta.",
    };
  }
}
