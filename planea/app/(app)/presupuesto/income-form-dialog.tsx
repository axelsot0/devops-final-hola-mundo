"use client";

import {
  createRecurringIncomeAction,
  updateRecurringIncomeAction,
} from "@/modules/recurring-incomes/actions";
import type { RecurringIncomeDTO } from "@/modules/recurring-incomes/service";
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

interface IncomeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryDTO[];
  accounts: Pick<AccountDTO, "id" | "nickname" | "bank">[];
  income?: RecurringIncomeDTO | null;
}

export function IncomeFormDialog({
  open,
  onOpenChange,
  categories,
  accounts,
  income,
}: IncomeFormDialogProps) {
  const isEdit = Boolean(income);
  const { state, formAction } = useDialogAction(
    isEdit ? updateRecurringIncomeAction : createRecurringIncomeAction,
    () => onOpenChange(false),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar ingreso recurrente" : "Nuevo ingreso recurrente"}
          </DialogTitle>
          <DialogDescription>
            Sueldo, quincena, alquiler que cobras… lo que entra cada mes en
            días conocidos. Planea lo anotará solo cuando llegue el día.
          </DialogDescription>
        </DialogHeader>
        <form
          key={income?.id ?? "new"}
          action={formAction}
          className="flex flex-col gap-4"
        >
          {!state.ok && <FormMessage state={state} />}
          {income && <input type="hidden" name="incomeId" value={income.id} />}

          <FormRow>
            <Label htmlFor="ri-name">Nombre</Label>
            <Input
              id="ri-name"
              name="name"
              defaultValue={income?.name ?? ""}
              placeholder="Sueldo, quincena, alquiler…"
              maxLength={60}
              required
            />
            <FieldError state={state} name="name" />
          </FormRow>

          <div className="grid grid-cols-2 gap-3">
            <FormRow>
              <Label htmlFor="ri-amount">Monto (RD$)</Label>
              <Input
                id="ri-amount"
                name="amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                defaultValue={income?.amount ?? ""}
                placeholder="0.00"
                required
              />
              <FieldError state={state} name="amount" />
            </FormRow>
            <FormRow>
              <Label htmlFor="ri-days">Días del mes</Label>
              <Input
                id="ri-days"
                name="daysOfMonth"
                defaultValue={income?.daysOfMonth.join(", ") ?? ""}
                placeholder="15, 30"
                inputMode="numeric"
                required
              />
              <FieldError state={state} name="daysOfMonth" />
            </FormRow>
          </div>

          <p className="rounded-lg bg-accent px-3 py-2 text-xs text-accent-foreground">
            Separa los días con comas. Si cobras quincenal, escribe{" "}
            <strong>15, 30</strong>. En los meses que no llegan a ese día
            —febrero y el 30— se anota el último día del mes.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <FormRow>
              <Label htmlFor="ri-account">Cuenta donde cae</Label>
              <Select
                name="accountId"
                defaultValue={income?.account?.id ?? undefined}
              >
                <SelectTrigger id="ri-account">
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
            <FormRow>
              <Label htmlFor="ri-category">Categoría</Label>
              <Select
                name="categoryId"
                defaultValue={income?.category?.id ?? undefined}
              >
                <SelectTrigger id="ri-category">
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

          <SubmitButton className="w-full">
            {isEdit ? "Guardar cambios" : "Crear ingreso"}
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
