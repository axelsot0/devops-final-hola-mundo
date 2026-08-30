import { z } from "zod";

export const planSchema = z.object({
  groupId: z.string().min(1, "Selecciona un grupo."),
  name: z.string().trim().min(2, "Escribe el nombre del plan.").max(60),
  description: z.string().trim().max(200).optional(),
  targetAmount: z.coerce
    .number<number>()
    .positive("La cantidad debe ser mayor que 0."),
  targetDate: z.coerce
    .date<Date>()
    .refine((d) => d.getTime() > Date.now(), "La fecha debe ser futura."),
});

export const previewSchema = z.object({
  groupId: z.string().min(1),
  targetAmount: z.coerce.number<number>().positive(),
  targetDate: z.coerce.date<Date>(),
});

export const contributionSchema = z.object({
  planId: z.string().min(1),
  amount: z.coerce.number<number>().positive("El aporte debe ser mayor que 0."),
  note: z.string().trim().max(120).optional(),
});
