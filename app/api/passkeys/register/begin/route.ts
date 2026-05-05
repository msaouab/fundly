import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveWebAuthnConfig, withExpiry } from "@/lib/passkeys";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId || !email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rpID, rpName } = resolveWebAuthnConfig(req);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, passkeys: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const options = await generateRegistrationOptions({
    rpID,
    rpName,
    userID: user.id,
    userName: user.email,
    userDisplayName: user.name ?? user.email,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
    excludeCredentials: user.passkeys.map((p) => ({
      id: isoBase64URL.toBuffer(p.credentialId),
      type: "public-key",
    })),
  });

  await prisma.passkeyChallenge.create({
    data: {
      userId,
      kind: "registration",
      challenge: options.challenge,
      expiresAt: withExpiry(10),
    },
  });

  return NextResponse.json(options);
}
