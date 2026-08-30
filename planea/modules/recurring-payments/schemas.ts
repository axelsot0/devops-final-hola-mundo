import { z } from "zod";

export const recurringPaymentSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre del pago.").max(60),
  categoryId: z.string().optional(),
  amount: z.coerce.number<number>().positive("El monto debe ser mayor que 0."),
  periodicity: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]),
  nextDueDate: z.coerce.date<Date>(),
  accountId: z.string().optional(),
});

export const updateRecurringPaymentSchema = recurringPaymentSchema.extend({
  paymentId: z.string().min(1),
});
