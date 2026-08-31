"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { fromZodError, type ActionState } from "@/lib/action-state";
import { postDueRecurringIncomes } from "./service";
import {
  recurringIncomeSchema,
  updateRecurringIncomeSchema,
} from "./schemas";

function cleanForm(formData: FormData) {
  const raw = Object.fromEntries(formData);
  return {
    ...raw,
    categoryId: raw.categoryId || undefined,
    accountId: raw.accountId || undefined,
  };
}

function revalidate() {
  revalidatePath("/presupuesto");
  revalidatePath("/");
}

export async function createRecurringIncomeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = recurringIncomeSchema.safeParse(cleanForm(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  await db.recurringIncome.create({
    data: {
      userId,
      name: parsed.data.name,
      amount: parsed.data.amount,
      daysOfMonth: parsed.data.daysOfMonth,
      accountId: parsed.data.accountId ?? null,
      categoryId: parsed.data.categoryId ?? null,
    },
  });

  revalidate();
  return { ok: true, message: "Ingreso recurrente guardado." };
}

export async function updateRecurringIncomeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = updateRecurringIncomeSchema.safeParse(cleanForm(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const income = await db.recurringIncome.findFirst({
    where: { id: parsed.data.incomeId, userId },
    select: { id: true },
  });
  if (!income) return { ok: false, error: "Ingreso no encontrado." };

  await db.recurringIncome.update({
    where: { id: income.id },
    data: {
      name: parsed.data.name,
      amount: parsed.data.amount,
      daysOfMonth: parsed.data.daysOfMonth,
      accountId: parsed.data.accountId ?? null,
      categoryId: parsed.data.categoryId ?? null,
    },
  });

  revalidate();
  return { ok: true, message: "Ingreso actualizado." };
}

export async function toggleRecurringIncomeAction(incomeId: string) {
  const userId = await requireUserId();
  const income = await db.recurringIncome.findFirst({
    where: { id: incomeId, userId },
    select: { id: true, status: true },
  });
  if (!income) return { ok: false as const, error: "Ingreso no encontrado." };

  await db.recurringIncome.update({
    where: { id: income.id },
    data: { status: income.status === "ACTIVE" ? "PAUSED" : "ACTIVE" },
  });

  revalidate();
  return { ok: true as const };
}

export async function deleteRecurringIncomeAction(incomeId: string) {
  const userId = await requireUserId();
  const income = await db.recurringIncome.findFirst({
    where: { id: incomeId, userId },
    select: { id: true },
  });
  if (!income) return { ok: false as const, error: "Ingreso no encontrado." };

  /*
   * Las transacciones ya anotadas se conservan: ocurrieron de verdad y
   * borrarlas falsearía el histórico. Solo desaparece la regla.
   */
  await db.recurringIncome.delete({ where: { id: income.id } });

  revalidate();
  return { ok: true as const, message: "Ingreso recurrente eliminado." };
}

/** La dispara la app al entrar, junto a la sincronización de correos. */
export async function postRecurringIncomesAction() {
  const userId = await requireUserId();

  try {
    const result = await postDueRecurringIncomes(userId);
    if (result.posted > 0) revalidate();
    return { ok: true as const, ...result };
  } catch (error) {
    console.error("[recurring-incomes] Fallo al anotar ingresos:", error);
    return { ok: false as const, posted: 0, amount: 0 };
  }
}
