"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { fromZodError, type ActionState } from "@/lib/action-state";
import {
  recurringPaymentSchema,
  updateRecurringPaymentSchema,
} from "./schemas";

function cleanForm(formData: FormData) {
  const raw = Object.fromEntries(formData);
  return {
    ...raw,
    categoryId: raw.categoryId || undefined,
    accountId: raw.accountId || undefined,
  };
}

export async function createRecurringPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = recurringPaymentSchema.safeParse(cleanForm(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  await db.recurringPayment.create({
    data: {
      userId,
      name: parsed.data.name,
      categoryId: parsed.data.categoryId ?? null,
      amount: parsed.data.amount,
      periodicity: parsed.data.periodicity,
      nextDueDate: parsed.data.nextDueDate,
      accountId: parsed.data.accountId ?? null,
    },
  });

  revalidatePath("/presupuesto");
  return { ok: true, message: "Pago recurrente creado." };
}

export async function updateRecurringPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = updateRecurringPaymentSchema.safeParse(cleanForm(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const existing = await db.recurringPayment.findFirst({
    where: { id: parsed.data.paymentId, userId },
  });
  if (!existing) return { ok: false, error: "Pago no encontrado." };

  await db.recurringPayment.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name,
      categoryId: parsed.data.categoryId ?? null,
      amount: parsed.data.amount,
      periodicity: parsed.data.periodicity,
      nextDueDate: parsed.data.nextDueDate,
      accountId: parsed.data.accountId ?? null,
    },
  });

  revalidatePath("/presupuesto");
  return { ok: true, message: "Pago recurrente actualizado." };
}

export async function toggleRecurringPaymentAction(paymentId: string) {
  const userId = await requireUserId();
  const existing = await db.recurringPayment.findFirst({
    where: { id: paymentId, userId },
  });
  if (!existing) return { ok: false, error: "Pago no encontrado." };

  await db.recurringPayment.update({
    where: { id: existing.id },
    data: { status: existing.status === "ACTIVE" ? "PAUSED" : "ACTIVE" },
  });

  revalidatePath("/presupuesto");
  return {
    ok: true,
    message:
      existing.status === "ACTIVE" ? "Pago pausado." : "Pago reactivado.",
  };
}

export async function deleteRecurringPaymentAction(paymentId: string) {
  const userId = await requireUserId();
  const existing = await db.recurringPayment.findFirst({
    where: { id: paymentId, userId },
  });
  if (!existing) return { ok: false, error: "Pago no encontrado." };

  await db.recurringPayment.delete({ where: { id: existing.id } });
  revalidatePath("/presupuesto");
  return { ok: true, message: "Pago recurrente eliminado." };
}
