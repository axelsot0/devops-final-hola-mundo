"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { fromZodError, type ActionState } from "@/lib/action-state";
import { contributeGoalSchema, goalSchema, updateGoalSchema } from "./schemas";

/** Una meta se marca como completada en cuanto se alcanza el objetivo. */
function statusFor(saved: number, target: number) {
  return saved >= target ? ("COMPLETED" as const) : ("ACTIVE" as const);
}

export async function createGoalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = goalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { name, description, targetAmount, savedAmount, targetDate } = parsed.data;
  await db.savingsGoal.create({
    data: {
      userId,
      name,
      description: description || null,
      targetAmount,
      savedAmount,
      targetDate: targetDate instanceof Date ? targetDate : null,
      status: statusFor(savedAmount, targetAmount),
    },
  });

  revalidatePath("/metas");
  return { ok: true, message: "Meta creada." };
}

export async function updateGoalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = updateGoalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const existing = await db.savingsGoal.findFirst({
    where: { id: parsed.data.goalId, userId },
  });
  if (!existing) return { ok: false, error: "Meta no encontrada." };

  const { name, description, targetAmount, savedAmount, targetDate } = parsed.data;
  await db.savingsGoal.update({
    where: { id: existing.id },
    data: {
      name,
      description: description || null,
      targetAmount,
      savedAmount,
      targetDate: targetDate instanceof Date ? targetDate : null,
      status: statusFor(savedAmount, targetAmount),
    },
  });

  revalidatePath("/metas");
  return { ok: true, message: "Meta actualizada." };
}

/** Suma un aporte a la cantidad ahorrada de la meta. */
export async function contributeGoalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = contributeGoalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const goal = await db.savingsGoal.findFirst({
    where: { id: parsed.data.goalId, userId },
  });
  if (!goal) return { ok: false, error: "Meta no encontrada." };

  const saved = Number(goal.savedAmount) + parsed.data.amount;
  const target = Number(goal.targetAmount);
  await db.savingsGoal.update({
    where: { id: goal.id },
    data: { savedAmount: saved, status: statusFor(saved, target) },
  });

  revalidatePath("/metas");
  return {
    ok: true,
    message:
      saved >= target
        ? `¡Felicidades! Completaste "${goal.name}".`
        : "Aporte registrado.",
  };
}

export async function deleteGoalAction(goalId: string) {
  const userId = await requireUserId();
  const existing = await db.savingsGoal.findFirst({
    where: { id: goalId, userId },
  });
  if (!existing) return { ok: false, error: "Meta no encontrada." };

  await db.savingsGoal.delete({ where: { id: existing.id } });
  revalidatePath("/metas");
  return { ok: true, message: "Meta eliminada." };
}
