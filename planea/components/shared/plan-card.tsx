import Link from "next/link";
import { CalendarDays, CheckCircle2 } from "lucide-react";

import type { GroupPlanDTO } from "@/modules/group-plans/service";
import { formatDate, formatMoney } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

/** Tarjeta resumida de un plan grupal, usada en la lista y en la vista de grupo. */
export function PlanCard({
  plan,
  showGroupName = false,
}: {
  plan: GroupPlanDTO;
  showGroupName?: boolean;
}) {
  const completed = plan.status === "COMPLETED";
  return (
    <Link href={`/plan/${plan.id}`} className="group block">
      <Card className="h-full p-4 transition-colors hover:border-primary/40 hover:bg-accent/40">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold leading-tight">{plan.name}</h3>
            {showGroupName && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {plan.groupName}
              </p>
            )}
          </div>
          {completed ? (
            <Badge variant="success" className="shrink-0">
              <CheckCircle2 /> Completado
            </Badge>
          ) : (
            <Badge variant="secondary" className="shrink-0">
              Activo
            </Badge>
          )}
        </div>

        <div className="mt-3">
          <Progress
            value={plan.percentage}
            indicatorClassName={completed ? "bg-success" : undefined}
          />
          <div className="mt-2 flex items-baseline justify-between text-sm">
            <span className="font-semibold tabular-nums">
              {formatMoney(plan.totalContributed)}
            </span>
            <span className="text-muted-foreground tabular-nums">
              de {formatMoney(plan.targetAmount)}
            </span>
          </div>
        </div>

        <p className="mt-2 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {formatDate(plan.targetDate)}
          </span>
          <span>
            {plan.members.length}{" "}
            {plan.members.length === 1 ? "participante" : "participantes"}
          </span>
        </p>
      </Card>
    </Link>
  );
}
