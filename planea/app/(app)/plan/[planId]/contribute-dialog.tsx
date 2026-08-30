"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import {
  addContributionAction,
  recalculatePlanAction,
} from "@/modules/group-plans/actions";
import { useDialogAction } from "@/lib/use-dialog-action";
import { formatMoney } from "@/lib/utils";
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
  FieldError,
  FormMessage,
  FormRow,
  SubmitButton,
} from "@/components/shared/form-bits";

export function PlanActions({
  planId,
  suggestedAmount,
  canContribute,
}: {
  planId: string;
  suggestedAmount: number;
  canContribute: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [recalculating, startRecalculate] = useTransition();
  const { state, formAction } = useDialogAction(addContributionAction, () =>
    setOpen(false),
  );

  function handleRecalculate() {
    startRecalculate(async () => {
      const result = await recalculatePlanAction(planId);
      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canContribute && (
        <Button onClick={() => setOpen(true)}>
          <Plus /> Registrar aporte
        </Button>
      )}
      <Button
        variant="outline"
        onClick={handleRecalculate}
        disabled={recalculating}
      >
        {recalculating ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        Recalcular
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar aporte</DialogTitle>
            <DialogDescription>
              Tu aporte mensual recomendado es {formatMoney(suggestedAmount)}.
            </DialogDescription>
          </DialogHeader>
          <form action={formAction} className="flex flex-col gap-4">
            {!state.ok && <FormMessage state={state} />}
            <input type="hidden" name="planId" value={planId} />
            <FormRow>
              <Label htmlFor="contribution-amount">Monto (RD$)</Label>
              <Input
                id="contribution-amount"
                name="amount"
                type="number"
                inputMode="decimal"
                min="1"
                step="1"
                defaultValue={suggestedAmount || ""}
                required
                autoFocus
              />
              <FieldError state={state} name="amount" />
            </FormRow>
            <FormRow>
              <Label htmlFor="contribution-note">
                Nota{" "}
                <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="contribution-note"
                name="note"
                placeholder="Aporte de este mes"
                maxLength={120}
              />
            </FormRow>
            <SubmitButton className="w-full">Guardar aporte</SubmitButton>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
