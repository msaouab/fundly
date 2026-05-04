"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PasswordInput } from "@/components/password-input";
import { registerAction, type RegisterState } from "@/app/register/actions";

const initialState: RegisterState = {};

export function RegisterForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialState,
  );
  const initial = useRef(true);
  const successHandled = useRef(false);

  useEffect(() => {
    if (pending) {
      toast.loading("Creating your account…", { id: "register-submit" });
    } else {
      toast.dismiss("register-submit");
    }
  }, [pending]);

  useEffect(() => {
    if (initial.current) {
      initial.current = false;
      return;
    }
    if (state.success && !successHandled.current) {
      successHandled.current = true;
      toast.success("Account created. You can sign in now.");
      router.push("/login");
      router.refresh();
      return;
    }
    if (state.error) {
      toast.error(state.error);
      return;
    }
    const parts = [
      state.fieldErrors?.email,
      state.fieldErrors?.password,
      state.fieldErrors?.name,
    ].filter(Boolean);
    if (parts.length) {
      toast.error(parts.join(" "));
    }
  }, [state, router]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="name"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Name <span className="font-normal text-zinc-500">(optional)</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            maxLength={80}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-teal-600/20 focus:border-teal-600 focus:ring-4 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-teal-500"
          />
        </div>
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
            autoComplete="new-password"
            required
            minLength={8}
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            At least 8 characters.
          </p>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="mt-1 flex h-11 items-center justify-center rounded-lg bg-teal-700 text-sm font-medium text-white transition hover:bg-teal-800 disabled:opacity-60 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-teal-700 underline-offset-4 hover:underline dark:text-teal-400"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
