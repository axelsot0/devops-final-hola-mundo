import { db } from "@/lib/db";
import { bankRulesChanged, withRequiredBankRules } from "./bank-rules";
import { inferCategorySlug } from "./categorize";
import { getCredentialById, markCredentialRevoked } from "./credentials";
import { createGmailProvider } from "./gmail-provider";
import { GmailAuthorizationError } from "./gmail-oauth";
import { matchesBankRules, parseBankEmail } from "./parser";
import type { EmailProvider } from "./provider";

export interface SyncResult {
  ok: boolean;
  error?: string;
  /** El usuario tiene que volver a pulsar "Conectar Gmail". */
  needsReauth?: boolean;
  imported: number;
  skipped: number;
  filtered: number;
}

const EMPTY_COUNTS = { imported: 0, skipped: 0, filtered: 0 };

/**
 * Las sincronizaciones siguientes solo piden lo publicado desde la última,
 * con un día de margen por si algún correo llegó con retraso.
 */
function incrementalSince(lastSyncAt: Date | null) {
  if (!lastSyncAt) return undefined;
  return new Date(lastSyncAt.getTime() - 24 * 60 * 60 * 1000);
}

/**
 * Sincroniza una cuenta: lee el buzón autorizado por su dueño, analiza los
 * correos de la entidad bancaria y crea las transacciones detectadas.
 *
 * Garantías:
 *  - Cada cuenta usa la autorización de su propio usuario.
 *  - Solo se procesan correos que cumplen las reglas del banco.
 *  - Nunca se registra dos veces el mismo correo (unique accountId+externalId).
 *  - Cada transacción guarda la referencia al correo original.
 *
 * `provider` solo se inyecta en pruebas (p. ej. mockEmailProvider); en la
 * app real se construye a partir de la credencial de la cuenta.
 */
export async function syncAccount(
  userId: string,
  accountId: string,
  provider?: EmailProvider,
): Promise<SyncResult> {
  const account = await db.account.findFirst({
    where: { id: accountId, userId },
    include: { bank: true },
  });

  if (!account) {
    return { ok: false, error: "Cuenta no encontrada.", ...EMPTY_COUNTS };
  }

  let credentialId: string | null = null;

  if (!provider) {
    const credential = account.credentialId
      ? await getCredentialById(account.credentialId)
      : null;

    if (!credential || credential.revokedAt) {
      return {
        ok: false,
        error:
          "Esta cuenta no tiene una autorización de Gmail válida. Vuelve a conectarla.",
        needsReauth: true,
        ...EMPTY_COUNTS,
      };
    }

    credentialId = credential.id;
    provider = createGmailProvider(credential);
  }

  try {
    // Una base sembrada con una versión anterior puede tener reglas
    // incompletas; se completan y se guardan antes de filtrar nada.
    const bank = withRequiredBankRules(account.bank);
    if (bankRulesChanged(account.bank, bank)) {
      await db.bankEntity.update({
        where: { id: bank.id },
        data: {
          senderAddresses: bank.senderAddresses,
          senderDomains: bank.senderDomains,
          subjectPatterns: bank.subjectPatterns,
          keywords: bank.keywords,
        },
      });
    }

    await db.account.update({
      where: { id: account.id },
      data: { status: "SYNCING" },
    });

    const emails = await provider.fetchEmails(account.email, {
      senderAddresses: bank.senderAddresses,
      senderDomains: bank.senderDomains,
      subjectPatterns: bank.subjectPatterns,
      keywords: bank.keywords,
      after: incrementalSince(account.lastSyncAt),
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
      if (!matchesBankRules(email, bank)) {
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
      const parsed = parseBankEmail(email, bank.parserKey);
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
            snippet: email.snippet.slice(0, 2000),
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
            description: `Detectado desde correo de ${bank.name}`,
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
    // Marcar el fallo no debe ocultar la causa: si la base también está
    // caída, este update falla y el error original se perdería.
    await db.account
      .update({ where: { id: account.id }, data: { status: "ERROR" } })
      .catch(() => {});

    if (error instanceof GmailAuthorizationError) {
      if (credentialId) {
        await markCredentialRevoked(credentialId).catch(() => {});
      }
      return {
        ok: false,
        error:
          "Google rechazó la autorización de este buzón. Vuelve a conectar Gmail.",
        needsReauth: true,
        ...EMPTY_COUNTS,
      };
    }

    throw error;
  }
}
