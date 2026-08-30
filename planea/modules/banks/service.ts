import { db } from "@/lib/db";

export interface BankDTO {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

/** Entidades bancarias activas disponibles para conectar cuentas. */
export async function listBanks(): Promise<BankDTO[]> {
  const banks = await db.bankEntity.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, color: true },
  });
  return banks;
}
