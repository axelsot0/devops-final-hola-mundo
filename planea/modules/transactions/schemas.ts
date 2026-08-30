import { z } from "zod";

const baseTransaction = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.coerce.number<number>().positive("El monto debe ser mayor que 0."),
  merchant: z.string().trim().max(80).optional(),
  description: z.string().trim().max(200).optional(),
  date: z.coerce.date<Date>(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
});

export const createTransactionSchema = baseTransaction;

export const updateTransactionSchema = baseTransaction.extend({
  transactionId: z.string().min(1),
});
