import { z } from "zod";

export const updateAccountSchema = z.object({
  accountId: z.string().min(1),
  nickname: z.string().trim().max(50).optional(),
});
