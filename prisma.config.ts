// Prisma 7 config — loaded by Prisma CLI for migrations/schema push
// App runtime uses @prisma/adapter-pg in src/lib/db/prisma.ts

import "dotenv/config";
import { config } from "dotenv";

// Load .env.local (Next.js convention) — overrides .env
config({ path: ".env.local", override: true });

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use DIRECT_URL for migrations (bypasses pgBouncer pooler)
    // Falls back to DATABASE_URL if DIRECT_URL not set
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
