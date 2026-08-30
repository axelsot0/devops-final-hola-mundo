import { db } from "@/lib/db";
import type { GoalStatus } from "@/lib/generated/prisma";

export interface SavingsGoalDTO {
  id: string;
  name: string;
  description: string | null;
  targetAmount: number;
  savedAmount: number;
  targetDate: Date | null;
  status: GoalStatus;
  /** 0-100 */
  percentage: number;
  /** Cuánto habría que ahorrar al mes para llegar a la fecha objetivo */
  monthlyNeeded: number | null;
}

export async function listGoals(userId: string): Promise<SavingsGoalDTO[]> {
  const goals = await db.savingsGoal.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { targetDate: "asc" }],
  });

  const now = new Date();
  return goals.map((g) => {
    const target = Number(g.targetAmount);
    const saved = Number(g.savedAmount);
    const remaining = Math.max(0, target - saved);
    let monthlyNeeded: number | null = null;
    if (g.targetDate && remaining > 0) {
      const months = Math.max(
        1,
        (g.targetDate.getUTCFullYear() - now.getUTCFullYear()) * 12 +
          (g.targetDate.getUTCMonth() - now.getUTCMonth()),
      );
      monthlyNeeded = Math.ceil(remaining / months);
    }
    return {
      id: g.id,
      name: g.name,
      description: g.description,
      targetAmount: target,
      savedAmount: saved,
      targetDate: g.targetDate,
      status: g.status,
      percentage: target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0,
      monthlyNeeded,
    };
  });
}
