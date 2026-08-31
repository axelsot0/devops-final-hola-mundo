"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import {
  deleteRecurringIncomeAction,
  toggleRecurringIncomeAction,
} from "@/modules/recurring-incomes/actions";
import type { RecurringIncomeDTO } from "@/modules/recurring-incomes/service";
import type { CategoryDTO } from "@/modules/categories/service";
import type { AccountDTO } from "@/modules/accounts/service";
import { formatMoney } from "@/lib/utils";
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
import { IncomeFormDialog } from "./income-form-dialog";

interface IncomesSectionProps {
  incomes: RecurringIncomeDTO[];
  categories: CategoryDTO[];
  accounts: AccountDTO[];
  monthlyTotal: number;
}

/** "15, 30" -> "los días 15 y 30"; un solo día no lleva conjunción. */
function describeDays(days: number[]) {
  if (days.length === 1) return `Día ${days[0]}`;
  return `Días ${days.slice(0, -1).join(", ")} y ${days.at(-1)}`;
}

export function IncomesSection({
  incomes,
  categories,
  accounts,
  monthlyTotal,
}: IncomesSectionProps) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<RecurringIncomeDTO | null>(null);
  const [, startToggle] = useTransition();

  function handleToggle(incomeId: string) {
    startToggle(async () => {
      const result = await toggleRecurringIncomeAction(incomeId);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Ingresos recurrentes</CardTitle>
          <CardDescription className="mt-1">
            {incomes.length > 0
              ? `Suman ${formatMoney(monthlyTotal)} al mes.`
              : "Lo que entra cada mes en días conocidos."}
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus /> Agregar
        </Button>
      </CardHeader>
      <CardContent>
        {incomes.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="Sin ingresos recurrentes"
            description="Registra tu sueldo o quincena y Planea lo anotará solo el día que toca, sin depender de que llegue un correo del banco."
          >
            <Button variant="secondary" onClick={() => setCreating(true)}>
              <Plus /> Agregar el primero
            </Button>
          </EmptyState>
        ) : (
          <ul className="divide-y divide-border/70">
            {incomes.map((income) => {
              const paused = income.status === "PAUSED";
              return (
                <li key={income.id} className="flex items-center gap-3 py-3">
                  <CategoryIcon
                    icon={income.category?.icon}
                    color={income.category?.color}
                    className={paused ? "opacity-40" : undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm font-medium ${paused ? "text-muted-foreground line-through" : ""}`}
                    >
                      {income.name}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span>{describeDays(income.daysOfMonth)}</span>
                      {income.account && (
                        <span>
                          ·{" "}
                          {income.account.nickname || income.account.bankName}
                        </span>
                      )}
                      {paused && <Badge variant="muted">Pausado</Badge>}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-success">
                    {formatMoney(income.amount)}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <Switch
                      checked={!paused}
                      onCheckedChange={() => handleToggle(income.id)}
                      aria-label={paused ? "Reactivar ingreso" : "Pausar ingreso"}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditing(income)}
                      aria-label="Editar ingreso"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <ConfirmButton
                      title={`¿Eliminar "${income.name}"?`}
                      description="Dejará de anotarse cada mes. Los ingresos ya registrados se conservan."
                      action={() => deleteRecurringIncomeAction(income.id)}
                    >
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Eliminar ingreso"
                      >
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

      <IncomeFormDialog
        open={creating}
        onOpenChange={setCreating}
        categories={categories}
        accounts={accounts}
      />
      <IncomeFormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        categories={categories}
        accounts={accounts}
        income={editing}
      />
    </Card>
  );
}
