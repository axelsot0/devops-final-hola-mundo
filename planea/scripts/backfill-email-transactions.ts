/**
 * Reprocesa los correos bancarios ya importados.
 *
 * Sirve para dos arreglos que no requieren volver a sincronizar Gmail:
 *  1. Crear las categorías del sistema que falten (sin borrar nada).
 *  2. Volver a pasar el parser sobre cada EmailMessage guardado y completar
 *     comercio, categoría y fecha en la transacción asociada.
 *
 * Por defecto solo muestra lo que haría; usar --apply para escribir.
 *
 *   npx tsx --env-file=.env scripts/backfill-email-transactions.ts
 *   npx tsx --env-file=.env scripts/backfill-email-transactions.ts --apply
 */
import { PrismaClient } from "../lib/generated/prisma";
import { SYSTEM_CATEGORIES } from "../lib/system-categories";
import { inferCategorySlug } from "../modules/email-sync/categorize";
import { parseBankEmail } from "../modules/email-sync/parser";

const db = new PrismaClient();
const apply = process.argv.includes("--apply");

async function ensureSystemCategories() {
  const existing = await db.category.findMany({
    where: { isSystem: true },
    select: { id: true, slug: true },
  });
  const bySlug = new Map(existing.map((c) => [c.slug, c.id]));

  for (const category of SYSTEM_CATEGORIES) {
    if (bySlug.has(category.slug)) continue;

    console.log(`  + falta categoría "${category.slug}"`);
    if (!apply) continue;

    const created = await db.category.create({
      data: { ...category, isSystem: true },
    });
    bySlug.set(category.slug, created.id);
  }

  return bySlug;
}

async function main() {
  console.log(apply ? "✍️  Modo escritura (--apply)" : "👀 Simulación (sin escribir)");

  console.log("🏷️ Revisando categorías del sistema…");
  const categoryBySlug = await ensureSystemCategories();
  console.log(`   ${categoryBySlug.size}/${SYSTEM_CATEGORIES.length} categorías disponibles.`);

  console.log("📧 Reprocesando correos importados…");
  const emails = await db.emailMessage.findMany({
    include: { transaction: true },
    orderBy: { receivedAt: "desc" },
  });

  let updated = 0;
  let unchanged = 0;
  let unparsed = 0;

  for (const email of emails) {
    if (!email.transaction) continue;

    const parsed = parseBankEmail({
      externalId: email.externalId,
      from: email.fromAddress,
      subject: email.subject,
      snippet: email.snippet ?? "",
      receivedAt: email.receivedAt,
    });

    if (!parsed) {
      unparsed++;
      console.warn(`  ⚠️ sin reconocer: ${email.externalId} — ${email.subject}`);
      continue;
    }

    const slug = inferCategorySlug(parsed.merchant, parsed.description);
    const categoryId = categoryBySlug.get(slug) ?? null;

    const current = email.transaction;
    const changes: Record<string, unknown> = {};
    if (current.merchant !== parsed.merchant) changes.merchant = parsed.merchant;
    if (current.categoryId !== categoryId) changes.categoryId = categoryId;
    if (current.date.getTime() !== parsed.date.getTime()) changes.date = parsed.date;

    if (Object.keys(changes).length === 0) {
      unchanged++;
      continue;
    }

    console.log(
      `  ~ ${parsed.merchant ?? "(sin comercio)"} → ${slug}` +
        (categoryId ? "" : " (categoría inexistente)"),
    );

    if (apply) {
      await db.transaction.update({ where: { id: current.id }, data: changes });
    }
    updated++;
  }

  console.log(
    apply
      ? `✅ ${updated} transacción(es) actualizada(s), ${unchanged} sin cambios, ${unparsed} sin reconocer.`
      : `ℹ️ ${updated} transacción(es) cambiarían, ${unchanged} sin cambios, ${unparsed} sin reconocer. Ejecuta con --apply para guardar.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
