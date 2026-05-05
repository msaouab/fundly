import { formatMoney, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ExpenseMonthSummary } from "../types";

type NetBarProps = {
  summary: ExpenseMonthSummary;
  currency: string;
};

export function NetBar({ summary, currency }: NetBarProps) {
  const { total: expenses, totalIncome, net, savingsRate, discretionaryRateAfterFixed } = summary;
  const discretionary = summary.remainingIncomeAfterFixedSavings;
  const I = totalIncome;
  const E = expenses;

  const unspent = I > 0 ? Math.max(0, 1 - E / I) : E > 0 ? 0 : 1;
  const spent = I > 0 ? Math.min(1, E / I) : E > 0 ? 1 : 0;
  const over = I > 0 ? Math.max(0, E / I - 1) : 0;

  const surplusDiscretionary = discretionary >= 0;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-background p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <p className="text-sm font-medium text-foreground">Expense load vs income</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Bar compares all expense rows (including savings transfers) to income; discretionary remainder below subtracts planned recurring transfers from gross surplus.
        </p>
      </div>
      <div className="w-full overflow-x-auto rounded-full">
        <div
          className="flex h-4 min-w-full overflow-hidden rounded-full bg-muted dark:bg-zinc-800"
          title={
            I > 0
              ? `Income ${formatMoney(I, currency)} · Expenses ${formatMoney(E, currency)}`
              : E > 0
                ? `Expenses ${formatMoney(E, currency)}`
                : undefined
          }
        >
          {I <= 0 && E <= 0 ? (
            <div className="h-full w-full shrink-0 bg-muted dark:bg-zinc-800" />
          ) : I <= 0 && E > 0 ? (
            <div className="h-full min-w-[40%] flex-1 bg-primary dark:bg-primary" />
          ) : (
            <>
              {unspent > 0 ? (
                <div
                  className="h-full shrink-0 bg-primary/15 dark:bg-primary/20"
                  style={{ flex: unspent }}
                />
              ) : null}
              {spent > 0 ? (
                <div
                  className="h-full shrink-0 bg-primary dark:bg-primary"
                  style={{ flex: spent }}
                />
              ) : null}
              {over > 0 ? (
                <div
                  className="h-full shrink-0 bg-destructive dark:bg-destructive"
                  style={{ flex: over }}
                />
              ) : null}
            </>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-muted-foreground">
          <p className="font-medium text-foreground">Remaining income (after fixed savings)</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Gross remainder {formatMoney(net, currency)} minus planned recurring savings transfers — what is
            still free once those sweeps are reserved.
          </p>
          <p className="mt-1 tabular-nums">
            <span
              className={cn(
                "font-semibold",
                surplusDiscretionary
                  ? "text-primary"
                  : discretionary === 0
                    ? "text-foreground"
                    : "text-destructive",
              )}
            >
              {discretionary >= 0 ? "+" : "−"}
              {formatMoney(Math.abs(discretionary), currency)} {surplusDiscretionary ? "discretionary" : "short"}
            </span>
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Gross remainder (before fixed saves):{' '}
            <span className="font-medium tabular-nums text-foreground">{formatMoney(net, currency)}</span> (
            {formatPercent(savingsRate, 1)} of income)
          </p>
        </div>
        <p className="text-xs text-muted-foreground sm:text-right">
          Discretionary / income:{" "}
          <span className="font-medium text-foreground tabular-nums">
            {formatPercent(discretionaryRateAfterFixed, 1)}
          </span>
        </p>
      </div>
    </div>
  );
}
