"use server";

import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";

export type RegisterState = {
  error?: string;
  fieldErrors?: Partial<Record<"email" | "password" | "name", string>>;
  success?: boolean;
};

export async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name") || undefined,
  };

  const parsed = registerSchema.safeParse({
    email: typeof raw.email === "string" ? raw.email : "",
    password: typeof raw.password === "string" ? raw.password : "",
    name:
      typeof raw.name === "string" && raw.name.trim() !== ""
        ? raw.name
        : undefined,
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        email: flat.email?.[0],
        password: flat.password?.[0],
        name: flat.name?.[0],
      },
    };
  }

  const { email, password, name } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await hash(password, 12);
  await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      name: name?.trim() || null,
    },
  });

  return { success: true };
}
