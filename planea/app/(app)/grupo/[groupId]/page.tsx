import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PiggyBank, Plus, TrendingUp, Users } from "lucide-react";

import { requireUser } from "@/lib/auth-helpers";
import { getBaseUrl } from "@/lib/base-url";
import { db } from "@/lib/db";
import { getGroupDetail, getGroupMemberFinances } from "@/modules/groups/service";
import { listGroupPlans } from "@/modules/group-plans/service";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PlanCard } from "@/components/shared/plan-card";
import { StatCard } from "@/components/shared/stat-card";
import { GroupActions } from "./group-actions";
import { InvitationCard } from "./invitation-card";
import { MembersCard } from "./members-card";
import { PrivacyCard } from "./privacy-card";

export const metadata: Metadata = { title: "Grupo · Planea" };

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const user = await requireUser();
  const { groupId } = await params;

  const group = await getGroupDetail(user.id, groupId);
  if (!group) notFound();

  const [finances, plans, memberships, baseUrl] = await Promise.all([
    getGroupMemberFinances(user.id, groupId),
    listGroupPlans(user.id, groupId),
    db.groupMember.findMany({
      where: { groupId },
      select: { id: true, userId: true },
    }),
    getBaseUrl(),
  ]);

  const membershipIds = Object.fromEntries(
    memberships.map((m) => [m.userId, m.id]),
  );
  const isAdmin = group.myRole === "ADMIN";

  const activePlans = plans.filter((p) => p.status === "ACTIVE");
  const totalContributed = plans.reduce((s, p) => s + p.totalContributed, 0);
  const monthlyRecommended = activePlans.reduce((sum, plan) => {
    const me = plan.members.find((m) => m.userId === user.id);
    return sum + (me?.recommendedMonthly ?? 0);
  }, 0);

  return (
    <>
      <Link
        href="/grupo"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Todos los grupos
      </Link>

      <div className="mb-6 flex items-start gap-3">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-2xl">
          {group.emoji ?? "👥"}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">
            {group.name}
          </h1>
          {group.description && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {group.description}
            </p>
          )}
        </div>
        <GroupActions group={group} isAdmin={isAdmin} />
      </div>

      {/* Resumen del grupo */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="Miembros"
          value={String(group.members.length)}
          icon={Users}
          hint={`${group.members.filter((m) => m.role === "ADMIN").length} administrando`}
        />
        <StatCard
          label="Aportado en total"
          value={formatMoney(totalContributed)}
          icon={TrendingUp}
          tone="positive"
        />
        <StatCard
          label="Tu aporte mensual"
          value={formatMoney(monthlyRecommended)}
          icon={PiggyBank}
          hint={
            activePlans.length > 0
              ? `Recomendado en ${activePlans.length} ${activePlans.length === 1 ? "plan" : "planes"}`
              : "Sin planes activos"
          }
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {/* Planes del grupo */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Planes de ahorro</h2>
          <Button size="sm" asChild>
            <Link href={`/plan?grupo=${group.id}`}>
              <Plus /> Nuevo plan
            </Link>
          </Button>
        </div>
        {plans.length === 0 ? (
          <EmptyState
            icon={PiggyBank}
            title="Este grupo aún no tiene planes"
            description="Crea un plan de ahorro grupal y calcularemos cuánto debería aportar cada miembro según su capacidad."
          >
            <Button variant="secondary" asChild>
              <Link href={`/plan?grupo=${group.id}`}>Crear un plan</Link>
            </Button>
          </EmptyState>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </section>

      {/* Miembros, privacidad e invitaciones */}
      <div className="mt-6 grid items-start gap-4 lg:grid-cols-2">
        <MembersCard
          groupId={group.id}
          members={group.members}
          finances={finances}
          viewerId={user.id}
          viewerIsAdmin={isAdmin}
          membershipIds={membershipIds}
        />
        <div className="flex flex-col gap-4">
          <PrivacyCard
            groupId={group.id}
            privacy={group.myPrivacy}
            groupName={group.name}
          />
          {isAdmin && (
            <InvitationCard
              groupId={group.id}
              token={group.activeInvitationToken}
              groupName={group.name}
              baseUrl={baseUrl}
            />
          )}
        </div>
      </div>
    </>
  );
}
