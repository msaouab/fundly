import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveWebAuthnConfig } from "@/lib/passkeys";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    response?: RegistrationResponseJSON;
    name?: string;
  };
  if (!body?.response) {
    return NextResponse.json({ error: "Missing registration response" }, { status: 400 });
  }

  const challenge = await prisma.passkeyChallenge.findFirst({
    where: {
      userId,
      kind: "registration",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) {
    return NextResponse.json({ error: "Registration challenge expired" }, { status: 400 });
  }

  const { rpID, expectedOrigin } = resolveWebAuthnConfig(req);

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin,
      expectedRPID: rpID,
    });
  } catch {
    return NextResponse.json({ error: "Passkey verification failed" }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Passkey registration not verified" }, { status: 400 });
  }

  const registration = verification.registrationInfo;
  const credentialId = isoBase64URL.fromBuffer(registration.credentialID);
  const exists = await prisma.passkeyCredential.findUnique({
    where: { credentialId },
    select: { id: true },
  });
  if (exists) {
    await prisma.passkeyChallenge.delete({ where: { id: challenge.id } });
    return NextResponse.json({ ok: true, alreadyExists: true });
  }

  await prisma.passkeyCredential.create({
    data: {
      userId,
      credentialId,
      publicKey: Buffer.from(registration.credentialPublicKey),
      counter: registration.counter,
      transports: body.response.response.transports ?? undefined,
      deviceType: registration.credentialDeviceType,
      backedUp: registration.credentialBackedUp,
      name: body.name?.trim() || null,
    },
  });

  await prisma.passkeyChallenge.delete({ where: { id: challenge.id } });

  return NextResponse.json({ ok: true });
}
