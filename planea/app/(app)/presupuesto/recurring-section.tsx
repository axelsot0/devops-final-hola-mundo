"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteRecurringPaymentAction,
  toggleRecurringPaymentAction,
} from "@/modules/recurring-payments/actions";
import {
  PERIODICITY_LABEL,
  type RecurringPaymentDTO,
} from "@/modules/recurring-payments/service";
import type { CategoryDTO } from "@/modules/categories/service";
import type { AccountDTO } from "@/modules/accounts/service";
import { formatDateShort, formatMoney } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { CategoryIcon } from "@/components/shared/category-icon";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { EmptyState } from "@/components/shared/empty-state";
import { RecurringFormDialog } from "./recurring-form-dialog";

interface RecurringSectionProps {
  payments: RecurringPaymentDTO[];
  categories: CategoryDTO[];
  accounts: AccountDTO[];
  monthlyTotal: number;
}

export function RecurringSection({
  payments,
  categories,
  accounts,
  monthlyTotal,
}: RecurringSectionProps) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<RecurringPaymentDTO | null>(null);
  const [, startToggle] = useTransition();

  function handleToggle(paymentId: string) {
    startToggle(async () => {
      const result = await toggleRecurringPaymentAction(paymentId);
      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Pagos recurrentes</CardTitle>
          <CardDescription className="mt-1">
            {payments.length > 0
              ? `Equivalen a ${formatMoney(monthlyTotal)} al mes.`
              : "Compromisos que se repiten cada cierto tiempo."}
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus /> Agregar
        </Button>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Sin pagos recurrentes"
            description="Registra tu alquiler, suscripciones o préstamos para que el presupuesto los tome en cuenta."
          >
            <Button variant="secondary" onClick={() => setCreating(true)}>
              <Plus /> Agregar el primero
            </Button>
          </EmptyState>
        ) : (
          <ul className="divide-y divide-border/70">
            {payments.map((p) => {
              const paused = p.status === "PAUSED";
              return (
                <li
                  key={p.id}
                  className="flex items-center gap-3 py-3"
                >
                  <CategoryIcon
                    icon={p.category?.icon}
                    color={p.category?.color}
                    className={paused ? "opacity-40" : undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium ${paused ? "text-muted-foreground line-through" : ""}`}>
                      {p.name}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span>{PERIODICITY_LABEL[p.periodicity]}</span>
                      <span>· Próximo: {formatDateShort(p.nextDueDate)}</span>
                      {paused && <Badge variant="muted">Pausado</Badge>}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums">
                    {formatMoney(p.amount)}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <Switch
                      checked={!paused}
                      onCheckedChange={() => handleToggle(p.id)}
                      aria-label={paused ? "Reactivar pago" : "Pausar pago"}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditing(p)}
                      aria-label="Editar pago"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <ConfirmButton
                      title={`¿Eliminar "${p.name}"?`}
                      description="El pago recurrente se eliminará del presupuesto. Esta acción no se puede deshacer."
                      action={() => deleteRecurringPaymentAction(p.id)}
                    >
                      <Button size="icon" variant="ghost" aria-label="Eliminar pago">
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </ConfirmButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <RecurringFormDialog
        open={creating}
        onOpenChange={setCreating}
        categories={categories}
        accounts={accounts}
      />
      <RecurringFormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        categories={categories}
        accounts={accounts}
        payment={editing}
      />
    </Card>
  );
}
