"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { fromZodError, type ActionState } from "@/lib/action-state";
import { getMembership, requireAdmin, requireMembership } from "./service";
import {
  groupSchema,
  memberRoleSchema,
  privacySchema,
  updateGroupSchema,
} from "./schemas";

export async function createGroupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = groupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const group = await db.group.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      emoji: parsed.data.emoji || null,
      createdById: userId,
      // Quien crea el grupo es su primer administrador
      members: { create: { userId, role: "ADMIN" } },
    },
  });

  revalidatePath("/grupo");
  redirect(`/grupo/${group.id}`);
}

export async function updateGroupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = updateGroupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await requireAdmin(userId, parsed.data.groupId);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }

  await db.group.update({
    where: { id: parsed.data.groupId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      emoji: parsed.data.emoji || null,
    },
  });

  revalidatePath("/grupo");
  revalidatePath(`/grupo/${parsed.data.groupId}`);
  return { ok: true, message: "Grupo actualizado." };
}

/** Configuración de privacidad financiera: se guarda por grupo. */
export async function updatePrivacyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = privacySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const membership = await getMembership(userId, parsed.data.groupId);
  if (!membership) return { ok: false, error: "No perteneces a este grupo." };

  await db.groupMember.update({
    where: { id: membership.id },
    data: { privacy: parsed.data.privacy },
  });

  revalidatePath(`/grupo/${parsed.data.groupId}`);
  return {
    ok: true,
    message:
      parsed.data.privacy === "SHARED"
        ? "Ahora compartes tus finanzas con este grupo."
        : "Tus finanzas quedan privadas en este grupo.",
  };
}

export async function updateMemberRoleAction(formData: FormData) {
  const userId = await requireUserId();
  const parsed = memberRoleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  try {
    await requireAdmin(userId, parsed.data.groupId);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }

  const target = await db.groupMember.findFirst({
    where: { id: parsed.data.memberId, groupId: parsed.data.groupId },
  });
  if (!target) return { ok: false, error: "Miembro no encontrado." };

  // No dejar el grupo sin administradores
  if (target.role === "ADMIN" && parsed.data.role === "MEMBER") {
    const adminCount = await db.groupMember.count({
      where: { groupId: parsed.data.groupId, role: "ADMIN" },
    });
    if (adminCount <= 1) {
      return { ok: false, error: "El grupo debe tener al menos un administrador." };
    }
  }

  await db.groupMember.update({
    where: { id: target.id },
    data: { role: parsed.data.role },
  });

  revalidatePath(`/grupo/${parsed.data.groupId}`);
  return { ok: true, message: "Rol actualizado." };
}

export async function removeMemberAction(groupId: string, memberUserId: string) {
  const userId = await requireUserId();
  try {
    await requireAdmin(userId, groupId);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }

  if (memberUserId === userId) {
    return {
      ok: false,
      error: "Para salir del grupo usa la opción «Abandonar grupo».",
    };
  }

  const membership = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: memberUserId } },
  });
  if (!membership) return { ok: false, error: "Miembro no encontrado." };

  await db.groupMember.delete({ where: { id: membership.id } });
  revalidatePath(`/grupo/${groupId}`);
  return { ok: true, message: "Miembro eliminado del grupo." };
}

export async function leaveGroupAction(groupId: string) {
  const userId = await requireUserId();
  const membership = await getMembership(userId, groupId);
  if (!membership) return { ok: false, error: "No perteneces a este grupo." };

  if (membership.role === "ADMIN") {
    const adminCount = await db.groupMember.count({
      where: { groupId, role: "ADMIN" },
    });
    const memberCount = await db.groupMember.count({ where: { groupId } });
    if (adminCount <= 1 && memberCount > 1) {
      return {
        ok: false,
        error:
          "Eres el único administrador. Nombra a otro administrador antes de salir.",
      };
    }
  }

  await db.groupMember.delete({ where: { id: membership.id } });
  revalidatePath("/grupo");
  redirect("/grupo");
}

export async function deleteGroupAction(groupId: string) {
  const userId = await requireUserId();
  try {
    await requireAdmin(userId, groupId);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }

  await db.group.delete({ where: { id: groupId } });
  revalidatePath("/grupo");
  redirect("/grupo");
}

/** Comprueba pertenencia sin exponer datos; usado por la UI de planes. */
export async function assertMembership(groupId: string) {
  const userId = await requireUserId();
  await requireMembership(userId, groupId);
}
