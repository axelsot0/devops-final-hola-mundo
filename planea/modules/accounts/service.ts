import { db } from "@/lib/db";
import type { AccountStatus } from "@/lib/generated/prisma";

export interface AccountDTO {
  id: string;
  email: string;
  nickname: string | null;
  status: AccountStatus;
  connectedAt: Date;
  lastSyncAt: Date | null;
  bank: { id: string; name: string; slug: string; color: string | null };
  transactionCount: number;
}

export async function listAccounts(userId: string): Promise<AccountDTO[]> {
  const accounts = await db.account.findMany({
    where: { userId },
    orderBy: { connectedAt: "asc" },
    include: {
      bank: { select: { id: true, name: true, slug: true, color: true } },
      _count: { select: { transactions: true } },
    },
  });
  return accounts.map((a) => ({
    id: a.id,
    email: a.email,
    nickname: a.nickname,
    status: a.status,
    connectedAt: a.connectedAt,
    lastSyncAt: a.lastSyncAt,
    bank: a.bank,
    transactionCount: a._count.transactions,
  }));
}

/** Devuelve la cuenta solo si pertenece al usuario (autorización por recurso). */
export async function getOwnedAccount(userId: string, accountId: string) {
  return db.account.findFirst({
    where: { id: accountId, userId },
    include: { bank: true },
  });
}
