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

/**
 * Prisma da el mismo error —"the URL must start with the protocol
 * postgresql://"— cuando el valor está mal escrito y cuando no llega ninguno,
 * así que sin esto no se distingue una variable ausente de una con comillas
 * o con el nombre pegado delante. Solo se registra el esquema y la longitud;
 * la contraseña viaja en la parte que no se imprime.
 */
const datasourceUrl = withConnectionDefaults(process.env.DATABASE_URL);

/*
 * Se registra siempre, no solo al fallar: la ausencia de un log no distingue
 * "todo bien" de "esta línea nunca se ejecutó", y necesitábamos esa
 * diferencia para localizar el fallo. Nunca imprime la contraseña.
 */
console.log("[db] configuración de la conexión:", {
  entornoRecibido: Boolean(process.env.DATABASE_URL),
  longitudEntorno: process.env.DATABASE_URL?.length ?? 0,
  esquemaEntorno: JSON.stringify(process.env.DATABASE_URL?.slice(0, 12) ?? null),
  urlPasadaAPrisma: Boolean(datasourceUrl),
  esquemaPasado: JSON.stringify(datasourceUrl?.slice(0, 12) ?? null),
  serverless: isServerless,
});

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
