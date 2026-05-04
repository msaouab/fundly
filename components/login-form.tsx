"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PasswordInput } from "@/components/password-input";

type LoginFormProps = {
  showRegisteredBanner?: boolean;
};

export function LoginForm({ showRegisteredBanner }: LoginFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    setPending(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setPending(false);
    if (result?.error) {
      toast.error("Invalid email or password.");
      return;
    }
    toast.success("Signed in successfully");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {showRegisteredBanner ? (
        <p
          className="mb-4 rounded-lg bg-teal-50 px-3 py-2 text-center text-sm text-teal-900 dark:bg-teal-950/50 dark:text-teal-100"
          role="status"
        >
          Account created. You can sign in now.
        </p>
      ) : null}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="email"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-teal-600/20 focus:border-teal-600 focus:ring-4 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-teal-500"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="password"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Password
          </label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="mt-1 flex h-11 items-center justify-center rounded-lg bg-teal-700 text-sm font-medium text-white transition hover:bg-teal-800 disabled:opacity-60 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        No account?{" "}
        <Link
          href="/register"
          className="font-medium text-teal-700 underline-offset-4 hover:underline dark:text-teal-400"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
