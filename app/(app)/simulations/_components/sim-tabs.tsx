"use client";

import { cn } from "@/lib/utils";

export type SimTabId =
  | "SAVINGS_GOAL"
  | "LOAN"
  | "DEBT_PAYOFF"
  | "WHAT_IF"
  | "NET_WORTH";

const TABS: { id: SimTabId; label: string }[] = [
  { id: "SAVINGS_GOAL", label: "Savings goal" },
  { id: "LOAN", label: "Loan" },
  { id: "DEBT_PAYOFF", label: "Debt payoff" },
  { id: "WHAT_IF", label: "What-if" },
  { id: "NET_WORTH", label: "Net worth" },
];

type SimTabsProps = {
  value: SimTabId;
  onValueChange: (id: SimTabId) => void;
};

export function SimTabs({ value, onValueChange }: SimTabsProps) {
  return (
    <div className="-mx-1 min-w-0 border-b border-border sm:mx-0">
      <div
        role="tablist"
        aria-label="Simulation type"
        className="flex min-h-11 gap-0 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] sm:min-h-10"
      >
        {TABS.map((t) => {
          const selected = value === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => onValueChange(t.id)}
              className={cn(
                "relative shrink-0 touch-manipulation whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:px-4 sm:py-2.5",
                selected ?
                  "-mb-px border-primary text-foreground"
                : "-mb-px border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
