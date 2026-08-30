import type { Metadata } from "next";
import { Users } from "lucide-react";

import { requireUser } from "@/lib/auth-helpers";
import { listGroups } from "@/modules/groups/service";
import { listMyPlans } from "@/modules/group-plans/service";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PlanCard } from "@/components/shared/plan-card";
import { NewGroupButton } from "../../grupo/new-group-button";
import { PlanWizard } from "../plan-wizard";

export const metadata: Metadata = { title: "Plan · Planea" };

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ grupo?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const [groups, plans] = await Promise.all([
    listGroups(user.id),
    listMyPlans(user.id),
  ]);

  const defaultGroupId = groups.some((g) => g.id === params.grupo)
    ? params.grupo
    : undefined;

  return (
    <>
      <PageHeader
        title="Crear un plan de ahorro grupal"
        description="Definan una meta y repartiremos los aportes según lo que cada persona puede ahorrar."
      />

      {groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Necesitas un grupo para crear un plan"
          description="Los planes de ahorro se hacen en equipo. Crea un grupo e invita a las personas con quienes vas a ahorrar."
        >
          <NewGroupButton label="Crear mi primer grupo" />
        </EmptyState>
      ) : (
        <PlanWizard groups={groups} defaultGroupId={defaultGroupId} />
      )}

      {plans.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-base font-semibold">Historial de planes</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} showGroupName />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
