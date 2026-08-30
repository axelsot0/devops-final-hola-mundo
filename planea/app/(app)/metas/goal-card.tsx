"use client";

import { useState } from "react";
import { CalendarDays, CheckCircle2, Pencil, Plus, Trash2 } from "lucide-react";

import {
  contributeGoalAction,
  deleteGoalAction,
} from "@/modules/savings-goals/actions";
import type { SavingsGoalDTO } from "@/modules/savings-goals/service";
import { useDialogAction } from "@/lib/use-dialog-action";
import { formatDate, formatMoney } from "@/lib/utils";
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
import { Progress } from "@/components/ui/progress";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { ProgressRing } from "@/components/shared/progress-ring";
import {
  FieldError,
  FormMessage,
  FormRow,
  SubmitButton,
} from "@/components/shared/form-bits";
import { GoalFormDialog } from "./goal-form-dialog";

export function GoalCard({ goal }: { goal: SavingsGoalDTO }) {
  const [editOpen, setEditOpen] = useState(false);
  const [contributeOpen, setContributeOpen] = useState(false);
  const { state, formAction } = useDialogAction(contributeGoalAction, () =>
    setContributeOpen(false),
  );

  const completed = goal.status === "COMPLETED";
  const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start gap-4">
        <ProgressRing value={goal.percentage} size={68} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-semibold leading-tight">{goal.name}</h3>
            {completed && (
              <Badge variant="success">
                <CheckCircle2 /> Lograda
              </Badge>
            )}
          </div>
          {goal.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {goal.description}
            </p>
          )}
          {goal.targetDate && (
            <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" />
              {formatDate(goal.targetDate)}
            </p>
          )}
        </div>
      </div>

      <div>
        <Progress
          value={goal.percentage}
          indicatorClassName={completed ? "bg-success" : undefined}
        />
        <div className="mt-2 flex items-baseline justify-between text-sm">
          <span className="font-semibold tabular-nums">
            {formatMoney(goal.savedAmount)}
          </span>
          <span className="text-muted-foreground tabular-nums">
            de {formatMoney(goal.targetAmount)}
          </span>
        </div>
      </div>

      {!completed && (
        <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          Te faltan <strong className="text-foreground">{formatMoney(remaining)}</strong>
          {goal.monthlyNeeded !== null && (
            <>
              {" "}· ahorra{" "}
              <strong className="text-foreground">
                {formatMoney(goal.monthlyNeeded)}
              </strong>{" "}
              al mes para llegar a tiempo
            </>
          )}
          .
        </p>
      )}

      <div className="mt-auto flex items-center gap-2">
        {!completed && (
          <Button size="sm" className="flex-1" onClick={() => setContributeOpen(true)}>
            <Plus /> Aportar
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className={completed ? "flex-1" : undefined}
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="size-4" />
          {completed && "Editar"}
        </Button>
        <ConfirmButton
          title={`¿Eliminar "${goal.name}"?`}
          description="Se perderá el registro de esta meta y su progreso. Esta acción no se puede deshacer."
          action={() => deleteGoalAction(goal.id)}
        >
          <Button size="sm" variant="outline" aria-label="Eliminar meta">
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </ConfirmButton>
      </div>

      <GoalFormDialog open={editOpen} onOpenChange={setEditOpen} goal={goal} />

      <Dialog open={contributeOpen} onOpenChange={setContributeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Aportar a &ldquo;{goal.name}&rdquo;</DialogTitle>
            <DialogDescription>
              Suma lo que ahorraste. Te faltan {formatMoney(remaining)}.
            </DialogDescription>
          </DialogHeader>
          <form action={formAction} className="flex flex-col gap-4">
            {!state.ok && <FormMessage state={state} />}
            <input type="hidden" name="goalId" value={goal.id} />
            <FormRow>
              <Label htmlFor={`amount-${goal.id}`}>Monto (RD$)</Label>
              <Input
                id={`amount-${goal.id}`}
                name="amount"
                type="number"
                inputMode="decimal"
                min="1"
                step="1"
                placeholder="5000"
                required
                autoFocus
              />
              <FieldError state={state} name="amount" />
            </FormRow>
            <SubmitButton className="w-full">Registrar aporte</SubmitButton>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
