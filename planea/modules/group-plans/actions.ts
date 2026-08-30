"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { fromZodError, type ActionState } from "@/lib/action-state";
import { requireAdmin, requireMembership } from "@/modules/groups/service";
import type { AllocationResult } from "./allocation";
import { previewAllocation } from "./service";
import { contributionSchema, planSchema, previewSchema } from "./schemas";

/** Calcula la distribución propuesta para mostrarla antes de crear el plan. */
export async function previewAllocationAction(
  _prev: { ok: boolean; error?: string; result?: AllocationResult },
  formData: FormData,
): Promise<{ ok: boolean; error?: string; result?: AllocationResult }> {
  const userId = await requireUserId();
  const parsed = previewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Completa el grupo, el monto y la fecha objetivo." };
  }

  try {
    const result = await previewAllocation(
      userId,
      parsed.data.groupId,
      parsed.data.targetAmount,
      parsed.data.targetDate,
    );
    return { ok: true, result };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function createPlanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = planSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await requireMembership(userId, parsed.data.groupId);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }

  const allocation = await previewAllocation(
    userId,
    parsed.data.groupId,
    parsed.data.targetAmount,
    parsed.data.targetDate,
  );

  const plan = await db.groupPlan.create({
    data: {
      groupId: parsed.data.groupId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      targetAmount: parsed.data.targetAmount,
      targetDate: parsed.data.targetDate,
      createdById: userId,
      members: {
        create: allocation.members.map((m) => ({
          userId: m.userId,
          recommendedMonthly: m.recommendedMonthly,
          capacityShare: m.capacityShare,
          rationale: m.rationale,
        })),
      },
    },
  });

  revalidatePath("/plan");
  revalidatePath(`/grupo/${parsed.data.groupId}`);
  redirect(`/plan/${plan.id}`);
}

/** Registra un aporte del usuario autenticado al plan. */
export async function addContributionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = contributionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const planMember = await db.planMember.findFirst({
    where: { planId: parsed.data.planId, userId },
    include: { plan: { select: { id: true, groupId: true, targetAmount: true } } },
  });
  if (!planMember) {
    return { ok: false, error: "No participas en este plan." };
  }

  await db.planContribution.create({
    data: {
      planMemberId: planMember.id,
      amount: parsed.data.amount,
      note: parsed.data.note || null,
    },
  });

  // Marcar el plan como completado si se alcanzó la meta
  const contributions = await db.planContribution.aggregate({
    where: { planMember: { planId: planMember.plan.id } },
    _sum: { amount: true },
  });
  const total = Number(contributions._sum.amount ?? 0);
  if (total >= Number(planMember.plan.targetAmount)) {
    await db.groupPlan.update({
      where: { id: planMember.plan.id },
      data: { status: "COMPLETED" },
    });
  }

  revalidatePath(`/plan/${planMember.plan.id}`);
  revalidatePath("/plan");
  revalidatePath(`/grupo/${planMember.plan.groupId}`);
  return { ok: true, message: "Aporte registrado." };
}

/** Recalcula la distribución con las finanzas actuales de los miembros. */
export async function recalculatePlanAction(planId: string) {
  const userId = await requireUserId();
  const plan = await db.groupPlan.findFirst({
    where: { id: planId },
    select: { id: true, groupId: true, targetAmount: true, targetDate: true },
  });
  if (!plan) return { ok: false as const, error: "Plan no encontrado." };

  try {
    await requireMembership(userId, plan.groupId);
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }

  const allocation = await previewAllocation(
    userId,
    plan.groupId,
    Number(plan.targetAmount),
    plan.targetDate,
  );

  // Actualiza a los miembros existentes y agrega a los nuevos del grupo
  for (const m of allocation.members) {
    await db.planMember.upsert({
      where: { planId_userId: { planId: plan.id, userId: m.userId } },
      create: {
        planId: plan.id,
        userId: m.userId,
        recommendedMonthly: m.recommendedMonthly,
        capacityShare: m.capacityShare,
        rationale: m.rationale,
      },
      update: {
        recommendedMonthly: m.recommendedMonthly,
        capacityShare: m.capacityShare,
        rationale: m.rationale,
      },
    });
  }

  revalidatePath(`/plan/${plan.id}`);
  return { ok: true as const, message: "Distribución recalculada." };
}

export async function deletePlanAction(planId: string) {
  const userId = await requireUserId();
  const plan = await db.groupPlan.findUnique({
    where: { id: planId },
    select: { id: true, groupId: true },
  });
  if (!plan) return { ok: false, error: "Plan no encontrado." };

  try {
    await requireAdmin(userId, plan.groupId);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }

  await db.groupPlan.delete({ where: { id: plan.id } });
  revalidatePath("/plan");
  revalidatePath(`/grupo/${plan.groupId}`);
  redirect("/plan");
}
