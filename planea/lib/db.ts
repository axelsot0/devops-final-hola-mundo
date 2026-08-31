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

/**
 * El cliente se guarda en globalThis también en producción, no solo para
 * sobrevivir al hot reload.
 *
 * El empaquetado divide este módulo entre el chunk de SSR y el de los Server
 * Components, y cada copia instanciaría su propio PrismaClient —es decir, su
 * propio pool— dentro del mismo proceso. Compartirlo por globalThis deja una
 * sola conexión por instancia, que es lo que el pooler cuenta.
 */
globalForPrisma.prisma = db;
