import type { NextRequest } from "next/server";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function resolveWebAuthnConfig(req: NextRequest): {
  rpID: string;
  expectedOrigin: string;
  rpName: string;
} {
  const headerOrigin = req.headers.get("origin")?.trim();
  const fromEnv =
    process.env.AUTH_ORIGIN?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  const expectedOrigin = fromEnv || headerOrigin || "http://localhost:3000";

  let host = "localhost";
  try {
    host = new URL(expectedOrigin).hostname;
  } catch {
    host = "localhost";
  }

  const rpID = process.env.AUTH_RP_ID?.trim() || host;
  const rpName = process.env.AUTH_RP_NAME?.trim() || "Fundly";
  return { rpID, expectedOrigin, rpName };
}

export function withExpiry(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}
