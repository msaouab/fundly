"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { updateNameAction } from "@/app/(app)/settings/actions";

export function ProfileNameForm({ initialName }: { initialName: string }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName || "");
  const [fieldError, setFieldError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Name</p>
      {editing ? (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              setFieldError(null);
              const result = await updateNameAction({}, formData);
              if (result.error) {
                toast.error(result.error);
                return;
              }
              if (result.fieldErrors?.name) {
                setFieldError(result.fieldErrors.name);
                toast.error(result.fieldErrors.name);
                return;
              }
              const updated = result.name ?? "";
              setName(updated);
              setEditing(false);
              toast.success("Name updated.");
            });
          }}
        >
          <div className="flex items-center gap-2">
            <input
              id="profile-name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:outline-none focus:ring-0 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
              autoFocus
            />
            <button
              type="submit"
              disabled={pending}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-white transition hover:bg-teal-800 disabled:opacity-60 dark:bg-teal-600 dark:hover:bg-teal-500"
              aria-label={pending ? "Saving name" : "Save name"}
              title={pending ? "Saving name" : "Save name"}
            >
              <Check className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={pending}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-300 text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              aria-label="Cancel edit name"
              title="Cancel edit name"
            >
              <X className="size-4" />
            </button>
          </div>
          {fieldError ? (
            <p className="text-xs text-destructive">{fieldError}</p>
          ) : null}
        </form>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {name.trim() ? name.trim() : "Account"}
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex size-8 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Edit name"
            title="Edit name"
          >
            <Pencil className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
