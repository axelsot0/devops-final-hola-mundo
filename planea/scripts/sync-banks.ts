/**
 * Da de alta o actualiza las entidades bancarias del catálogo.
 *
 * Existe porque el seed borra usuarios, cuentas y transacciones antes de
 * sembrar: en una base con gente usándola no se puede ejecutar. Este script
 * solo hace upsert por slug, nunca elimina nada.
 *
 *   npx tsx --env-file=.env scripts/sync-banks.ts
 */
import { PrismaClient } from "../lib/generated/prisma";
import { BANKS } from "../modules/email-sync/bank-rules";

const db = new PrismaClient();

async function main() {
  for (const bank of BANKS) {
    const existing = await db.bankEntity.findUnique({
      where: { slug: bank.slug },
      select: { id: true },
    });

    await db.bankEntity.upsert({
      where: { slug: bank.slug },
      create: { ...bank, active: true },
      update: {
        name: bank.name,
        color: bank.color,
        parserKey: bank.parserKey,
        senderAddresses: bank.senderAddresses,
        senderDomains: bank.senderDomains,
        subjectPatterns: bank.subjectPatterns,
        keywords: bank.keywords,
        active: true,
      },
    });

    console.log(`${existing ? "~ actualizado" : "+ creado"}  ${bank.name}`);
  }

  console.log(`\n✅ ${BANKS.length} entidades sincronizadas.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
