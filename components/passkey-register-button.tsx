"use client";

import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { toast } from "sonner";

export function PasskeyRegisterButton() {
  const [pending, setPending] = useState(false);

  async function onRegister() {
    if (!window.PublicKeyCredential) {
      toast.error("Passkeys are not supported on this device/browser.");
      return;
    }

    setPending(true);
    try {
      const beginRes = await fetch("/api/passkeys/register/begin", {
        method: "POST",
      });
      const beginData = await beginRes.json();
      if (!beginRes.ok) {
        toast.error(beginData?.error ?? "Could not start passkey setup.");
        return;
      }

      const response = await startRegistration(beginData);
      const finishRes = await fetch("/api/passkeys/register/finish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ response }),
      });
      const finishData = await finishRes.json();
      if (!finishRes.ok || !finishData?.ok) {
        toast.error(finishData?.error ?? "Passkey setup failed.");
        return;
      }
      toast.success("Passkey enabled for this account.");
    } catch {
      toast.error("Passkey setup cancelled or failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onRegister}
      disabled={pending}
      className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      {pending ? "Enabling passkey…" : "Enable Touch ID / Face ID"}
    </button>
  );
}
