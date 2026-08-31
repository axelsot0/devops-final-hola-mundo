import type { Metadata } from "next";
import { Inbox } from "lucide-react";

import { requireUser } from "@/lib/auth-helpers";
import { listAccounts } from "@/modules/accounts/service";
import { listBanks } from "@/modules/banks/service";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AccountCard } from "./account-card";
import { ConnectGmailDialog } from "./connect-gmail-dialog";

export const metadata: Metadata = { title: "Cuentas conectadas · Planea" };

/**
 * La sincronización se ejecuta en esta ruta (server action) y habla con la
 * API de Gmail: el límite por defecto de 10 s en Vercel la cortaría a mitad.
 */
export const maxDuration = 60;

const OK_TONE = "border-emerald-200 bg-emerald-50 text-emerald-900";
const WARN_TONE = "border-amber-200 bg-amber-50 text-amber-900";
const ERROR_TONE = "border-destructive/30 bg-destructive/10 text-destructive";

/** Resultado del regreso desde Google (?gmail=... lo pone /oauth2callback). */
const GMAIL_STATUS: Record<string, { tone: string; message: string }> = {
  connected: {
    tone: OK_TONE,
    message: "Gmail conectado. Ya puedes sincronizar la cuenta.",
  },
  denied: {
    tone: WARN_TONE,
    message:
      "No autorizaste el acceso. Sin el permiso de lectura no podemos detectar tus transacciones.",
  },
  "missing-refresh-token": {
    tone: WARN_TONE,
    message:
      "Google no devolvió el permiso permanente. Revoca el acceso a Planea en tu cuenta de Google y vuelve a intentarlo.",
  },
  "missing-bank": {
    tone: ERROR_TONE,
    message: "Elige una entidad bancaria antes de conectar el correo.",
  },
  "missing-code": {
    tone: ERROR_TONE,
    message: "Google no devolvió el código de autorización.",
  },
  "missing-email": {
    tone: ERROR_TONE,
    message: "No pudimos leer la dirección del buzón autorizado.",
  },
  "state-error": {
    tone: ERROR_TONE,
    message: "La autorización de Gmail expiró o no coincide. Intenta otra vez.",
  },
};

interface AccountsSearchParams {
  gmail?: string;
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<AccountsSearchParams>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const gmailStatus = params.gmail ? GMAIL_STATUS[params.gmail] : null;
  const [accounts, banks] = await Promise.all([
    listAccounts(user.id),
    listBanks(),
  ]);

  return (
    <>
      <PageHeader
        title="Cuentas conectadas"
        description="Fuentes desde donde detectamos tus transacciones automáticamente."
      >
        <ConnectGmailDialog banks={banks} />
      </PageHeader>

      {gmailStatus && (
        <p
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${gmailStatus.tone}`}
        >
          {gmailStatus.message}
        </p>
      )}

      {accounts.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Aún no has conectado ninguna cuenta"
          description="Conecta el Gmail donde recibes las notificaciones de tu banco para comenzar a organizar tus finanzas."
        >
          <ConnectGmailDialog banks={banks} />
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      )}
    </>
  );
}
