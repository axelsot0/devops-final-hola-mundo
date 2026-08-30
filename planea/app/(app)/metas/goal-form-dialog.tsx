"use client";

import { createGoalAction, updateGoalAction } from "@/modules/savings-goals/actions";
import type { SavingsGoalDTO } from "@/modules/savings-goals/service";
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
import { Textarea } from "@/components/ui/textarea";
import {
  FieldError,
  FormMessage,
  FormRow,
  SubmitButton,
} from "@/components/shared/form-bits";

interface GoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: SavingsGoalDTO | null;
}

export function GoalFormDialog({ open, onOpenChange, goal }: GoalFormDialogProps) {
  const isEdit = Boolean(goal);
  const { state, formAction } = useDialogAction(
    isEdit ? updateGoalAction : createGoalAction,
    () => onOpenChange(false),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar meta" : "Nueva meta de ahorro"}</DialogTitle>
          <DialogDescription>
            Un viaje, una computadora, un fondo de emergencia… define hacia dónde
            va tu ahorro.
          </DialogDescription>
        </DialogHeader>
        <form key={goal?.id ?? "new"} action={formAction} className="flex flex-col gap-4">
          {!state.ok && <FormMessage state={state} />}
          {goal && <input type="hidden" name="goalId" value={goal.id} />}

          <FormRow>
            <Label htmlFor="goal-name">Nombre</Label>
            <Input
              id="goal-name"
              name="name"
              defaultValue={goal?.name ?? ""}
              placeholder="Viaje a Japón"
              maxLength={60}
              required
            />
            <FieldError state={state} name="name" />
          </FormRow>

          <FormRow>
            <Label htmlFor="goal-description">
              Descripción{" "}
              <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="goal-description"
              name="description"
              defaultValue={goal?.description ?? ""}
              placeholder="¿Para qué es esta meta?"
              maxLength={200}
            />
          </FormRow>

          <div className="grid grid-cols-2 gap-3">
            <FormRow>
              <Label htmlFor="goal-target">Cantidad objetivo (RD$)</Label>
              <Input
                id="goal-target"
                name="targetAmount"
                type="number"
                inputMode="decimal"
                min="1"
                step="1"
                defaultValue={goal?.targetAmount ?? ""}
                placeholder="150000"
                required
              />
              <FieldError state={state} name="targetAmount" />
            </FormRow>
            <FormRow>
              <Label htmlFor="goal-saved">Ya ahorrado (RD$)</Label>
              <Input
                id="goal-saved"
                name="savedAmount"
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                defaultValue={goal?.savedAmount ?? 0}
                required
              />
              <FieldError state={state} name="savedAmount" />
            </FormRow>
          </div>

          <FormRow>
            <Label htmlFor="goal-date">
              Fecha objetivo{" "}
              <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="goal-date"
              name="targetDate"
              type="date"
              defaultValue={
                goal?.targetDate
                  ? new Date(goal.targetDate).toISOString().slice(0, 10)
                  : ""
              }
            />
            <FieldError state={state} name="targetDate" />
          </FormRow>

          <SubmitButton className="w-full">
            {isEdit ? "Guardar cambios" : "Crear meta"}
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
