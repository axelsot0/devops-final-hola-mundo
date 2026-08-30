"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { fromZodError, type ActionState } from "@/lib/action-state";
import { createTransactionSchema, updateTransactionSchema } from "./schemas";

/** Valida que la categoría/cuenta referenciada sea accesible por el usuario. */
async function validateRefs(
  userId: string,
  categoryId?: string,
  accountId?: string,
) {
  if (categoryId) {
    const category = await db.category.findFirst({
      where: { id: categoryId, OR: [{ isSystem: true }, { userId }] },
    });
    if (!category) return "Categoría inválida.";
  }
  if (accountId) {
    const account = await db.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) return "Cuenta inválida.";
  }
  return null;
}

export async function createTransactionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const raw = Object.fromEntries(formData);
  const parsed = createTransactionSchema.safeParse({
    ...raw,
    categoryId: raw.categoryId || undefined,
    accountId: raw.accountId || undefined,
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const refError = await validateRefs(userId, parsed.data.categoryId, parsed.data.accountId);
  if (refError) return { ok: false, error: refError };

  await db.transaction.create({
    data: {
      userId,
      type: parsed.data.type,
      amount: parsed.data.amount,
      merchant: parsed.data.merchant || null,
      description: parsed.data.description || null,
      date: parsed.data.date,
      categoryId: parsed.data.categoryId ?? null,
      accountId: parsed.data.accountId ?? null,
      source: "MANUAL",
    },
  });

  revalidatePath("/");
  return { ok: true, message: "Transacción registrada." };
}

export async function updateTransactionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const raw = Object.fromEntries(formData);
  const parsed = updateTransactionSchema.safeParse({
    ...raw,
    categoryId: raw.categoryId || undefined,
    accountId: raw.accountId || undefined,
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const existing = await db.transaction.findFirst({
    where: { id: parsed.data.transactionId, userId },
  });
  if (!existing) return { ok: false, error: "Transacción no encontrada." };

  const refError = await validateRefs(userId, parsed.data.categoryId, parsed.data.accountId);
  if (refError) return { ok: false, error: refError };

  await db.transaction.update({
    where: { id: existing.id },
    data: {
      type: parsed.data.type,
      amount: parsed.data.amount,
      merchant: parsed.data.merchant || null,
      description: parsed.data.description || null,
      date: parsed.data.date,
      categoryId: parsed.data.categoryId ?? null,
      accountId: parsed.data.accountId ?? null,
    },
  });

  revalidatePath("/");
  return { ok: true, message: "Transacción actualizada." };
}

export async function deleteTransactionAction(transactionId: string) {
  const userId = await requireUserId();
  const existing = await db.transaction.findFirst({
    where: { id: transactionId, userId },
  });
  if (!existing) return { ok: false, error: "Transacción no encontrada." };

  await db.transaction.delete({ where: { id: existing.id } });
  revalidatePath("/");
  return { ok: true, message: "Transacción eliminada." };
}
