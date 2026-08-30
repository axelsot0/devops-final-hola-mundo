import { db } from "@/lib/db";
import type { Periodicity, RecurringStatus } from "@/lib/generated/prisma";

export interface RecurringPaymentDTO {
  id: string;
  name: string;
  amount: number;
  periodicity: Periodicity;
  nextDueDate: Date;
  status: RecurringStatus;
  accountId: string | null;
  category: { id: string; name: string; icon: string | null; color: string | null } | null;
}

export const PERIODICITY_LABEL: Record<Periodicity, string> = {
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
  QUARTERLY: "Trimestral",
  YEARLY: "Anual",
};

/** Factor para convertir un pago a su equivalente mensual. */
const MONTHLY_FACTOR: Record<Periodicity, number> = {
  WEEKLY: 52 / 12,
  BIWEEKLY: 26 / 12,
  MONTHLY: 1,
  QUARTERLY: 1 / 3,
  YEARLY: 1 / 12,
};

export function monthlyEquivalent(amount: number, periodicity: Periodicity) {
  return amount * MONTHLY_FACTOR[periodicity];
}

export async function listRecurringPayments(
  userId: string,
): Promise<RecurringPaymentDTO[]> {
  const payments = await db.recurringPayment.findMany({
    where: { userId },
    orderBy: { nextDueDate: "asc" },
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
    },
  });
  return payments.map((p) => ({
    id: p.id,
    name: p.name,
    amount: Number(p.amount),
    periodicity: p.periodicity,
    nextDueDate: p.nextDueDate,
    status: p.status,
    accountId: p.accountId,
    category: p.category,
  }));
}

/** Total mensual equivalente de los pagos recurrentes activos. */
export async function getMonthlyRecurringTotal(userId: string): Promise<number> {
  const payments = await db.recurringPayment.findMany({
    where: { userId, status: "ACTIVE" },
    select: { amount: true, periodicity: true },
  });
  return payments.reduce(
    (sum, p) => sum + monthlyEquivalent(Number(p.amount), p.periodicity),
    0,
  );
}
