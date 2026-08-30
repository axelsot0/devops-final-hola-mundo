import { db } from "@/lib/db";
import type { PlanStatus } from "@/lib/generated/prisma";
import { getMemberCapacities, requireMembership } from "@/modules/groups/service";
import { allocatePlan, monthsBetween, type AllocationResult } from "./allocation";

export interface PlanMemberDTO {
  userId: string;
  name: string;
  image: string | null;
  recommendedMonthly: number;
  capacityShare: number;
  rationale: string | null;
  contributed: number;
  /** Aporte total esperado hasta la fecha objetivo */
  expectedTotal: number;
  percentage: number;
}

export interface GroupPlanDTO {
  id: string;
  groupId: string;
  groupName: string;
  name: string;
  description: string | null;
  targetAmount: number;
  targetDate: Date;
  status: PlanStatus;
  months: number;
  totalContributed: number;
  percentage: number;
  monthlyTarget: number;
  members: PlanMemberDTO[];
}

function toDTO(
  plan: {
    id: string;
    groupId: string;
    name: string;
    description: string | null;
    targetAmount: unknown;
    targetDate: Date;
    status: PlanStatus;
    createdAt: Date;
    group: { name: string };
    members: {
      userId: string;
      recommendedMonthly: unknown;
      capacityShare: unknown;
      rationale: string | null;
      user: { name: string; image: string | null };
      contributions: { amount: unknown }[];
    }[];
  },
): GroupPlanDTO {
  const targetAmount = Number(plan.targetAmount);
  const months = Math.max(1, monthsBetween(plan.createdAt, plan.targetDate));

  const members = plan.members.map<PlanMemberDTO>((m) => {
    const contributed = m.contributions.reduce(
      (sum, c) => sum + Number(c.amount),
      0,
    );
    const recommendedMonthly = Number(m.recommendedMonthly);
    const expectedTotal = recommendedMonthly * months;
    return {
      userId: m.userId,
      name: m.user.name,
      image: m.user.image,
      recommendedMonthly,
      capacityShare: Number(m.capacityShare),
      rationale: m.rationale,
      contributed,
      expectedTotal,
      percentage:
        expectedTotal > 0
          ? Math.min(100, Math.round((contributed / expectedTotal) * 100))
          : 0,
    };
  });

  const totalContributed = members.reduce((s, m) => s + m.contributed, 0);

  return {
    id: plan.id,
    groupId: plan.groupId,
    groupName: plan.group.name,
    name: plan.name,
    description: plan.description,
    targetAmount,
    targetDate: plan.targetDate,
    status: plan.status,
    months,
    totalContributed,
    percentage:
      targetAmount > 0
        ? Math.min(100, Math.round((totalContributed / targetAmount) * 100))
        : 0,
    monthlyTarget: Math.round(targetAmount / months),
    members,
  };
}

const planInclude = {
  group: { select: { name: true } },
  members: {
    include: {
      user: { select: { name: true, image: true } },
      contributions: { select: { amount: true } },
    },
  },
} as const;

/** Planes de un grupo (requiere pertenecer al grupo). */
export async function listGroupPlans(
  userId: string,
  groupId: string,
): Promise<GroupPlanDTO[]> {
  await requireMembership(userId, groupId);
  const plans = await db.groupPlan.findMany({
    where: { groupId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: planInclude,
  });
  return plans.map(toDTO);
}

/** Todos los planes de los grupos del usuario (historial en la pantalla Plan). */
export async function listMyPlans(userId: string): Promise<GroupPlanDTO[]> {
  const plans = await db.groupPlan.findMany({
    where: { group: { members: { some: { userId } } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: planInclude,
  });
  return plans.map(toDTO);
}

export async function getPlan(
  userId: string,
  planId: string,
): Promise<GroupPlanDTO | null> {
  const plan = await db.groupPlan.findFirst({
    where: { id: planId, group: { members: { some: { userId } } } },
    include: planInclude,
  });
  return plan ? toDTO(plan) : null;
}

/**
 * Previsualiza la distribución de aportes sin guardar nada.
 *
 * Usa la capacidad de ahorro de todos los miembros, incluidos los que tienen
 * finanzas privadas; el resultado solo contiene aportes y proporciones, así
 * que puede mostrarse a todo el grupo sin exponer sus montos.
 */
export async function previewAllocation(
  userId: string,
  groupId: string,
  targetAmount: number,
  targetDate: Date,
): Promise<AllocationResult> {
  const capacities = await getMemberCapacities(userId, groupId);
  const months = monthsBetween(new Date(), targetDate);
  return allocatePlan(targetAmount, months, capacities);
}
