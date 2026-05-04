import "dotenv/config";
import { defineConfig } from "prisma/config";
import { normalizePgConnectionString } from "./lib/pg-connection-string";

/**
 * `prisma generate` does not open a DB connection, but Prisma still needs a URL in config.
 * `env("DATABASE_URL")` throws during `npm install` when the variable is unset (common on
 * Vercel before env is wired, or local installs without `.env`). Use a placeholder only for
 * config parsing; runtime uses `DATABASE_URL` in `lib/prisma.ts`.
 */
const PLACEHOLDER_DATABASE_URL =
  "postgresql://prisma-generate-placeholder:unused@127.0.0.1:5432/postgres?sslmode=verify-full";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: normalizePgConnectionString(
      process.env.DATABASE_URL?.trim() || PLACEHOLDER_DATABASE_URL,
    ),
  },
});
