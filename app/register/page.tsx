import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/components/register-form";

export const metadata: Metadata = {
  title: "Create account",
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create account"
      subtitle="Start tracking your finances with Fundly."
    >
      <RegisterForm />
    </AuthShell>
  );
}
