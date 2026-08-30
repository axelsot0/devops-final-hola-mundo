import type { Metadata } from "next";
import { Inbox } from "lucide-react";

import { requireUser } from "@/lib/auth-helpers";
import { listAccounts } from "@/modules/accounts/service";
import { listBanks } from "@/modules/banks/service";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AccountCard } from "./account-card";
import { ConnectAccountDialog } from "./connect-account-dialog";

export const metadata: Metadata = { title: "Cuentas conectadas · Planea" };

export default async function AccountsPage() {
  const user = await requireUser();
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
        <ConnectAccountDialog banks={banks} />
      </PageHeader>

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
