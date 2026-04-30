import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // During build/type-gen without a real DB — return a stub-capable client
    // It will fail at runtime if no DB is configured, which is expected.
    console.warn("[Prisma] DATABASE_URL not set — using unconfigured client");
  }
  
  // For Supabase, ensure we're using connection pooler (port 6543) not direct connection (5432)
  let finalConnectionString = connectionString ?? "";
  if (finalConnectionString && !finalConnectionString.includes("pooling")) {
    console.warn(
      "[Prisma] Warning: DATABASE_URL doesn't use Supabase pooler. " +
      "Change :5432 to :6543 in your connection string for better reliability."
    );
  }
  
  const adapter = new PrismaPg({ 
    connectionString: finalConnectionString,
    // Add connection string parameters for timeout handling
    schema: "public",
  });
  
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

