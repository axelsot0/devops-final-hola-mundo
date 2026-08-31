import { db } from "@/lib/db";
import { inferCategorySlug } from "./categorize";
import { matchesBankRules, parseBankEmail } from "./parser";
import type { EmailProvider } from "./provider";

const REQUIRED_BANK_RULES_BY_SLUG = {
  "banco-popular": {
    senderAddresses: [
      "notificaciones@popularenlinea.com",
      "notificaciones@popularenlinea.com.do",
    ],
    senderDomains: ["popularenlinea.com", "popularenlinea.com.do", "bpd.com.do"],
    subjectPatterns: [
      "Notificación de Consumo",
      "Notificación de transacción",
      "Notificación de Transacción",
      "Notificación de Depósito",
      "Notificación de Deposito",
      "Notificación de Crédito",
      "Notificación de Credito",
      "Depósito recibido",
      "Deposito recibido",
      "Transferencia recibida",
      "Pago recibido",
      "Crédito recibido",
      "Credito recibido",
    ],
    keywords: [
      "consumo",
      "tarjeta",
      "monto",
      "RD$",
      "depósito",
      "deposito",
      "acreditó",
      "acredito",
      "crédito",
      "credito",
      "transferencia recibida",
      "pago recibido",
      "nómina",
      "nomina",
      "salario",
    ],
  },
} as const;

type BankRules = {
  id: string;
  slug: string;
  senderAddresses: string[];
  senderDomains: string[];
  subjectPatterns: string[];
  keywords: string[];
};

function mergeUnique(values: string[], required: readonly string[]) {
  return [...new Set([...required, ...values].map((value) => value.trim()))]
    .filter(Boolean);
}

function ensureRequiredBankRules<T extends BankRules>(bank: T): T {
  const required =
    REQUIRED_BANK_RULES_BY_SLUG[
      bank.slug as keyof typeof REQUIRED_BANK_RULES_BY_SLUG
    ];

  if (!required) return bank;

  return {
    ...bank,
    senderAddresses: mergeUnique(
      bank.senderAddresses,
      required.senderAddresses,
    ),
    senderDomains: mergeUnique(bank.senderDomains, required.senderDomains),
    subjectPatterns: mergeUnique(
      bank.subjectPatterns,
      required.subjectPatterns,
    ),
    keywords: mergeUnique(bank.keywords, required.keywords),
  };
}

function rulesChanged(before: BankRules, after: BankRules) {
  return (
    before.senderAddresses.join("\n") !== after.senderAddresses.join("\n") ||
    before.senderDomains.join("\n") !== after.senderDomains.join("\n") ||
    before.subjectPatterns.join("\n") !== after.subjectPatterns.join("\n") ||
    before.keywords.join("\n") !== after.keywords.join("\n")
  );
}

export interface SyncResult {
  ok: boolean;
  error?: string;
  imported: number;
  skipped: number;
  filtered: number;
}

/**
 * Sincroniza una cuenta utilizando explícitamente el proveedor recibido.
 *
 * El proveedor es obligatorio:
 * - gmailEmailProvider -> Gmail real.
 * - mockEmailProvider -> únicamente pruebas.
 *
 * Este servicio NO utiliza mocks automáticamente.
 */
export async function syncAccount(
  userId: string,
  accountId: string,
  provider: EmailProvider,
): Promise<SyncResult> {
  console.log("==========================================");
  console.log("[sync] SOLICITUD DE SINCRONIZACIÓN");
  console.log("[sync] accountId:", accountId);
  console.log("==========================================");

  /*
   * PASO 1
   * Buscar la cuenta antes de tocar Gmail.
   *
   * Si falla aquí, el problema es Prisma/Supabase,
   * no Gmail.
   */
  console.log("[sync] 1/7 Buscando cuenta en la base de datos...");

  const account = await db.account.findFirst({
    where: {
      id: accountId,
      userId,
    },
    include: {
      bank: true,
    },
  });

  if (!account) {
    console.warn("[sync] Cuenta no encontrada.");

    return {
      ok: false,
      error: "Cuenta no encontrada.",
      imported: 0,
      skipped: 0,
      filtered: 0,
    };
  }

  console.log("[sync] Cuenta encontrada:", {
    accountId: account.id,
    email: account.email,
    bank: account.bank.name,
    parserKey: account.bank.parserKey,
  });

  try {
    const bank = ensureRequiredBankRules(account.bank);

    if (rulesChanged(account.bank, bank)) {
      console.log("[sync] Actualizando reglas mínimas del banco:", {
        bank: bank.name,
        senderAddresses: bank.senderAddresses,
        senderDomains: bank.senderDomains,
        subjectPatterns: bank.subjectPatterns,
        keywords: bank.keywords,
      });

      await db.bankEntity.update({
        where: {
          id: bank.id,
        },
        data: {
          senderAddresses: bank.senderAddresses,
          senderDomains: bank.senderDomains,
          subjectPatterns: bank.subjectPatterns,
          keywords: bank.keywords,
        },
      });
    }

    /*
     * PASO 2
     * Marcar la cuenta como sincronizando.
     */
    console.log("[sync] 2/7 Marcando cuenta como SYNCING...");

    await db.account.update({
      where: {
        id: account.id,
      },
      data: {
        status: "SYNCING",
      },
    });

    /*
     * PASO 3
     * Aquí empieza realmente Gmail.
     */
    console.log("[sync] 3/7 INVOCANDO PROVEEDOR DE CORREO");
    console.log("🔥 Si estamos usando gmailEmailProvider, Gmail empieza aquí 🔥");

    console.log("[sync] Reglas bancarias:", {
      senderAddresses: bank.senderAddresses,
      senderDomains: bank.senderDomains,
      subjectPatterns: bank.subjectPatterns,
    });

    const emails = await provider.fetchEmails(account.email, {
      senderAddresses: bank.senderAddresses,
      senderDomains: bank.senderDomains,
      subjectPatterns: bank.subjectPatterns,
      keywords: bank.keywords,
    });

    console.log(
      `[sync] ✅ Proveedor respondió con ${emails.length} correo(s).`,
    );

    /*
     * PASO 4
     * Obtener categorías disponibles.
     */
    console.log("[sync] 4/7 Cargando categorías...");

    const categories = await db.category.findMany({
      where: {
        isSystem: true,
      },
      select: {
        id: true,
        slug: true,
      },
    });

    const categoryBySlug = new Map(
      categories.map((category) => [
        category.slug,
        category.id,
      ]),
    );

    console.log(
      `[sync] ${categories.length} categorías del sistema disponibles.`,
    );

    let imported = 0;
    let skipped = 0;
    let filtered = 0;

    /*
     * PASO 5
     * Procesar los correos individualmente.
     */
    console.log("[sync] 5/7 Procesando mensajes...");

    for (const email of emails) {
      console.log("------------------------------------------");

      console.log("[sync] Correo:", {
        externalId: email.externalId,
        from: email.from,
        subject: email.subject,
        receivedAt: email.receivedAt,
      });

      /*
       * 5.1 Validar que corresponda al banco.
       */
      const matchesRules = matchesBankRules(
        email,
        bank,
      );

      if (!matchesRules) {
        console.warn(
          "[sync] ❌ Correo rechazado por las reglas del banco.",
          {
            externalId: email.externalId,
            from: email.from,
            subject: email.subject,
          },
        );

        filtered++;
        continue;
      }

      console.log("[sync] ✅ Coincide con las reglas del banco.");

      /*
       * 5.2 Evitar importar el mismo mensaje dos veces.
       */
      const existing = await db.emailMessage.findUnique({
        where: {
          accountId_externalId: {
            accountId: account.id,
            externalId: email.externalId,
          },
        },
      });

      if (existing) {
        console.log("[sync] ⏭️ Correo ya procesado:", {
          externalId: email.externalId,
        });

        skipped++;
        continue;
      }

      /*
       * 5.3 Interpretar el contenido bancario.
       */
      console.log(
        `[sync] Ejecutando parser "${bank.parserKey}"...`,
      );

      const parsed = parseBankEmail(
        email,
        bank.parserKey,
      );

      if (!parsed) {
        console.warn(
          "[sync] ❌ El parser no pudo reconocer la transacción.",
        );

        console.warn("[sync] Información para depuración:", {
          externalId: email.externalId,
          from: email.from,
          subject: email.subject,

          // Solo mostramos una parte del contenido.
          bodyPreview: email.snippet.slice(0, 500),
        });

        filtered++;
        continue;
      }

      console.log("[sync] ✅ TRANSACCIÓN DETECTADA:", {
        externalId: email.externalId,
        type: parsed.type,
        amount: parsed.amount,
        currency: parsed.currency,
        merchant: parsed.merchant,
        description: parsed.description,
        date: parsed.date,
      });

      /*
       * 5.4 Clasificación automática.
       */
      const categorySlug = inferCategorySlug(
        parsed.merchant,
        parsed.description,
      );

      const categoryId =
        categoryBySlug.get(categorySlug) ?? null;

      console.log("[sync] Categoría inferida:", {
        categorySlug,
        categoryFound: Boolean(categoryId),
      });

      /*
       * 5.5 Guardar correo + transacción.
       *
       * Se hace dentro de una transacción Prisma:
       * o se crean ambos o ninguno.
       */
      await db.$transaction(async (tx) => {
        const storedEmail = await tx.emailMessage.create({
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

            description: `Detectado desde correo de ${bank.name}`,

            date: parsed.date,

            categoryId,

            source: "EMAIL",

            /*
             * El ID original de Gmail nos sirve como
             * referencia externa y protección adicional.
             */
            externalRef: email.externalId,

            /*
             * Relación directa con el correo almacenado.
             */
            emailId: storedEmail.id,
          },
        });
      });

      imported++;

      console.log("[sync] 💾 Transacción guardada correctamente.");
    }

    /*
     * PASO 6
     * Actualizar estado.
     */
    console.log("[sync] 6/7 Actualizando estado de la cuenta...");

    await db.account.update({
      where: {
        id: account.id,
      },
      data: {
        status: "CONNECTED",
        lastSyncAt: new Date(),
      },
    });

    /*
     * PASO 7
     * Resultado.
     */
    console.log("[sync] 7/7 SINCRONIZACIÓN TERMINADA");

    console.log("[sync] Resultado:", {
      imported,
      skipped,
      filtered,
      totalEmails: emails.length,
    });

    console.log("==========================================");

    return {
      ok: true,
      imported,
      skipped,
      filtered,
    };
  } catch (error) {
    /*
     * MUY IMPORTANTE:
     *
     * Si Prisma/Supabase está caído, intentar actualizar
     * status aquí también puede fallar.
     *
     * Por eso ese segundo error se captura independientemente
     * para no ocultar el error original.
     */
    console.error("==========================================");
    console.error("[sync] ❌ ERROR DE SINCRONIZACIÓN");
    console.error(error);
    console.error("==========================================");

    try {
      await db.account.update({
        where: {
          id: account.id,
        },
        data: {
          status: "ERROR",
        },
      });
    } catch (statusError) {
      console.error(
        "[sync] No se pudo marcar la cuenta como ERROR:",
        statusError,
      );
    }

    throw error;
  }
}
