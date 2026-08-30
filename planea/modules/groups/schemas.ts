import { z } from "zod";

export const groupSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre del grupo.").max(60),
  description: z.string().trim().max(200).optional(),
  emoji: z.string().trim().max(8).optional(),
});

export const updateGroupSchema = groupSchema.extend({
  groupId: z.string().min(1),
});

export const privacySchema = z.object({
  groupId: z.string().min(1),
  privacy: z.enum(["PRIVATE", "SHARED"]),
});

export const memberRoleSchema = z.object({
  groupId: z.string().min(1),
  memberId: z.string().min(1),
  role: z.enum(["ADMIN", "MEMBER"]),
});
