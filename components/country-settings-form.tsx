"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateCountryAction } from "@/app/(app)/calendar/actions";
import { SUPPORTED_COUNTRIES } from "@/lib/countries";

export function CountrySettingsForm({
  initialCountryCode,
  initialCurrency,
}: {
  initialCountryCode: string;
  initialCurrency: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const countryCode = String(fd.get("countryCode") ?? initialCountryCode);
        startTransition(async () => {
          const result = await updateCountryAction(countryCode);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          const country = SUPPORTED_COUNTRIES.find((c) => c.code === countryCode);
          toast.success(
            country
              ? `Region set to ${country.name} (${country.defaultCurrency}).`
              : "Region updated.",
          );
        });
      }}
    >
      <div className="space-y-1.5">
        <label htmlFor="countryCode" className="text-xs text-muted-foreground">
          Country / region
        </label>
        <select
          id="countryCode"
          name="countryCode"
          defaultValue={initialCountryCode}
          disabled={pending}
          className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:outline-none dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
        >
          {SUPPORTED_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Public holidays on the calendar use this region. Currency: {initialCurrency}.
        </p>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 items-center justify-center rounded-lg bg-teal-700 px-4 text-sm font-medium text-white transition hover:bg-teal-800 disabled:opacity-60 dark:bg-teal-600 dark:hover:bg-teal-500"
      >
        {pending ? "Saving…" : "Save region"}
      </button>
    </form>
  );
}
