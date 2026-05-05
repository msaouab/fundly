"use client";

import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type PasskeyLoginButtonProps = {
  getEmail: () => string;
};

export function PasskeyLoginButton({ getEmail }: PasskeyLoginButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onPasskeyLogin() {
    const email = getEmail().trim().toLowerCase();
    if (!email) {
      toast.error("Enter your email first.");
      return;
    }
    if (!window.PublicKeyCredential) {
      toast.error("Passkeys are not supported on this device/browser.");
      return;
    }

    setPending(true);
    try {
      const beginRes = await fetch("/api/passkeys/login/begin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const beginData = await beginRes.json();
      if (!beginRes.ok) {
        toast.error(beginData?.error ?? "Could not start passkey login.");
        return;
      }

      const response = await startAuthentication(beginData);
      const finishRes = await fetch("/api/passkeys/login/finish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, response }),
      });
      const finishData = await finishRes.json();
      if (!finishRes.ok || !finishData?.token) {
        toast.error(finishData?.error ?? "Passkey verification failed.");
        return;
      }

      const result = await signIn("credentials", {
        passkeyToken: finishData.token,
        redirect: false,
      });
      if (result?.error) {
        toast.error("Could not create session from passkey login.");
        return;
      }

      toast.success("Signed in with passkey");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Passkey login cancelled or failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onPasskeyLogin}
      disabled={pending}
      className="mt-2 flex h-11 w-full items-center justify-center rounded-lg border border-teal-600/40 bg-teal-50 text-sm font-medium text-teal-900 transition hover:bg-teal-100 disabled:opacity-60 dark:border-teal-500/40 dark:bg-teal-950/40 dark:text-teal-100 dark:hover:bg-teal-900/50"
    >
      {pending ? "Waiting for Touch ID / Face ID…" : "Sign in with Passkey"}
    </button>
  );
}
