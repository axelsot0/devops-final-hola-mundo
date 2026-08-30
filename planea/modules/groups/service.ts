import { db } from "@/lib/db";
import type { GroupRole, PrivacyMode } from "@/lib/generated/prisma";
import { getMonthlyAverages } from "@/modules/transactions/service";
import { getMonthlyRecurringTotal } from "@/modules/recurring-payments/service";

export interface GroupMemberDTO {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: GroupRole;
  privacy: PrivacyMode;
  joinedAt: Date;
}

export interface GroupSummaryDTO {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  memberCount: number;
  activePlanCount: number;
  /** Rol y privacidad del usuario que consulta */
  myRole: GroupRole;
  myPrivacy: PrivacyMode;
}

/**
 * Capacidad financiera de un miembro tal como se le entrega a la interfaz.
 *
 * `visible` indica si el usuario que consulta puede ver los montos, según la
 * configuración de privacidad que el miembro eligió PARA ESE GRUPO. Cuando es
 * `false` los montos llegan en `null`: la redacción ocurre en el servidor, de
 * modo que los datos privados nunca viajan al navegador aunque la interfaz
 * cambie.
 */
export interface MemberFinancesDTO {
  userId: string;
  name: string;
  image: string | null;
  privacy: PrivacyMode;
  visible: boolean;
  monthlyIncome: number | null;
  monthlyExpense: number | null;
  recurringTotal: number | null;
  available: number | null;
  savingCapacity: number | null;
}

/** Capacidad de ahorro de un miembro; solo para uso interno del servidor. */
export interface MemberCapacity {
  userId: string;
  name: string;
  monthlyCapacity: number;
}

/** Devuelve la membresía si el usuario pertenece al grupo; si no, null. */
export async function getMembership(userId: string, groupId: string) {
  return db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
}

/** Lanza si el usuario no pertenece al grupo (autorización por grupo). */
export async function requireMembership(userId: string, groupId: string) {
  const membership = await getMembership(userId, groupId);
  if (!membership) throw new Error("No perteneces a este grupo.");
  return membership;
}

/** Lanza si el usuario no es administrador del grupo. */
export async function requireAdmin(userId: string, groupId: string) {
  const membership = await requireMembership(userId, groupId);
  if (membership.role !== "ADMIN") {
    throw new Error("Solo los administradores pueden hacer esto.");
  }
  return membership;
}

export async function listGroups(userId: string): Promise<GroupSummaryDTO[]> {
  const memberships = await db.groupMember.findMany({
    where: { userId },
    orderBy: { joinedAt: "asc" },
    include: {
      group: {
        include: {
          _count: { select: { members: true } },
          plans: { where: { status: "ACTIVE" }, select: { id: true } },
        },
      },
    },
  });

  return memberships.map((m) => ({
    id: m.group.id,
    name: m.group.name,
    description: m.group.description,
    emoji: m.group.emoji,
    memberCount: m.group._count.members,
    activePlanCount: m.group.plans.length,
    myRole: m.role,
    myPrivacy: m.privacy,
  }));
}

export async function getGroupDetail(userId: string, groupId: string) {
  const membership = await getMembership(userId, groupId);
  if (!membership) return null;

  const group = await db.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
      invitations: {
        where: { active: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!group) return null;

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    emoji: group.emoji,
    createdById: group.createdById,
    myRole: membership.role,
    myPrivacy: membership.privacy,
    members: group.members.map<GroupMemberDTO>((m) => ({
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
      role: m.role,
      privacy: m.privacy,
      joinedAt: m.joinedAt,
    })),
    activeInvitationToken: group.invitations[0]?.token ?? null,
  };
}

/**
 * Calcula las finanzas de cada miembro del grupo SIN redactar.
 *
 * Es la fuente que el sistema usa internamente para distribuir los aportes de
 * un plan, incluso cuando un miembro mantiene sus finanzas privadas. No debe
 * devolverse nunca a un componente cliente: usa `getGroupMemberFinances` para
 * eso.
 */
async function computeMemberFinances(groupId: string) {
  const members = await db.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true, image: true } } },
  });

  return Promise.all(
    members.map(async (m) => {
      const [averages, recurringTotal] = await Promise.all([
        getMonthlyAverages(m.userId, 3),
        getMonthlyRecurringTotal(m.userId),
      ]);

      const monthlyIncome = Math.round(averages.avgIncome);
      const monthlyExpense = Math.round(averages.avgExpense);
      const available = Math.max(0, monthlyIncome - monthlyExpense);
      // Se reserva un margen: solo el 60% de lo disponible se considera
      // capacidad de ahorro comprometible.
      const savingCapacity = Math.round(available * 0.6);

      return {
        userId: m.userId,
        name: m.user.name,
        image: m.user.image,
        privacy: m.privacy,
        monthlyIncome,
        monthlyExpense,
        recurringTotal: Math.round(recurringTotal),
        available,
        savingCapacity,
      };
    }),
  );
}

/**
 * Capacidades de ahorro del grupo para calcular un plan.
 * Uso exclusivo del servidor: incluye a los miembros con finanzas privadas,
 * porque el sistema sí puede usar esa información para repartir los aportes.
 */
export async function getMemberCapacities(
  viewerId: string,
  groupId: string,
): Promise<MemberCapacity[]> {
  await requireMembership(viewerId, groupId);
  const finances = await computeMemberFinances(groupId);
  return finances.map((f) => ({
    userId: f.userId,
    name: f.name,
    monthlyCapacity: f.savingCapacity,
  }));
}

/**
 * Finanzas del grupo listas para mostrar: los montos de quien mantiene sus
 * finanzas privadas se sustituyen por `null` antes de salir del servidor.
 */
export async function getGroupMemberFinances(
  viewerId: string,
  groupId: string,
): Promise<MemberFinancesDTO[]> {
  await requireMembership(viewerId, groupId);
  const finances = await computeMemberFinances(groupId);

  return finances.map((f) => {
    const visible = f.privacy === "SHARED" || f.userId === viewerId;
    return {
      userId: f.userId,
      name: f.name,
      image: f.image,
      privacy: f.privacy,
      visible,
      monthlyIncome: visible ? f.monthlyIncome : null,
      monthlyExpense: visible ? f.monthlyExpense : null,
      recurringTotal: visible ? f.recurringTotal : null,
      available: visible ? f.available : null,
      savingCapacity: visible ? f.savingCapacity : null,
    };
  });
}
