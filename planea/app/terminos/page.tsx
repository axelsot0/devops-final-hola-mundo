import type { Metadata } from "next";
import Link from "next/link";

import { BrandLockup } from "@/components/brand";

export const metadata: Metadata = {
  title: "Condiciones del servicio · Planea",
  description:
    "Condiciones de uso de Planea: qué ofrece, qué no garantiza y cómo cerrar tu cuenta.",
};

/**
 * Página pública (sin sesión), como /privacidad: la pantalla de
 * consentimiento de Google pide un enlace a las condiciones del servicio.
 */
export default function TermsPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-4 py-12">
      <Link href="/login" aria-label="Planea">
        <BrandLockup />
      </Link>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            Condiciones del servicio
          </h1>
          <p>
            Al crear una cuenta en Planea aceptas estas condiciones. Si no estás
            de acuerdo, no uses el servicio.
          </p>
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            Qué es Planea
          </h2>
          <p>
            Una aplicación que organiza tus finanzas personales y grupales a
            partir de las notificaciones que tu banco te envía por correo.
            Detecta transacciones, las clasifica, propone un presupuesto y
            reparte los aportes de un plan de ahorro compartido.
          </p>
          <p>
            Es un <strong className="text-foreground">proyecto académico</strong>
            , sin ánimo de lucro y sin garantía de disponibilidad. Puede
            interrumpirse o dejar de existir sin aviso.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            No es asesoría financiera
          </h2>
          <p>
            Los presupuestos, repartos y sugerencias son cálculos automáticos
            sobre los datos que detectamos. No constituyen asesoría financiera,
            contable ni legal, y pueden contener errores: la detección de
            transacciones depende del formato de los correos de cada banco.
            Verifica siempre contra tus estados de cuenta antes de tomar una
            decisión con dinero.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">Tu cuenta</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Eres responsable de tu contraseña y de la actividad de tu cuenta.
            </li>
            <li>
              Solo puedes conectar buzones de correo que te pertenezcan. La
              autorización se hace con tu propia cuenta de Google.
            </li>
            <li>
              No intentes acceder a los datos de otras personas ni interferir
              con el funcionamiento del servicio.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            Tus datos y cómo salir
          </h2>
          <p>
            El tratamiento de tus datos se describe en la{" "}
            <Link
              href="/privacidad"
              className="font-medium text-primary hover:underline"
            >
              Política de privacidad
            </Link>
            . Puedes desconectar tu correo desde <em>Cuentas</em> o revocar el
            permiso en{" "}
            <a
              className="font-medium text-primary hover:underline"
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noreferrer"
            >
              tu cuenta de Google
            </a>{" "}
            en cualquier momento, sin dar explicaciones.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            Límite de responsabilidad
          </h2>
          <p>
            El servicio se ofrece «tal cual». En la medida que permita la ley,
            no respondemos por pérdidas derivadas de su uso, de datos mal
            detectados o de interrupciones del servicio.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">Contacto</h2>
          <p>
            Para cualquier consulta, escribe al correo de contacto indicado en
            la pantalla de consentimiento de Google.
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
