import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    console.warn("[Prisma] DATABASE_URL not set — using unconfigured client");
  }
  // Strip pgbouncer=true — it's a Prisma CLI param, not understood by the pg driver
  const connectionString = (raw ?? "").replace(/[?&]pgbouncer=true/i, "").replace(/[?&]$/, "");
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

