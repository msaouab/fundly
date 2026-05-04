import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  /** Bumped when Prisma schema changes so dev HMR does not keep an outdated client. */
  __fundlyPrismaRevision?: number;
};

/** Increment whenever `schema.prisma` changes in a way that affects the client runtime. */
const PRISMA_CLIENT_CACHE_REVISION = 2;

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add your Neon connection string to .env.",
    );
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

/** After `prisma generate`, delegates exist on the class but old HMR-cached instances may use an older DMMF. */
function isStaleClient(client: PrismaClient): boolean {
  const c = client as unknown as { income?: { findMany?: unknown }; expense?: { findMany?: unknown } };
  if (typeof c.income?.findMany !== "function") return true;
  if (typeof c.expense?.findMany !== "function") return true;
  return false;
}

function getOrCreatePrisma(): PrismaClient {
  const cached = globalForPrisma.prisma;
  const revisionOk =
    globalForPrisma.__fundlyPrismaRevision === PRISMA_CLIENT_CACHE_REVISION;
  if (cached && !isStaleClient(cached) && revisionOk) {
    return cached;
  }
  if (cached) {
    void cached.$disconnect().catch(() => {});
    globalForPrisma.prisma = undefined;
    globalForPrisma.__fundlyPrismaRevision = undefined;
  }
  const client = createClient();
  globalForPrisma.prisma = client;
  globalForPrisma.__fundlyPrismaRevision = PRISMA_CLIENT_CACHE_REVISION;
  return client;
}

/**
 * Proxy so `prisma.income` is resolved after hot reload: a cached global client may
 * predate `prisma generate` and lack new model delegates.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getOrCreatePrisma();
    return Reflect.get(client, prop, receiver) as unknown;
  },
}) as PrismaClient;
