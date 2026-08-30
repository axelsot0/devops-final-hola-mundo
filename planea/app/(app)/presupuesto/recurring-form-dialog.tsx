"use client";

import {
  createRecurringPaymentAction,
  updateRecurringPaymentAction,
} from "@/modules/recurring-payments/actions";
import {
  PERIODICITY_LABEL,
  type RecurringPaymentDTO,
} from "@/modules/recurring-payments/service";
import type { CategoryDTO } from "@/modules/categories/service";
import type { AccountDTO } from "@/modules/accounts/service";
import { useDialogAction } from "@/lib/use-dialog-action";
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
import {
  FieldError,
  FormMessage,
  FormRow,
  SubmitButton,
} from "@/components/shared/form-bits";

interface RecurringFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryDTO[];
  accounts: Pick<AccountDTO, "id" | "nickname" | "bank">[];
  payment?: RecurringPaymentDTO | null;
}

export function RecurringFormDialog({
  open,
  onOpenChange,
  categories,
  accounts,
  payment,
}: RecurringFormDialogProps) {
  const isEdit = Boolean(payment);
  const { state, formAction } = useDialogAction(
    isEdit ? updateRecurringPaymentAction : createRecurringPaymentAction,
    () => onOpenChange(false),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar pago recurrente" : "Nuevo pago recurrente"}
          </DialogTitle>
          <DialogDescription>
            Alquiler, suscripciones, préstamos… todo compromiso que se repite.
          </DialogDescription>
        </DialogHeader>
        <form key={payment?.id ?? "new"} action={formAction} className="flex flex-col gap-4">
          {!state.ok && <FormMessage state={state} />}
          {payment && <input type="hidden" name="paymentId" value={payment.id} />}

          <FormRow>
            <Label htmlFor="rp-name">Nombre</Label>
            <Input
              id="rp-name"
              name="name"
              defaultValue={payment?.name ?? ""}
              placeholder="Netflix, alquiler, seguro…"
              maxLength={60}
              required
            />
            <FieldError state={state} name="name" />
          </FormRow>

          <div className="grid grid-cols-2 gap-3">
            <FormRow>
              <Label htmlFor="rp-amount">Monto (RD$)</Label>
              <Input
                id="rp-amount"
                name="amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                defaultValue={payment?.amount ?? ""}
                placeholder="0.00"
                required
              />
              <FieldError state={state} name="amount" />
            </FormRow>
            <FormRow>
              <Label htmlFor="rp-periodicity">Periodicidad</Label>
              <Select
                name="periodicity"
                defaultValue={payment?.periodicity ?? "MONTHLY"}
              >
                <SelectTrigger id="rp-periodicity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PERIODICITY_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormRow>
              <Label htmlFor="rp-date">Próximo pago</Label>
              <Input
                id="rp-date"
                name="nextDueDate"
                type="date"
                defaultValue={
                  payment
                    ? new Date(payment.nextDueDate).toISOString().slice(0, 10)
                    : ""
                }
                required
              />
              <FieldError state={state} name="nextDueDate" />
            </FormRow>
            <FormRow>
              <Label htmlFor="rp-category">Categoría</Label>
              <Select
                name="categoryId"
                defaultValue={payment?.category?.id ?? undefined}
              >
                <SelectTrigger id="rp-category">
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
              <Label htmlFor="rp-account">Cuenta utilizada</Label>
              <Select
                name="accountId"
                defaultValue={payment?.accountId ?? undefined}
              >
                <SelectTrigger id="rp-account">
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

          <SubmitButton className="w-full">
            {isEdit ? "Guardar cambios" : "Crear pago"}
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
