import { db } from "@/lib/db";
import type { RecurringStatus } from "@/lib/generated/prisma";

export interface RecurringIncomeDTO {
  id: string;
  name: string;
  amount: number;
  currency: string;
  daysOfMonth: number[];
  status: RecurringStatus;
  account: { id: string; nickname: string | null; bankName: string } | null;
  category: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  } | null;
  lastPostedAt: Date | null;
}

/**
 * Cuánto se recupera hacia atrás la primera vez que se mira.
 *
 * Si alguien no abre la app en dos semanas, sus quincenas deben aparecer
 * igual. El tope evita que registrar un ingreso nuevo genere de golpe un año
 * de movimientos que nunca ocurrieron en la app.
 */
const CATCH_UP_DAYS = 45;

export async function listRecurringIncomes(
  userId: string,
): Promise<RecurringIncomeDTO[]> {
  const incomes = await db.recurringIncome.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
      account: {
        select: {
          id: true,
          nickname: true,
          bank: { select: { name: true } },
        },
      },
      postings: {
        orderBy: { postedFor: "desc" },
        take: 1,
        select: { postedFor: true },
      },
    },
  });

  return incomes.map((income) => ({
    id: income.id,
    name: income.name,
    amount: Number(income.amount),
    currency: income.currency,
    daysOfMonth: income.daysOfMonth,
    status: income.status,
    category: income.category,
    account: income.account
      ? {
          id: income.account.id,
          nickname: income.account.nickname,
          bankName: income.account.bank.name,
        }
      : null,
    lastPostedAt: income.postings[0]?.postedFor ?? null,
  }));
}

/** Total mensual de los ingresos recurrentes activos. */
export async function getMonthlyIncomeTotal(userId: string): Promise<number> {
  const incomes = await db.recurringIncome.findMany({
    where: { userId, status: "ACTIVE" },
    select: { amount: true, daysOfMonth: true },
  });

  return incomes.reduce(
    (sum, income) => sum + Number(income.amount) * income.daysOfMonth.length,
    0,
  );
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * Fechas en que tocó cobrar dentro de la ventana [from, to].
 *
 * Un día 30 en febrero no existe: se anota el último día del mes, que es lo
 * que hacen los bancos con las nóminas de fin de mes.
 */
export function dueDatesBetween(
  daysOfMonth: number[],
  from: Date,
  to: Date,
): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1, 12),
  );

  while (cursor <= to) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const lastDay = daysInMonth(year, month);

    for (const day of daysOfMonth) {
      const date = new Date(Date.UTC(year, month, Math.min(day, lastDay), 12));
      if (date >= from && date <= to) dates.push(date);
    }

    cursor.setUTCMonth(month + 1);
  }

  return dates.sort((a, b) => a.getTime() - b.getTime());
}

export interface PostingResult {
  posted: number;
  amount: number;
}

/**
 * Anota los ingresos recurrentes que ya tocaron y aún no se registraron.
 *
 * La idempotencia no depende de acordarse de cuándo se ejecutó: cada
 * anotación tiene clave única (ingreso, día), así que abrir la app cinco
 * veces el día de cobro registra el sueldo una sola vez, y dos pestañas a la
 * vez tampoco lo duplican.
 */
export async function postDueRecurringIncomes(
  userId: string,
  now: Date = new Date(),
): Promise<PostingResult> {
  const incomes = await db.recurringIncome.findMany({
    where: { userId, status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      amount: true,
      currency: true,
      accountId: true,
      categoryId: true,
      daysOfMonth: true,
      createdAt: true,
    },
  });

  const earliest = new Date(now.getTime() - CATCH_UP_DAYS * 24 * 60 * 60 * 1000);
  let posted = 0;
  let amount = 0;

  for (const income of incomes) {
    // Nunca antes de haberlo registrado: no inventamos cobros pasados.
    const from = income.createdAt > earliest ? income.createdAt : earliest;

    for (const postedFor of dueDatesBetween(income.daysOfMonth, from, now)) {
      try {
        await db.$transaction(async (tx) => {
          const posting = await tx.recurringIncomePosting.create({
            data: { incomeId: income.id, postedFor },
          });

          const transaction = await tx.transaction.create({
            data: {
              userId,
              accountId: income.accountId,
              type: "INCOME",
              amount: income.amount,
              currency: income.currency,
              merchant: income.name,
              description: "Ingreso recurrente",
              date: postedFor,
              categoryId: income.categoryId,
              source: "RECURRING",
            },
          });

          await tx.recurringIncomePosting.update({
            where: { id: posting.id },
            data: { transactionId: transaction.id },
          });
        });

        posted++;
        amount += Number(income.amount);
      } catch (error) {
        // P2002 = ya estaba anotado por otra pestaña o por una visita
        // anterior. Es el caso normal, no un fallo.
        if ((error as { code?: string }).code !== "P2002") throw error;
      }
    }
  }

  return { posted, amount };
}
