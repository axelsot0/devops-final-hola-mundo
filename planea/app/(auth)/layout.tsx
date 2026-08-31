import Link from "next/link";

import { BrandLockup } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      {/* Fondos decorativos suaves */}
      <div className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-secondary/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-32 size-96 rounded-full bg-primary/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/login" aria-label="Planea">
            <BrandLockup />
          </Link>
        </div>
        {children}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Tus finanzas personales y grupales, en un solo lugar.{" "}
          <Link href="/privacidad" className="hover:underline">
            Política de privacidad
          </Link>{" "}
          ·{" "}
          <Link href="/terminos" className="hover:underline">
            Condiciones del servicio
          </Link>
        </p>
      </div>
    </div>
  );
}
