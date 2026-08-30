"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { fromZodError, type ActionState } from "@/lib/action-state";
import { createAccountSchema, updateAccountSchema } from "./schemas";

export async function createAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = createAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const bank = await db.bankEntity.findFirst({
    where: { id: parsed.data.bankId, active: true },
  });
  if (!bank) return { ok: false, error: "La entidad bancaria no existe." };

  const email = parsed.data.email.toLowerCase();
  const existing = await db.account.findFirst({
    where: { userId, email, bankId: bank.id },
  });
  if (existing) {
    return {
      ok: false,
      error: "Ya conectaste este correo con esa entidad bancaria.",
    };
  }

  await db.account.create({
    data: {
      userId,
      email,
      bankId: bank.id,
      nickname: parsed.data.nickname || null,
    },
  });

  revalidatePath("/cuentas");
  return {
    ok: true,
    message: `Cuenta de ${bank.name} conectada. Sincroniza para detectar transacciones.`,
  };
}

export async function updateAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = updateAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const account = await db.account.findFirst({
    where: { id: parsed.data.accountId, userId },
  });
  if (!account) return { ok: false, error: "Cuenta no encontrada." };

  await db.account.update({
    where: { id: account.id },
    data: { nickname: parsed.data.nickname || null },
  });

  revalidatePath("/cuentas");
  return { ok: true, message: "Cuenta actualizada." };
}

export async function deleteAccountAction(accountId: string) {
  const userId = await requireUserId();
  const account = await db.account.findFirst({
    where: { id: accountId, userId },
  });
  if (!account) return { ok: false, error: "Cuenta no encontrada." };

  // Las transacciones se conservan (accountId pasa a null) para no perder el
  // historial financiero del usuario.
  await db.account.delete({ where: { id: account.id } });

  revalidatePath("/cuentas");
  revalidatePath("/");
  return { ok: true, message: "Cuenta desconectada." };
}
