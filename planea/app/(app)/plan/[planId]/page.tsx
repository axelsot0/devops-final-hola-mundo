import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Info,
  TrendingUp,
  Users,
} from "lucide-react";

import { requireUser } from "@/lib/auth-helpers";
import { getPlan } from "@/modules/group-plans/service";
import { formatDate, formatMoney, initials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ProgressRing } from "@/components/shared/progress-ring";
import { StatCard } from "@/components/shared/stat-card";
import { PlanActions } from "./contribute-dialog";

export const metadata: Metadata = { title: "Plan de ahorro · Planea" };

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const user = await requireUser();
  const { planId } = await params;

  const plan = await getPlan(user.id, planId);
  if (!plan) notFound();

  const me = plan.members.find((m) => m.userId === user.id);
  const completed = plan.status === "COMPLETED";
  const remaining = Math.max(0, plan.targetAmount - plan.totalContributed);

  return (
    <>
      <Link
        href={`/grupo/${plan.groupId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {plan.groupName}
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">
              {plan.name}
            </h1>
            {completed ? (
              <Badge variant="success">
                <CheckCircle2 /> Completado
              </Badge>
            ) : (
              <Badge variant="secondary">Activo</Badge>
            )}
          </div>
          {plan.description && (
            <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
          )}
        </div>
        <PlanActions
          planId={plan.id}
          suggestedAmount={me?.recommendedMonthly ?? 0}
          canContribute={Boolean(me) && !completed}
        />
      </div>

      {/* Progreso general */}
      <Card>
        <CardContent className="flex flex-col items-center gap-5 p-5 sm:flex-row sm:p-6">
          <ProgressRing value={plan.percentage} size={104} strokeWidth={9} />
          <div className="w-full min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-2xl font-bold tabular-nums">
                {formatMoney(plan.totalContributed)}
              </span>
              <span className="text-sm text-muted-foreground tabular-nums">
                de {formatMoney(plan.targetAmount)}
              </span>
            </div>
            <Progress
              value={plan.percentage}
              className="mt-2"
              indicatorClassName={completed ? "bg-success" : undefined}
            />
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" />
                Meta para {formatDate(plan.targetDate)}
              </span>
              {!completed && (
                <span>Faltan {formatMoney(remaining)}</span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="Meta mensual del grupo"
          value={formatMoney(plan.monthlyTarget)}
          icon={TrendingUp}
          hint={`En ${plan.months} ${plan.months === 1 ? "mes" : "meses"}`}
        />
        <StatCard
          label="Participantes"
          value={String(plan.members.length)}
          icon={Users}
        />
        {me && (
          <StatCard
            label="Tu aporte mensual"
            value={formatMoney(me.recommendedMonthly)}
            icon={CalendarDays}
            hint={`Has aportado ${formatMoney(me.contributed)}`}
            className="col-span-2 lg:col-span-1"
          />
        )}
      </div>

      {/* Aportes por miembro con su explicación */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Aportes por miembro</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-4">
            {plan.members.map((member) => {
              const isSelf = member.userId === user.id;
              return (
                <li
                  key={member.userId}
                  className="rounded-xl border border-border p-4"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      {member.image && <AvatarImage src={member.image} alt="" />}
                      <AvatarFallback>{initials(member.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {member.name}
                        {isSelf && (
                          <span className="text-muted-foreground"> (tú)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Aportado: {formatMoney(member.contributed)} de{" "}
                        {formatMoney(member.expectedTotal)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-bold tabular-nums">
                        {formatMoney(member.recommendedMonthly)}
                      </p>
                      <p className="text-xs text-muted-foreground">al mes</p>
                    </div>
                  </div>

                  <Progress value={member.percentage} className="mt-3 h-2" />

                  {member.rationale && (
                    <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                      <Info className="mt-0.5 size-3.5 shrink-0" />
                      {member.rationale}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
