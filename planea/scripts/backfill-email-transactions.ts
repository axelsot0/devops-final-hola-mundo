/**
 * Reprocesa los correos bancarios ya importados.
 *
 * Sirve para arreglar lo que quedó mal registrado antes de mejorar el parser,
 * sin volver a consultar Gmail:
 *  1. Crea las categorías del sistema que falten (sin borrar nada).
 *  2. Vuelve a pasar el parser —el de cada banco— sobre cada EmailMessage
 *     guardado y completa comercio, categoría y fecha.
 *  3. Marca como internos los ingresos a nombre del propio titular.
 *  4. Guarda en cada cuenta el saldo del correo más reciente que lo informe.
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
import { isSamePerson } from "../modules/email-sync/self-transfer";

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
    include: {
      transaction: true,
      // El parser correcto depende del banco: usar el genérico con un correo
      // de Qik tomaría el saldo disponible como si fuera el monto.
      account: {
        select: {
          id: true,
          bank: { select: { parserKey: true } },
          user: { select: { name: true } },
        },
      },
    },
    orderBy: { receivedAt: "asc" },
  });

  let updated = 0;
  let unchanged = 0;
  let unparsed = 0;
  let internos = 0;

  /** Saldo más reciente informado por cuenta. */
  const balances = new Map<string, { amount: number; at: Date }>();

  for (const email of emails) {
    const parsed = parseBankEmail(
      {
        externalId: email.externalId,
        from: email.fromAddress,
        subject: email.subject,
        snippet: email.snippet ?? "",
        receivedAt: email.receivedAt,
      },
      email.account.bank.parserKey,
    );

    if (!parsed) {
      unparsed++;
      console.warn(`  ⚠️ sin reconocer: ${email.externalId} — ${email.subject}`);
      continue;
    }

    if (parsed.balance != null) {
      const current = balances.get(email.account.id);
      if (!current || email.receivedAt > current.at) {
        balances.set(email.account.id, {
          amount: parsed.balance,
          at: email.receivedAt,
        });
      }
    }

    if (!email.transaction) continue;

    const slug = inferCategorySlug(parsed.merchant, parsed.description);
    const categoryId = categoryBySlug.get(slug) ?? null;
    const isInternal =
      parsed.type === "INCOME" &&
      isSamePerson(parsed.merchant, email.account.user.name);

    const current = email.transaction;
    const changes: Record<string, unknown> = {};
    if (current.merchant !== parsed.merchant) changes.merchant = parsed.merchant;
    if (current.categoryId !== categoryId) changes.categoryId = categoryId;
    if (current.type !== parsed.type) changes.type = parsed.type;
    if (Number(current.amount) !== parsed.amount) changes.amount = parsed.amount;
    if (current.date.getTime() !== parsed.date.getTime()) changes.date = parsed.date;
    if (current.isInternal !== isInternal) changes.isInternal = isInternal;

    if (Object.keys(changes).length === 0) {
      unchanged++;
      continue;
    }

    if (isInternal && !current.isInternal) internos++;

    console.log(
      `  ~ ${parsed.merchant ?? "(sin comercio)"} → ${slug}` +
        (isInternal ? " [traspaso propio]" : "") +
        (categoryId ? "" : " (categoría inexistente)"),
    );

    if (apply) {
      await db.transaction.update({ where: { id: current.id }, data: changes });
    }
    updated++;
  }

  console.log("\n💰 Saldos informados por el banco…");
  for (const [accountId, balance] of balances) {
    console.log(`  ~ cuenta ${accountId}: ${balance.amount} (${balance.at.toISOString().slice(0, 10)})`);
    if (apply) {
      await db.account.update({
        where: { id: accountId },
        data: { balance: balance.amount, balanceAt: balance.at },
      });
    }
  }
  if (balances.size === 0) console.log("  (ningún banco informó saldo)");

  console.log(
    apply
      ? `\n✅ ${updated} transacción(es) actualizada(s), ${internos} marcada(s) como traspaso propio, ${unchanged} sin cambios, ${unparsed} sin reconocer.`
      : `\nℹ️ ${updated} transacción(es) cambiarían, ${internos} pasarían a traspaso propio, ${unchanged} sin cambios, ${unparsed} sin reconocer. Ejecuta con --apply para guardar.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
