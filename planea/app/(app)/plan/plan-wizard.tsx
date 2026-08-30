"use client";

import { useActionState, useState } from "react";
import { CalendarDays, Info, Loader2, Sparkles, Users } from "lucide-react";

import {
  createPlanAction,
  previewAllocationAction,
} from "@/modules/group-plans/actions";
import type { AllocationResult } from "@/modules/group-plans/allocation";
import type { GroupSummaryDTO } from "@/modules/groups/service";
import { initialActionState } from "@/lib/action-state";
import { formatMoney, initials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  FieldError,
  FormMessage,
  FormRow,
  SubmitButton,
} from "@/components/shared/form-bits";

function defaultTargetDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().slice(0, 10);
}

export function PlanWizard({
  groups,
  defaultGroupId,
}: {
  groups: GroupSummaryDTO[];
  defaultGroupId?: string;
}) {
  const [groupId, setGroupId] = useState(defaultGroupId ?? groups[0]?.id ?? "");
  const [targetAmount, setTargetAmount] = useState("120000");
  const [targetDate, setTargetDate] = useState(defaultTargetDate);

  const [previewState, previewAction, previewPending] = useActionState(
    previewAllocationAction,
    { ok: false } as { ok: boolean; error?: string; result?: AllocationResult },
  );
  const [createState, createAction] = useActionState(
    createPlanAction,
    initialActionState,
  );

  const allocation = previewState.result;
  const selectedGroup = groups.find((g) => g.id === groupId);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      {/* Paso 1: parámetros del plan */}
      <Card>
        <CardHeader>
          <CardTitle>1. Define la meta del grupo</CardTitle>
          <CardDescription>
            Calcularemos cuánto debería aportar cada miembro según su capacidad
            financiera.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={previewAction} className="flex flex-col gap-4">
            {previewState.error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2.5 text-sm text-destructive">
                {previewState.error}
              </div>
            )}

            <FormRow>
              <Label htmlFor="plan-group">Grupo</Label>
              <Select name="groupId" value={groupId} onValueChange={setGroupId}>
                <SelectTrigger id="plan-group">
                  <SelectValue placeholder="Selecciona un grupo" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.emoji ?? "👥"} {g.name} · {g.memberCount}{" "}
                      {g.memberCount === 1 ? "miembro" : "miembros"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>

            <FormRow>
              <Label htmlFor="plan-amount">¿Cuánto quieren ahorrar? (RD$)</Label>
              <Input
                id="plan-amount"
                name="targetAmount"
                type="number"
                inputMode="decimal"
                min="1"
                step="1"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                required
              />
            </FormRow>

            <FormRow>
              <Label htmlFor="plan-date">Fecha objetivo</Label>
              <Input
                id="plan-date"
                name="targetDate"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                required
              />
            </FormRow>

            <Button type="submit" size="lg" disabled={previewPending}>
              {previewPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Sparkles />
              )}
              Calcular distribución
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Paso 2: distribución propuesta */}
      <Card>
        <CardHeader>
          <CardTitle>2. Distribución propuesta</CardTitle>
          <CardDescription>
            El aporte no se divide en partes iguales: es proporcional a la
            capacidad de ahorro de cada miembro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!allocation ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-input px-4 py-10 text-center">
              <Users className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Define la meta y calcula la distribución para ver la propuesta.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl bg-accent p-4">
                <p className="text-sm text-accent-foreground">
                  Para reunir{" "}
                  <strong>{formatMoney(Number(targetAmount) || 0)}</strong> en{" "}
                  <strong>
                    {allocation.months}{" "}
                    {allocation.months === 1 ? "mes" : "meses"}
                  </strong>
                  , el grupo debe ahorrar{" "}
                  <strong>{formatMoney(allocation.monthlyTarget)}</strong> cada
                  mes.
                </p>
                {!allocation.feasible && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-accent-foreground/90">
                    <Info className="mt-0.5 size-3.5 shrink-0" />
                    La capacidad de ahorro estimada del grupo se queda corta
                    frente a esa meta mensual. Considera ampliar el plazo o
                    reducir el monto.
                  </p>
                )}
              </div>

              <ul className="flex flex-col gap-3">
                {allocation.members.map((m) => (
                  <li key={m.userId} className="rounded-xl border border-border p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback>{initials(m.name)}</AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {m.name}
                      </span>
                      <span className="shrink-0 font-bold tabular-nums">
                        {formatMoney(m.recommendedMonthly)}
                        <span className="text-xs font-normal text-muted-foreground">
                          /mes
                        </span>
                      </span>
                    </div>
                    <Progress
                      value={Math.round(m.capacityShare * 100)}
                      className="mt-2 h-1.5"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      {m.rationale}
                    </p>
                  </li>
                ))}
              </ul>

              {/* Paso 3: nombrar y guardar el plan */}
              <form action={createAction} className="flex flex-col gap-3 border-t pt-4">
                {!createState.ok && <FormMessage state={createState} />}
                <input type="hidden" name="groupId" value={groupId} />
                <input type="hidden" name="targetAmount" value={targetAmount} />
                <input type="hidden" name="targetDate" value={targetDate} />

                <FormRow>
                  <Label htmlFor="plan-name">Nombre del plan</Label>
                  <Input
                    id="plan-name"
                    name="name"
                    placeholder={`Ahorro de ${selectedGroup?.name ?? "grupo"}`}
                    maxLength={60}
                    required
                  />
                  <FieldError state={createState} name="name" />
                </FormRow>

                <FormRow>
                  <Label htmlFor="plan-description">
                    Descripción{" "}
                    <span className="font-normal text-muted-foreground">
                      (opcional)
                    </span>
                  </Label>
                  <Textarea
                    id="plan-description"
                    name="description"
                    placeholder="¿Qué van a lograr con este ahorro?"
                    maxLength={200}
                  />
                </FormRow>

                <SubmitButton size="lg" className="w-full">
                  <CalendarDays /> Crear plan de ahorro
                </SubmitButton>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
