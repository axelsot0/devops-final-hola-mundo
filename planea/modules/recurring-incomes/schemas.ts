import { z } from "zod";

/**
 * Los días llegan del formulario como texto libre ("15, 30") porque es como
 * la gente los dice. Se normalizan a una lista ordenada y sin repetidos.
 */
const daysOfMonth = z
  .string()
  .trim()
  .min(1, "Indica al menos un día del mes.")
  .transform((value) =>
    [
      ...new Set(
        value
          .split(/[^0-9]+/)
          .filter(Boolean)
          .map(Number),
      ),
    ].sort((a, b) => a - b),
  )
  .refine((days) => days.length > 0, "Indica al menos un día del mes.")
  .refine(
    (days) => days.every((day) => day >= 1 && day <= 31),
    "Los días deben estar entre 1 y 31.",
  )
  .refine((days) => days.length <= 8, "Máximo 8 días por ingreso.");

export const recurringIncomeSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre del ingreso.").max(60),
  amount: z.coerce.number<number>().positive("El monto debe ser mayor que 0."),
  daysOfMonth,
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
});

export const updateRecurringIncomeSchema = recurringIncomeSchema.extend({
  incomeId: z.string().min(1),
});
