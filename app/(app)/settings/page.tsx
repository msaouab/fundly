import type { Metadata } from "next";
import { auth } from "@/auth";
import { ChangePasswordForm } from "@/components/change-password-form";
import { CountrySettingsForm } from "@/components/country-settings-form";
import { ProfileNameForm } from "@/components/profile-name-form";
import { prisma } from "@/lib/prisma";
import { AppPage, AppPageHeader } from "@/components/ledger-page-layout";
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
        select: { name: true, email: true, countryCode: true, currency: true },
      })
    : null;
  const name = profile?.name?.trim() || "Account";
  const email = profile?.email?.trim() || session?.user?.email?.trim() || "No email";

  return (
    <AppPage size="3xl">
      <AppPageHeader
        title="Settings"
        description="Manage account details and password security."
      />

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
          <CardTitle className="text-base">Region & calendar</CardTitle>
          <CardDescription>
            Country drives public holidays on the calendar and default currency.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CountrySettingsForm
            initialCountryCode={profile?.countryCode ?? "MA"}
            initialCurrency={profile?.currency ?? "MAD"}
          />
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
    </AppPage>
  );
}
