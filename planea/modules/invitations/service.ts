import { db } from "@/lib/db";

export interface InvitationPreview {
  token: string;
  groupId: string;
  groupName: string;
  groupEmoji: string | null;
  groupDescription: string | null;
  memberCount: number;
  invitedByName: string;
}

/** Datos públicos mínimos de una invitación válida (sin información financiera). */
export async function getInvitationPreview(
  token: string,
): Promise<InvitationPreview | null> {
  const invitation = await db.groupInvitation.findUnique({
    where: { token },
    include: {
      group: {
        include: { _count: { select: { members: true } } },
      },
      createdBy: { select: { name: true } },
    },
  });
  if (!invitation || !invitation.active) return null;

  return {
    token: invitation.token,
    groupId: invitation.groupId,
    groupName: invitation.group.name,
    groupEmoji: invitation.group.emoji,
    groupDescription: invitation.group.description,
    memberCount: invitation.group._count.members,
    invitedByName: invitation.createdBy.name,
  };
}
