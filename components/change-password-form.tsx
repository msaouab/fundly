"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  changePasswordAction,
  type ChangePasswordState,
} from "@/app/(app)/settings/actions";
import { PasswordInput } from "@/components/password-input";

const initialState: ChangePasswordState = {};

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    initialState,
  );
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    if (state.success) {
      toast.success("Password updated successfully.");
      return;
    }
    if (state.error) {
      toast.error(state.error);
      return;
    }
    const firstFieldError =
      state.fieldErrors?.currentPassword ||
      state.fieldErrors?.newPassword ||
      state.fieldErrors?.confirmPassword;
    if (firstFieldError) {
      toast.error(firstFieldError);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="currentPassword"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Current password
        </label>
        <PasswordInput
          id="currentPassword"
          name="currentPassword"
          autoComplete="current-password"
          required
        />
        {state.fieldErrors?.currentPassword ? (
          <p className="text-xs text-destructive">
            {state.fieldErrors.currentPassword}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="newPassword"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          New password
        </label>
        <PasswordInput
          id="newPassword"
          name="newPassword"
          autoComplete="new-password"
          required
          minLength={8}
        />
        {state.fieldErrors?.newPassword ? (
          <p className="text-xs text-destructive">{state.fieldErrors.newPassword}</p>
        ) : (
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="confirmPassword"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Confirm new password
        </label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          required
          minLength={8}
        />
        {state.fieldErrors?.confirmPassword ? (
          <p className="text-xs text-destructive">
            {state.fieldErrors.confirmPassword}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-1 flex h-10 items-center justify-center rounded-lg bg-teal-700 px-4 text-sm font-medium text-white transition hover:bg-teal-800 disabled:opacity-60 dark:bg-teal-600 dark:hover:bg-teal-500"
      >
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
