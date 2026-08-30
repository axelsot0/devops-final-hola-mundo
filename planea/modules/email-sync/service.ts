import { db } from "@/lib/db";
import { mockEmailProvider } from "./mock-inbox";
import { inferCategorySlug } from "./categorize";
import { matchesBankRules, parseBankEmail } from "./parser";
import type { EmailProvider } from "./provider";

export interface SyncResult {
  ok: boolean;
  error?: string;
  imported: number;
  skipped: number;
  filtered: number;
}

/**
 * Sincroniza una cuenta: busca los correos de la entidad bancaria
 * configurada, los analiza y crea las transacciones detectadas.
 *
 * Garantías:
 *  - Solo se procesan correos que cumplen las reglas del banco.
 *  - Nunca se registra dos veces el mismo correo (unique accountId+externalId).
 *  - Cada transacción guarda la referencia al correo original.
 */
export async function syncAccount(
  userId: string,
  accountId: string,
  provider: EmailProvider = mockEmailProvider,
): Promise<SyncResult> {
  const account = await db.account.findFirst({
    where: { id: accountId, userId },
    include: { bank: true },
  });
  if (!account) {
    return { ok: false, error: "Cuenta no encontrada.", imported: 0, skipped: 0, filtered: 0 };
  }

  await db.account.update({
    where: { id: account.id },
    data: { status: "SYNCING" },
  });

  try {
    const emails = await provider.fetchEmails(account.email, {
      senderAddresses: account.bank.senderAddresses,
      senderDomains: account.bank.senderDomains,
      subjectPatterns: account.bank.subjectPatterns,
    });

    // Categorías del sistema para clasificar automáticamente
    const categories = await db.category.findMany({
      where: { isSystem: true },
      select: { id: true, slug: true },
    });
    const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));

    let imported = 0;
    let skipped = 0;
    let filtered = 0;

    for (const email of emails) {
      // 1. Aplicar las reglas de identificación de la entidad bancaria
      if (!matchesBankRules(email, account.bank)) {
        filtered++;
        continue;
      }

      // 2. Evitar procesar dos veces el mismo correo
      const existing = await db.emailMessage.findUnique({
        where: {
          accountId_externalId: {
            accountId: account.id,
            externalId: email.externalId,
          },
        },
      });
      if (existing) {
        skipped++;
        continue;
      }

      // 3. Analizar el mensaje financiero
      const parsed = parseBankEmail(email, account.bank.parserKey);
      if (!parsed) {
        filtered++;
        continue;
      }

      // 4. Crear la transacción con referencia al correo original
      const categorySlug = inferCategorySlug(parsed.merchant, parsed.description);
      await db.$transaction(async (tx) => {
        const stored = await tx.emailMessage.create({
          data: {
            accountId: account.id,
            externalId: email.externalId,
            fromAddress: email.from,
            subject: email.subject,
            snippet: email.snippet,
            receivedAt: email.receivedAt,
          },
        });
        await tx.transaction.create({
          data: {
            userId,
            accountId: account.id,
            type: parsed.type,
            amount: parsed.amount,
            currency: parsed.currency,
            merchant: parsed.merchant,
            description: `Detectado desde correo de ${account.bank.name}`,
            date: parsed.date,
            categoryId: categoryBySlug.get(categorySlug) ?? null,
            source: "EMAIL",
            externalRef: email.externalId,
            emailId: stored.id,
          },
        });
      });
      imported++;
    }

    await db.account.update({
      where: { id: account.id },
      data: { status: "CONNECTED", lastSyncAt: new Date() },
    });

    return { ok: true, imported, skipped, filtered };
  } catch (error) {
    await db.account.update({
      where: { id: account.id },
      data: { status: "ERROR" },
    });
    throw error;
  }
}
