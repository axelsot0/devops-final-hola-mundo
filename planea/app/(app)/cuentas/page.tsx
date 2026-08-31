import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, MailCheck } from "lucide-react";

import { requireUser } from "@/lib/auth-helpers";
import { listAccounts } from "@/modules/accounts/service";
import { listBanks } from "@/modules/banks/service";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { AccountCard } from "./account-card";
import { ConnectAccountDialog } from "./connect-account-dialog";

export const metadata: Metadata = { title: "Cuentas conectadas · Planea" };

const GMAIL_STATUS: Record<string, { tone: string; message: string }> = {
  authorized: {
    tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
    message: "Gmail autorizado. Ya puedes sincronizar la cuenta.",
  },
  "missing-refresh-token": {
    tone: "border-amber-200 bg-amber-50 text-amber-900",
    message:
      "Google no devolvió refresh token. Intenta autorizar de nuevo; si ya habías aprobado la app, revoca el acceso previo y repite el flujo.",
  },
  "missing-code": {
    tone: "border-destructive/30 bg-destructive/10 text-destructive",
    message: "Google no devolvió el código de autorización.",
  },
  "state-error": {
    tone: "border-destructive/30 bg-destructive/10 text-destructive",
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
        <Button asChild variant="outline">
          <Link href="/api/gmail/oauth/start">
            <MailCheck className="size-4" />
            Autorizar Gmail
          </Link>
        </Button>
        <ConnectAccountDialog banks={banks} />
      </PageHeader>

      {gmailStatus && (
        <p className={`mb-4 rounded-lg border px-4 py-3 text-sm ${gmailStatus.tone}`}>
          {gmailStatus.message}
        </p>
      )}

      {accounts.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Aún no has conectado ninguna cuenta"
          description="Conecta el correo donde recibes las notificaciones de tu banco para comenzar a organizar tus finanzas."
        >
          <ConnectAccountDialog banks={banks} />
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
