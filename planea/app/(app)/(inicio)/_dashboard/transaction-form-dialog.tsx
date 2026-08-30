"use client";

import {
  createTransactionAction,
  deleteTransactionAction,
  updateTransactionAction,
} from "@/modules/transactions/actions";
import type { TransactionDTO } from "@/modules/transactions/service";
import type { CategoryDTO } from "@/modules/categories/service";
import type { AccountDTO } from "@/modules/accounts/service";
import { useDialogAction } from "@/lib/use-dialog-action";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmButton } from "@/components/shared/confirm-button";
import {
  FieldError,
  FormMessage,
  FormRow,
  SubmitButton,
} from "@/components/shared/form-bits";

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryDTO[];
  accounts: Pick<AccountDTO, "id" | "nickname" | "bank">[];
  /** Si se pasa, el diálogo edita; si no, crea. */
  transaction?: TransactionDTO | null;
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  categories,
  accounts,
  transaction,
}: TransactionFormDialogProps) {
  const isEdit = Boolean(transaction);
  const { state, formAction } = useDialogAction(
    isEdit ? updateTransactionAction : createTransactionAction,
    () => onOpenChange(false),
  );

  const dateValue = transaction
    ? new Date(transaction.date).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar transacción" : "Nueva transacción"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? transaction?.source === "EMAIL"
                ? "Esta transacción fue detectada desde un correo bancario; puedes ajustar cualquier dato."
                : "Modifica los datos del movimiento."
              : "Registra un ingreso o gasto manualmente."}
          </DialogDescription>
        </DialogHeader>
        <form key={transaction?.id ?? "new"} action={formAction} className="flex flex-col gap-4">
          {!state.ok && <FormMessage state={state} />}
          {transaction && (
            <input type="hidden" name="transactionId" value={transaction.id} />
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormRow>
              <Label htmlFor="tx-type">Tipo</Label>
              <Select name="type" defaultValue={transaction?.type ?? "EXPENSE"}>
                <SelectTrigger id="tx-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPENSE">Gasto</SelectItem>
                  <SelectItem value="INCOME">Ingreso</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow>
              <Label htmlFor="tx-amount">Monto (RD$)</Label>
              <Input
                id="tx-amount"
                name="amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                defaultValue={transaction?.amount ?? ""}
                placeholder="0.00"
                required
              />
              <FieldError state={state} name="amount" />
            </FormRow>
          </div>

          <FormRow>
            <Label htmlFor="tx-merchant">Comercio</Label>
            <Input
              id="tx-merchant"
              name="merchant"
              defaultValue={transaction?.merchant ?? ""}
              placeholder="Supermercado, empresa, persona…"
              maxLength={80}
            />
          </FormRow>

          <FormRow>
            <Label htmlFor="tx-description">Descripción</Label>
            <Input
              id="tx-description"
              name="description"
              defaultValue={transaction?.description ?? ""}
              placeholder="Detalle opcional"
              maxLength={200}
            />
          </FormRow>

          <div className="grid grid-cols-2 gap-3">
            <FormRow>
              <Label htmlFor="tx-date">Fecha</Label>
              <Input
                id="tx-date"
                name="date"
                type="date"
                defaultValue={dateValue}
                required
              />
              <FieldError state={state} name="date" />
            </FormRow>
            <FormRow>
              <Label htmlFor="tx-category">Categoría</Label>
              <Select
                name="categoryId"
                defaultValue={transaction?.category?.id ?? undefined}
              >
                <SelectTrigger id="tx-category">
                  <SelectValue placeholder="Sin categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>
          </div>

          {accounts.length > 0 && (
            <FormRow>
              <Label htmlFor="tx-account">Cuenta</Label>
              <Select
                name="accountId"
                defaultValue={transaction?.account?.id ?? undefined}
              >
                <SelectTrigger id="tx-account">
                  <SelectValue placeholder="Sin cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nickname || a.bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>
          )}

          <div className="flex items-center gap-2">
            {isEdit && transaction && (
              <ConfirmButton
                title="¿Eliminar esta transacción?"
                description="Esta acción no se puede deshacer."
                action={async () => {
                  const result = await deleteTransactionAction(transaction.id);
                  if (result.ok) onOpenChange(false);
                  return result;
                }}
              >
                <Button type="button" variant="outline" className="text-destructive">
                  Eliminar
                </Button>
              </ConfirmButton>
            )}
            <SubmitButton className="flex-1">
              {isEdit ? "Guardar cambios" : "Registrar"}
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
