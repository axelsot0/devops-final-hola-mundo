import type { Metadata } from "next";
import { CheckCircle2, PiggyBank, Target } from "lucide-react";

import { requireUser } from "@/lib/auth-helpers";
import { listGoals } from "@/modules/savings-goals/service";
import { formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { GoalCard } from "./goal-card";
import { NewGoalButton } from "./new-goal-button";

export const metadata: Metadata = { title: "Metas · Planea" };

export default async function GoalsPage() {
  const user = await requireUser();
  const goals = await listGoals(user.id);

  const active = goals.filter((g) => g.status !== "COMPLETED");
  const completed = goals.filter((g) => g.status === "COMPLETED");
  const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0);

  return (
    <>
      <PageHeader
        title="Metas de ahorro"
        description="Define hacia dónde va tu dinero y sigue tu progreso."
      >
        {goals.length > 0 && <NewGoalButton />}
      </PageHeader>

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Todavía no tienes metas"
          description="Crea tu primera meta de ahorro: un viaje, un fondo de emergencia o esa compra que vienes planeando."
        >
          <NewGoalButton label="Crear mi primera meta" />
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard
              label="Total ahorrado"
              value={formatMoney(totalSaved)}
              icon={PiggyBank}
              tone="positive"
            />
            <StatCard
              label="Metas activas"
              value={String(active.length)}
              icon={Target}
            />
            <StatCard
              label="Metas logradas"
              value={String(completed.length)}
              icon={CheckCircle2}
              className="col-span-2 lg:col-span-1"
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {active.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>

          {completed.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Metas logradas
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {completed.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
