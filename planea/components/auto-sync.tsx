"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { syncAllAccountsAction } from "@/modules/email-sync/actions";

/**
 * Sincroniza las cuentas al entrar en la app, una sola vez por sesión del
 * navegador. sessionStorage es justo el alcance que se pide: se limpia al
 * cerrar la pestaña, así que cada nueva sesión vuelve a sincronizar, y una
 * recarga no repite el trabajo.
 *
 * No bloquea nada: la pantalla se dibuja al momento y, si aparecen
 * transacciones, se refresca sola. El servidor impone además su propia
 * espera, porque este disparador es del cliente y no es de fiar.
 */
const STORAGE_KEY = "planea:auto-sync";

export function AutoSync() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
      sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // Navegación privada o almacenamiento bloqueado: seguimos adelante,
      // el margen del servidor evita sincronizar de más.
    }

    syncAllAccountsAction()
      .then((result) => {
        if (cancelled || !result.ok || result.importadas === 0) return;

        toast.success(
          result.importadas === 1
            ? "1 transacción nueva detectada en tu correo"
            : `${result.importadas} transacciones nuevas detectadas en tu correo`,
        );
        router.refresh();
      })
      .catch(() => {
        // Silencioso a propósito: el usuario no pidió esto y sigue teniendo
        // el botón de sincronizar en Cuentas si algo falla.
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
