import { z } from "zod";

export const goalSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre de la meta.").max(60),
  description: z.string().trim().max(200).optional(),
  targetAmount: z.coerce
    .number<number>()
    .positive("La cantidad objetivo debe ser mayor que 0."),
  savedAmount: z.coerce
    .number<number>()
    .min(0, "La cantidad ahorrada no puede ser negativa."),
  targetDate: z
    .union([z.literal(""), z.coerce.date<Date>()])
    .optional(),
});

export const updateGoalSchema = goalSchema.extend({
  goalId: z.string().min(1),
});

export const contributeGoalSchema = z.object({
  goalId: z.string().min(1),
  amount: z.coerce.number<number>().positive("El aporte debe ser mayor que 0."),
});
