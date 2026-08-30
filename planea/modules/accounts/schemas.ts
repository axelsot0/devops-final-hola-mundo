import { z } from "zod";

export const createAccountSchema = z.object({
  email: z.email("Correo electrónico inválido."),
  bankId: z.string().min(1, "Selecciona una entidad bancaria."),
  nickname: z.string().trim().max(50).optional(),
});

export const updateAccountSchema = z.object({
  accountId: z.string().min(1),
  nickname: z.string().trim().max(50).optional(),
});
