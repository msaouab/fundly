import type { Metadata } from "next";
import { auth } from "@/auth";
import { ChangePasswordForm } from "@/components/change-password-form";
import { ProfileNameForm } from "@/components/profile-name-form";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const profile = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      })
    : null;
  const name = profile?.name?.trim() || "Account";
  const email = profile?.email?.trim() || session?.user?.email?.trim() || "No email";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage account details and password security.
        </p>
      </header>

      <Card className="border-border dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Basic account information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-border px-3 py-2 dark:border-zinc-800">
            <ProfileNameForm initialName={name === "Account" ? "" : name} />
          </div>
          <div className="rounded-lg border border-border px-3 py-2 dark:border-zinc-800">
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm font-medium text-foreground">{email}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">Security</CardTitle>
          <CardDescription>Protect your account with a strong password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Password</h3>
            <p className="text-xs text-muted-foreground">
              Change your account password at any time.
            </p>
            <ChangePasswordForm />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
