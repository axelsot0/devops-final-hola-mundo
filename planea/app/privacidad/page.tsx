import type { Metadata } from "next";
import Link from "next/link";

import { BrandLockup } from "@/components/brand";

export const metadata: Metadata = {
  title: "Política de privacidad · Planea",
  description:
    "Qué datos usa Planea, para qué los usa y cómo revocar el acceso a tu correo.",
};

/**
 * Página pública (sin sesión): Google la exige para publicar la pantalla de
 * consentimiento de OAuth, y describe exactamente lo que hace la app con el
 * acceso de solo lectura al correo.
 */
export default function PrivacyPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-4 py-12">
      <Link href="/login" aria-label="Planea">
        <BrandLockup />
      </Link>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            Política de privacidad
          </h1>
          <p>
            Planea organiza tus finanzas personales y grupales a partir de las
            notificaciones que tu banco te envía por correo.
          </p>
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            Qué datos tratamos
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-foreground">Tu cuenta:</strong> nombre,
              correo y una contraseña guardada como hash con bcrypt.
            </li>
            <li>
              <strong className="text-foreground">Correos bancarios:</strong> si
              autorizas Gmail, leemos únicamente los mensajes que coinciden con
              los remitentes y asuntos de la entidad bancaria que elegiste. De
              cada uno guardamos remitente, asunto, fecha y un extracto, junto a
              la transacción detectada (tipo, monto, moneda, comercio y fecha).
            </li>
            <li>
              <strong className="text-foreground">
                Autorización de Google:
              </strong>{" "}
              el token de actualización que Google emite, cifrado con AES-256-GCM
              antes de guardarse.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            Permisos de Google que solicitamos
          </h2>
          <p>
            Solo <code className="text-foreground">gmail.readonly</code>, que
            permite leer correos. Planea nunca envía, modifica ni elimina
            mensajes de tu buzón, y no lee los correos que no coinciden con las
            reglas del banco que conectaste.
          </p>
          <p>
            El uso que Planea hace de la información recibida de las APIs de
            Google se ajusta a la{" "}
            <a
              className="font-medium text-primary hover:underline"
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noreferrer"
            >
              Política de datos de usuario de los servicios de API de Google
            </a>
            , incluidos sus requisitos de uso limitado.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            Para qué los usamos
          </h2>
          <p>
            Para detectar tus transacciones, clasificarlas, calcular tu
            presupuesto y repartir los aportes de un plan de ahorro grupal. No
            vendemos datos, no hacemos publicidad y no los compartimos con
            terceros. Dentro de un grupo, tus montos solo se muestran si
            eliges compartirlos: en modo privado se ocultan antes de salir del
            servidor.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            Cómo revocar el acceso y borrar tus datos
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Desconecta la cuenta desde <em>Cuentas</em> en la app: eliminamos
              la autorización y los correos guardados de esa cuenta.
            </li>
            <li>
              Revoca el permiso en{" "}
              <a
                className="font-medium text-primary hover:underline"
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noreferrer"
              >
                tu cuenta de Google
              </a>
              . A partir de ese momento Planea deja de poder leer tu correo.
            </li>
            <li>
              Escríbenos para eliminar por completo tu cuenta y su historial.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">Contacto</h2>
          <p>
            Este es un proyecto académico. Para cualquier consulta sobre tus
            datos, escribe al correo de contacto indicado en la pantalla de
            consentimiento de Google.
          </p>
        </section>
      </div>

      <p className="text-xs text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Volver a Planea
        </Link>
      </p>
    </div>
  );
}
