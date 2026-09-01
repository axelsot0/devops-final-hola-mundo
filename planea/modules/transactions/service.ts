import { db } from "@/lib/db";
import { currentYearMonth, monthBoundsInAst } from "@/lib/time";
import type { Prisma, TransactionSource, TransactionType } from "@/lib/generated/prisma";

const DEFAULT_TRANSACTION_LIST_LIMIT = 9999;

export interface TransactionDTO {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  merchant: string | null;
  description: string | null;
  date: Date;
  source: TransactionSource;
  category: { id: string; name: string; icon: string | null; color: string | null } | null;
  account: { id: string; nickname: string | null; bankName: string; bankColor: string | null } | null;
}

export interface TransactionFilters {
  q?: string;
  categoryId?: string;
  accountId?: string;
  bankId?: string;
  type?: TransactionType;
  /** Mes en formato YYYY-MM */
  month?: string;
}

export interface MonthlySummary {
  /**
   * Ingresos menos gastos de todo lo que Planea ha detectado. No es el saldo
   * de tu banco: si un ingreso llega por un correo que no reconocemos, este
   * número se queda corto para siempre.
   */
  recordedNet: number;
  /** Saldo que informan los propios bancos, si alguno lo incluye. */
  reportedBalance: number | null;
  reportedBalanceAt: Date | null;
  monthIncome: number;
  monthExpense: number;
  difference: number;
}

export interface CategoryBreakdownItem {
  categoryId: string;
  name: string;
  icon: string | null;
  color: string | null;
  total: number;
  percentage: number;
}

/**
 * Rango del mes en hora dominicana. Con UTC, un consumo de las 9 de la noche
 * del día 31 caía en el mes siguiente y desaparecía del resumen.
 */
function monthRange(month?: string): { gte: Date; lt: Date } {
  const parsed = month ? /^(\d{4})-(\d{2})$/.exec(month) : null;
  const { year, month: m } = parsed
    ? { year: Number(parsed[1]), month: Number(parsed[2]) - 1 }
    : currentYearMonth();

  return monthBoundsInAst(year, m);
}

function buildWhere(userId: string, filters: TransactionFilters): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = { userId };
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.accountId) where.accountId = filters.accountId;
  if (filters.bankId) where.account = { bankId: filters.bankId };
  if (filters.type) where.type = filters.type;
  if (filters.month) where.date = monthRange(filters.month);
  if (filters.q) {
    where.OR = [
      { merchant: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  return where;
}

export async function listTransactions(
  userId: string,
  filters: TransactionFilters = {},
  limit = DEFAULT_TRANSACTION_LIST_LIMIT,
): Promise<TransactionDTO[]> {
  const transactions = await db.transaction.findMany({
    where: buildWhere(userId, filters),
    orderBy: { date: "desc" },
    take: limit,
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
      account: {
        select: {
          id: true,
          nickname: true,
          bank: { select: { name: true, color: true } },
        },
      },
    },
  });

  return transactions.map((t) => ({
    id: t.id,
    type: t.type,
    amount: Number(t.amount),
    currency: t.currency,
    merchant: t.merchant,
    description: t.description,
    date: t.date,
    source: t.source,
    category: t.category,
    account: t.account
      ? {
          id: t.account.id,
          nickname: t.account.nickname,
          bankName: t.account.bank.name,
          bankColor: t.account.bank.color,
        }
      : null,
  }));
}

/**
 * Resumen del dashboard.
 *
 * Los traspasos entre cuentas propias quedan fuera de todas las sumas: mover
 * dinero de tu cuenta de un banco a la de otro no es ingreso ni gasto, y
 * contarlo inflaría las dos columnas a la vez.
 */
export async function getMonthlySummary(userId: string): Promise<MonthlySummary> {
  const range = monthRange();
  const real = { userId, isInternal: false };

  const [allIncome, allExpense, monthIncome, monthExpense, accounts] =
    await Promise.all([
      db.transaction.aggregate({
        where: { ...real, type: "INCOME" },
        _sum: { amount: true },
      }),
      db.transaction.aggregate({
        where: { ...real, type: "EXPENSE" },
        _sum: { amount: true },
      }),
      db.transaction.aggregate({
        where: { ...real, type: "INCOME", date: range },
        _sum: { amount: true },
      }),
      db.transaction.aggregate({
        where: { ...real, type: "EXPENSE", date: range },
        _sum: { amount: true },
      }),
      db.account.findMany({
        where: { userId, balance: { not: null } },
        select: { balance: true, balanceAt: true },
      }),
    ]);

  const income = Number(monthIncome._sum.amount ?? 0);
  const expense = Number(monthExpense._sum.amount ?? 0);

  const reportedBalance = accounts.length
    ? accounts.reduce((sum, a) => sum + Number(a.balance ?? 0), 0)
    : null;
  const reportedBalanceAt = accounts.reduce<Date | null>(
    (latest, a) =>
      a.balanceAt && (!latest || a.balanceAt > latest) ? a.balanceAt : latest,
    null,
  );

  return {
    recordedNet:
      Number(allIncome._sum.amount ?? 0) - Number(allExpense._sum.amount ?? 0),
    reportedBalance,
    reportedBalanceAt,
    monthIncome: income,
    monthExpense: expense,
    difference: income - expense,
  };
}

/** Distribución de gastos del mes por categoría (para el gráfico de pastel). */
export async function getExpensesByCategory(
  userId: string,
  month?: string,
): Promise<CategoryBreakdownItem[]> {
  const grouped = await db.transaction.groupBy({
    by: ["categoryId"],
    where: { userId, type: "EXPENSE", isInternal: false, date: monthRange(month) },
    _sum: { amount: true },
  });
  if (grouped.length === 0) return [];

  const categoryIds = grouped
    .map((g) => g.categoryId)
    .filter((id): id is string => id !== null);
  const categories = await db.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true, icon: true, color: true },
  });
  const byId = new Map(categories.map((c) => [c.id, c]));

  const total = grouped.reduce((s, g) => s + Number(g._sum.amount ?? 0), 0);
  return grouped
    .map((g) => {
      const category = g.categoryId ? byId.get(g.categoryId) : undefined;
      const sum = Number(g._sum.amount ?? 0);
      return {
        categoryId: g.categoryId ?? "sin-categoria",
        name: category?.name ?? "Sin categoría",
        icon: category?.icon ?? null,
        color: category?.color ?? "#A1A1A1",
        total: sum,
        percentage: total > 0 ? Math.round((sum / total) * 100) : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}

/**
 * Promedios mensuales de los últimos meses completos; se usan para generar
 * el presupuesto sugerido y estimar la capacidad de ahorro en planes.
 */
export async function getMonthlyAverages(userId: string, months = 3) {
  const { year, month } = currentYearMonth();
  // Meses completos anteriores al actual, en hora dominicana.
  const from = monthBoundsInAst(year, month - months).gte;
  const to = monthBoundsInAst(year, month).gte;

  // Los traspasos entre cuentas propias quedan fuera: no son ingreso ni gasto
  // y falsearían el promedio sobre el que se propone el presupuesto.
  const real = { userId, isInternal: false, date: { gte: from, lt: to } };

  const [income, expense] = await Promise.all([
    db.transaction.aggregate({
      where: { ...real, type: "INCOME" },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: { ...real, type: "EXPENSE" },
      _sum: { amount: true },
    }),
  ]);

  return {
    avgIncome: Number(income._sum.amount ?? 0) / months,
    avgExpense: Number(expense._sum.amount ?? 0) / months,
  };
}
