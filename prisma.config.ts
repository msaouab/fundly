import "dotenv/config";
import { defineConfig, env } from "prisma/config";
import { normalizePgConnectionString } from "./lib/pg-connection-string";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: normalizePgConnectionString(env("DATABASE_URL")),
  },
});
