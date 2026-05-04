"use client";

import { cn } from "@/lib/utils";
import type { ExpenseKind } from "@/generated/prisma/enums";

type ExpenseTypeToggleProps = {
  value: ExpenseKind;
  onChange: (kind: ExpenseKind) => void;
  disabled?: boolean;
};

export function ExpenseTypeToggle({ value, onChange, disabled }: ExpenseTypeToggleProps) {
  return (
    <div
      className={cn(
        "flex rounded-lg border p-1",
        value === "FIXED"
          ? "border-primary/40 bg-primary/5 dark:border-primary/35 dark:bg-primary/10"
          : "border-border bg-muted/40 dark:border-zinc-700 dark:bg-zinc-800/50",
      )}
      role="group"
      aria-label="Expense kind"
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("FIXED")}
        className={cn(
          "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          value === "FIXED"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-zinc-800",
        )}
      >
        Fixed
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("VARIABLE")}
        className={cn(
          "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          value === "VARIABLE"
            ? "bg-foreground text-background shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
            : "text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-zinc-800",
        )}
      >
        Variable
      </button>
    </div>
  );
}
