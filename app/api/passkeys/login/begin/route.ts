import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { prisma } from "@/lib/prisma";
import { normalizeEmail, resolveWebAuthnConfig, withExpiry } from "@/lib/passkeys";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { email?: string };
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passkeys: true },
  });
  if (!user || !user.passkeys.length) {
    return NextResponse.json({ error: "No passkey found for this email" }, { status: 404 });
  }

  const { rpID } = resolveWebAuthnConfig(req);
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    allowCredentials: user.passkeys.map((p) => ({
      id: isoBase64URL.toBuffer(p.credentialId),
      type: "public-key",
    })),
  });

  await prisma.passkeyChallenge.create({
    data: {
      userId: user.id,
      email,
      kind: "authentication",
      challenge: options.challenge,
      expiresAt: withExpiry(10),
    },
  });

  return NextResponse.json(options);
}
