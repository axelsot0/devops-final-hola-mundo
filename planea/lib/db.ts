import { PrismaClient } from "@/lib/generated/prisma";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** En serverless cada instancia arranca su propio proceso y su propio pool. */
const isServerless = Boolean(process.env.VERCEL);

/**
 * Ajusta la cadena de conexión al entorno.
 *
 * En serverless el pool por defecto de Prisma (num_cpus * 2 + 1) se multiplica
 * por cada instancia viva, y el pooler de Supabase corta en 15 clientes:
 *
 *   FATAL: (EMAXCONNSESSION) max clients reached in session mode
 *
 * Con una conexión por instancia el número de clientes crece con las
 * instancias y no con los núcleos, y la espera de 30 s absorbe las ráfagas
 * de consultas en paralelo de una misma página.
 */
function withConnectionDefaults(url: string | undefined) {
  if (!url) return undefined;

  try {
    const databaseUrl = new URL(url);

    if (!databaseUrl.searchParams.has("pool_timeout")) {
      databaseUrl.searchParams.set("pool_timeout", "30");
    }

    if (isServerless && !databaseUrl.searchParams.has("connection_limit")) {
      databaseUrl.searchParams.set("connection_limit", "1");
    }

    return databaseUrl.toString();
  } catch {
    return url;
  }
}

const datasourceUrl = withConnectionDefaults(process.env.DATABASE_URL);

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    datasourceUrl,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
