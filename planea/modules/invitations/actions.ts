"use server";

import crypto from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { requireAdmin } from "@/modules/groups/service";

function newToken() {
  return crypto.randomBytes(16).toString("base64url");
}

/**
 * Genera un link de invitación. Solo puede haber uno activo por grupo:
 * generar uno nuevo revoca el anterior (así "regenerar" invalida el link viejo).
 */
export async function generateInvitationAction(groupId: string) {
  const userId = await requireUserId();
  try {
    await requireAdmin(userId, groupId);
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }

  const token = newToken();
  await db.$transaction([
    db.groupInvitation.updateMany({
      where: { groupId, active: true },
      data: { active: false, revokedAt: new Date() },
    }),
    db.groupInvitation.create({
      data: { groupId, token, createdById: userId },
    }),
  ]);

  revalidatePath(`/grupo/${groupId}`);
  return { ok: true as const, message: "Link de invitación generado.", token };
}

export async function revokeInvitationAction(groupId: string) {
  const userId = await requireUserId();
  try {
    await requireAdmin(userId, groupId);
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }

  await db.groupInvitation.updateMany({
    where: { groupId, active: true },
    data: { active: false, revokedAt: new Date() },
  });

  revalidatePath(`/grupo/${groupId}`);
  return { ok: true as const, message: "Link revocado. Ya no permite unirse." };
}

/** Acepta la invitación: añade al usuario autenticado como miembro. */
export async function acceptInvitationAction(token: string) {
  const userId = await requireUserId();

  const invitation = await db.groupInvitation.findUnique({
    where: { token },
    include: { group: { select: { id: true, name: true } } },
  });
  if (!invitation || !invitation.active) {
    return {
      ok: false as const,
      error: "Este link de invitación ya no es válido.",
    };
  }

  const existing = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId: invitation.groupId, userId } },
  });

  if (!existing) {
    await db.groupMember.create({
      data: {
        groupId: invitation.groupId,
        userId,
        role: "MEMBER",
        // Por defecto las finanzas quedan privadas; el usuario decide después.
        privacy: "PRIVATE",
      },
    });
  }

  revalidatePath("/grupo");
  redirect(`/grupo/${invitation.groupId}?bienvenida=1`);
}
