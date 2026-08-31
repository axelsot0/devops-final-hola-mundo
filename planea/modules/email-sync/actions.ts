"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { syncAccount } from "./service";

/**
 * Margen entre sincronizaciones automáticas. El disparador vive en el
 * navegador (una vez por sesión), así que sin esta espera bastaría con abrir
 * la app en dos pestañas o en el móvil para llamar a Gmail de más.
 */
const AUTO_SYNC_COOLDOWN_MS = 10 * 60 * 1000;

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

/**
 * Sincroniza todas las cuentas autorizadas del usuario. La dispara la app al
 * entrar, una vez por sesión de navegador, para que las transacciones estén
 * al día sin que nadie tenga que pulsar nada.
 *
 * Las cuentas sincronizadas hace poco se saltan, y un fallo en una no
 * interrumpe a las demás: es un proceso de fondo, no una acción del usuario.
 */
export async function syncAllAccountsAction() {
  const userId = await requireUserId();

  const accounts = await db.account.findMany({
    where: {
      userId,
      credentialId: { not: null },
      credential: { revokedAt: null },
    },
    select: { id: true, lastSyncAt: true },
  });

  const now = Date.now();
  const pending = accounts.filter(
    (account) =>
      !account.lastSyncAt ||
      now - account.lastSyncAt.getTime() > AUTO_SYNC_COOLDOWN_MS,
  );

  if (pending.length === 0) {
    return { ok: true as const, sincronizadas: 0, importadas: 0, fallidas: 0 };
  }

  let importadas = 0;
  let fallidas = 0;

  for (const account of pending) {
    try {
      const result = await syncAccount(userId, account.id);
      if (result.ok) importadas += result.imported;
      else fallidas++;
    } catch (error) {
      console.error("[email-sync] Fallo en la sincronización automática:", error);
      fallidas++;
    }
  }

  revalidatePath("/cuentas");
  revalidatePath("/");

  return {
    ok: true as const,
    sincronizadas: pending.length,
    importadas,
    fallidas,
  };
}
