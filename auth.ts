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
      },
      authorize: async (credentials) => {
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
