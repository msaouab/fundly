"use client";

import type { CategoryBreakdown } from "../types";
import { CATEGORY_CONFIG } from "@/lib/expense-categories";
import { formatMoney, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";

type ExpenseCategoryBarProps = {
  breakdown: CategoryBreakdown[];
  currency: string;
  monthTotal: number;
};

export function ExpenseCategoryBar({
  breakdown,
  currency,
  monthTotal,
}: ExpenseCategoryBarProps) {
  if (!breakdown.length || monthTotal <= 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No category spending this month yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">By category</h2>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex h-4 min-w-[280px] overflow-hidden rounded-full bg-muted dark:bg-zinc-800">
          {breakdown.map((b) => {
            const w = monthTotal > 0 ? (b.total / monthTotal) * 100 : 0;
            const cfg = CATEGORY_CONFIG[b.category];
            return (
              <div
                key={b.category}
                className={cn("min-w-px shrink-0", cfg.segmentClass)}
                style={{ width: `${Math.max(w, 0.35)}%` }}
                title={`${cfg.label}: ${formatMoney(b.total, currency)} (${formatPercent(b.percent, 1)})`}
              />
            );
          })}
        </div>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {breakdown.map((b) => {
          const cfg = CATEGORY_CONFIG[b.category];
          return (
            <li key={b.category} className="flex min-w-0 items-center gap-2">
              <span className="text-base" aria-hidden>
                {cfg.icon}
              </span>
              <span className="min-w-0 truncate font-medium text-foreground">
                {cfg.label}
              </span>
              <span className="tabular-nums text-foreground">
                {formatMoney(b.total, currency)}
              </span>
              <span className="tabular-nums">{formatPercent(b.percent, 1)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
