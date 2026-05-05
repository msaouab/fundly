"use server";

import { compare, hash } from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type ChangePasswordState = {
  success?: boolean;
  error?: string;
  fieldErrors?: {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };
};

export type UpdateNameState = {
  success?: boolean;
  error?: string;
  fieldErrors?: {
    name?: string;
  };
  name?: string;
};

function validate(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): ChangePasswordState["fieldErrors"] | null {
  const fieldErrors: NonNullable<ChangePasswordState["fieldErrors"]> = {};

  if (!input.currentPassword) {
    fieldErrors.currentPassword = "Current password is required.";
  }
  if (!input.newPassword) {
    fieldErrors.newPassword = "New password is required.";
  } else if (input.newPassword.length < 8) {
    fieldErrors.newPassword = "New password must be at least 8 characters.";
  }
  if (!input.confirmPassword) {
    fieldErrors.confirmPassword = "Please confirm the new password.";
  } else if (input.confirmPassword !== input.newPassword) {
    fieldErrors.confirmPassword = "Passwords do not match.";
  }
  if (
    input.currentPassword &&
    input.newPassword &&
    input.currentPassword === input.newPassword
  ) {
    fieldErrors.newPassword = "New password must be different from current password.";
  }

  return Object.keys(fieldErrors).length ? fieldErrors : null;
}

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "Unauthorized." };

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const fieldErrors = validate({
    currentPassword,
    newPassword,
    confirmPassword,
  });
  if (fieldErrors) return { fieldErrors };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  });
  if (!user) return { error: "Account not found." };

  const ok = await compare(currentPassword, user.passwordHash);
  if (!ok) {
    return { fieldErrors: { currentPassword: "Current password is incorrect." } };
  }

  const nextHash = await hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: nextHash },
  });

  return { success: true };
}

export async function updateNameAction(
  _prev: UpdateNameState,
  formData: FormData,
): Promise<UpdateNameState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "Unauthorized." };

  const raw = String(formData.get("name") ?? "");
  const name = raw.trim();
  if (name.length > 80) {
    return { fieldErrors: { name: "Name must be 80 characters or less." } };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { name: name || null },
  });

  return { success: true, name };
}
