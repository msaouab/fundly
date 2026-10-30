"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type FixedTab = "incomes" | "expenses" | "savings";

type FixedSettingsPanelsProps = {
  incomes: ReactNode;
  expenses: ReactNode;
  savings: ReactNode;
};

export function FixedSettingsPanels({ incomes, expenses, savings }: FixedSettingsPanelsProps) {
  const [tab, setTab] = useState<FixedTab>("incomes");

  return (
    <div className="flex flex-col gap-6">
      <div
        className={cn(
          "flex rounded-lg border p-1",
          tab === "incomes"
            ? "border-primary/40 bg-primary/5 dark:border-primary/35 dark:bg-primary/10"
            : tab === "savings"
              ? "border-emerald-500/40 bg-emerald-500/5 dark:border-emerald-500/35 dark:bg-emerald-500/10"
              : "border-border bg-muted/40 dark:border-zinc-700 dark:bg-zinc-800/50",
        )}
        role="tablist"
        aria-label="Fixed income, expense, and saving config"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "incomes"}
          onClick={() => setTab("incomes")}
          className={cn(
            "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            tab === "incomes"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-zinc-800",
          )}
        >
          Fixed incomes
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "expenses"}
          onClick={() => setTab("expenses")}
          className={cn(
            "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            tab === "expenses"
              ? "bg-foreground text-background shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
              : "text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-zinc-800",
          )}
        >
          Fixed expenses
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "savings"}
          onClick={() => setTab("savings")}
          className={cn(
            "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            tab === "savings"
              ? "bg-emerald-600 text-white shadow-sm dark:bg-emerald-500"
              : "text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-zinc-800",
          )}
        >
          Fixed savings
        </button>
      </div>
      <div role="tabpanel">
        {tab === "incomes" ? incomes : tab === "expenses" ? expenses : savings}
      </div>
    </div>
  );
}
