"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Landmark, Loader2, MailWarning, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteAccountAction, updateAccountAction } from "@/modules/accounts/actions";
import { syncAccountAction } from "@/modules/email-sync/actions";
import type { AccountDTO } from "@/modules/accounts/service";
import { useDialogAction } from "@/lib/use-dialog-action";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { FormRow, SubmitButton } from "@/components/shared/form-bits";

const STATUS_LABEL: Record<AccountDTO["status"], { label: string; variant: "success" | "secondary" | "destructive" | "muted" }> = {
  CONNECTED: { label: "Conectada", variant: "success" },
  SYNCING: { label: "Sincronizando", variant: "secondary" },
  ERROR: { label: "Error", variant: "destructive" },
  DISCONNECTED: { label: "Desconectada", variant: "muted" },
};

export function AccountCard({ account }: { account: AccountDTO }) {
  const [syncing, startSync] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const { formAction: editFormAction } = useDialogAction(
    updateAccountAction,
    () => setEditOpen(false),
  );

  function handleSync() {
    startSync(async () => {
      const result = await syncAccountAction(account.id);
      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  }

  const status = STATUS_LABEL[account.status];
  // Sin autorización vigente sincronizar solo daría un error: la tarjeta
  // ofrece rehacer el permiso en su lugar.
  const reconnectHref = `/api/gmail/oauth/start?bankId=${account.bank.id}`;

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="flex size-11 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: account.bank.color ?? "#3E9B94" }}
          >
            <Landmark className="size-5" />
          </span>
          <div>
            <p className="font-semibold leading-tight">
              {account.nickname || account.bank.name}
            </p>
            <p className="text-sm text-muted-foreground">{account.bank.name}</p>
          </div>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      <div className="space-y-1 text-sm text-muted-foreground">
        <p className="truncate">
          <span className="font-medium text-foreground">Correo:</span> {account.email}
        </p>
        <p>
          <span className="font-medium text-foreground">Transacciones:</span>{" "}
          {account.transactionCount}
        </p>
        <p>
          <span className="font-medium text-foreground">Última sincronización:</span>{" "}
          {account.lastSyncAt ? formatDate(account.lastSyncAt) : "Nunca"}
        </p>
      </div>

      {!account.authorized && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <MailWarning className="mt-0.5 size-4 shrink-0" />
          Falta autorizar este buzón en Google para poder leer los correos.
        </p>
      )}

      <div className="mt-auto flex items-center gap-2">
        {account.authorized ? (
          <Button
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="flex-1"
          >
            {syncing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            {syncing ? "Sincronizando…" : "Sincronizar"}
          </Button>
        ) : (
          <Button size="sm" asChild className="flex-1">
            <Link href={reconnectHref}>
              <MailWarning className="size-4" />
              Conectar Gmail
            </Link>
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setEditOpen(true)}
          aria-label="Editar cuenta"
        >
          <Pencil className="size-4" />
        </Button>
        <ConfirmButton
          title="¿Desconectar esta cuenta?"
          description={`Se dejarán de detectar transacciones de ${account.bank.name}. Las transacciones ya registradas se conservan.`}
          confirmLabel="Desconectar"
          action={() => deleteAccountAction(account.id)}
        >
          <Button size="sm" variant="outline" aria-label="Desconectar cuenta">
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </ConfirmButton>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cuenta</DialogTitle>
            <DialogDescription>
              Cambia el nombre con el que identificas esta cuenta.
            </DialogDescription>
          </DialogHeader>
          <form action={editFormAction} className="flex flex-col gap-4">
            <input type="hidden" name="accountId" value={account.id} />
            <FormRow>
              <Label htmlFor={`nickname-${account.id}`}>Nombre personalizado</Label>
              <Input
                id={`nickname-${account.id}`}
                name="nickname"
                defaultValue={account.nickname ?? ""}
                placeholder="Cuenta principal"
                maxLength={50}
              />
            </FormRow>
            <SubmitButton className="w-full">Guardar</SubmitButton>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
