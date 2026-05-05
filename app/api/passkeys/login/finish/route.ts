import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import type { AuthenticationResponseJSON } from "@simplewebauthn/types";
import { prisma } from "@/lib/prisma";
import { normalizeEmail, resolveWebAuthnConfig, withExpiry } from "@/lib/passkeys";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    email?: string;
    response?: AuthenticationResponseJSON;
  };
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  const response = body?.response;
  if (!email || !response) {
    return NextResponse.json({ error: "Email and authentication response are required" }, { status: 400 });
  }

  const challenge = await prisma.passkeyChallenge.findFirst({
    where: {
      email,
      kind: "authentication",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) {
    return NextResponse.json({ error: "Authentication challenge expired" }, { status: 400 });
  }

  const credential = await prisma.passkeyCredential.findUnique({
    where: { credentialId: response.id },
    include: { user: true },
  });
  if (!credential || normalizeEmail(credential.user.email) !== email) {
    return NextResponse.json({ error: "Passkey not found" }, { status: 404 });
  }

  const { rpID, expectedOrigin } = resolveWebAuthnConfig(req);

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: isoBase64URL.toBuffer(credential.credentialId),
        credentialPublicKey: new Uint8Array(credential.publicKey),
        counter: credential.counter,
      },
    });
  } catch {
    return NextResponse.json({ error: "Passkey verification failed" }, { status: 400 });
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "Authentication not verified" }, { status: 400 });
  }

  const token = randomUUID();

  await prisma.$transaction([
    prisma.passkeyCredential.update({
      where: { id: credential.id },
      data: { counter: verification.authenticationInfo.newCounter },
    }),
    prisma.passkeyChallenge.delete({ where: { id: challenge.id } }),
    prisma.passkeyLoginToken.create({
      data: {
        userId: credential.userId,
        token,
        expiresAt: withExpiry(5),
      },
    }),
    prisma.passkeyLoginToken.deleteMany({
      where: {
        userId: credential.userId,
        OR: [
          { expiresAt: { lt: new Date() } },
          { consumedAt: { not: null } },
        ],
      },
    }),
  ]);

  return NextResponse.json({ ok: true, token });
}
