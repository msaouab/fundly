import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

type PageProps = {
  searchParams: Promise<{ registered?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const { registered } = await searchParams;
  const showRegisteredBanner = registered === "1";

  return (
    <AuthShell title="Sign in" subtitle="Welcome back to Fundly.">
      <LoginForm showRegisteredBanner={showRegisteredBanner} />
    </AuthShell>
  );
}
