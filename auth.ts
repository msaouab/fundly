import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

const devWarnKey = "__fundlyAuthSecretWarned" as const;
const globalForAuth = globalThis as unknown as Record<string, boolean | undefined>;

function resolveAuthSecret(): string | undefined {
  const fromEnv =
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") return undefined;
  if (!globalForAuth[devWarnKey]) {
    globalForAuth[devWarnKey] = true;
    console.warn(
      "[auth] AUTH_SECRET is not set. Using a dev-only placeholder. Add AUTH_SECRET to .env (openssl rand -base64 32).",
    );
  }
  return "fundly-dev-placeholder-secret-min-32-chars";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: resolveAuthSecret(),
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        passkeyToken: { label: "Passkey token", type: "text" },
      },
      authorize: async (credentials) => {
        const passkeyToken = credentials?.passkeyToken;
        if (typeof passkeyToken === "string" && passkeyToken) {
          const now = new Date();
          const found = await prisma.passkeyLoginToken.findUnique({
            where: { token: passkeyToken },
            include: { user: true },
          });
          if (
            !found ||
            found.consumedAt ||
            found.expiresAt <= now
          ) {
            return null;
          }
          await prisma.passkeyLoginToken.update({
            where: { id: found.id },
            data: { consumedAt: now },
          });
          // Best effort cleanup for old tokens.
          void prisma.passkeyLoginToken.deleteMany({
            where: { OR: [{ expiresAt: { lt: now } }, { consumedAt: { not: null } }] },
          });
          return {
            id: found.user.id,
            email: found.user.email,
            name: found.user.name,
          };
        }

        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }
        const normalized = email.trim().toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email: normalized },
        });
        if (!user) return null;
        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;
        // Best effort cleanup when users sign in by password.
        void prisma.passkeyLoginToken.deleteMany({
          where: { expiresAt: { lt: new Date() } },
        });
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        if (token.email) session.user.email = token.email as string;
        if (token.name) session.user.name = token.name as string | null;
      }
      return session;
    },
  },
});
