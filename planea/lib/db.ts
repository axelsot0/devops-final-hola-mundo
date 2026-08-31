import { PrismaClient } from "@/lib/generated/prisma";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function withConnectionDefaults(url: string | undefined) {
  if (!url) return undefined;

  try {
    const databaseUrl = new URL(url);
    if (!databaseUrl.searchParams.has("pool_timeout")) {
      databaseUrl.searchParams.set("pool_timeout", "30");
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
