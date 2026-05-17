import { formatMoney, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ExpenseMonthSummary } from "../types";

type NetBarProps = {
  summary: ExpenseMonthSummary;
  currency: string;
};

export function NetBar({ summary, currency }: NetBarProps) {
  const { total: expenses, totalIncome, savings, savingsRate } = summary;
  const income = totalIncome;
  const expenseTotal = expenses;

  const unspent = income > 0 ? Math.max(0, 1 - expenseTotal / income) : expenseTotal > 0 ? 0 : 1;
  const spent = income > 0 ? Math.min(1, expenseTotal / income) : expenseTotal > 0 ? 1 : 0;
  const over = income > 0 ? Math.max(0, expenseTotal / income - 1) : 0;

  const surplus = savings >= 0;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-background p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <p className="text-sm font-medium text-foreground">Income vs expenses</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Totals for the selected range — each entry counts on the date you recorded it.
        </p>
      </div>
      <div className="w-full overflow-x-auto rounded-full">
        <div
          className="flex h-4 min-w-full overflow-hidden rounded-full bg-muted dark:bg-zinc-800"
          title={
            income > 0
              ? `Income ${formatMoney(income, currency)} · Expenses ${formatMoney(expenseTotal, currency)}`
              : expenseTotal > 0
                ? `Expenses ${formatMoney(expenseTotal, currency)}`
                : undefined
          }
        >
          {income <= 0 && expenseTotal <= 0 ? (
            <div className="h-full w-full shrink-0 bg-muted dark:bg-zinc-800" />
          ) : income <= 0 && expenseTotal > 0 ? (
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
      <div className="text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Saved in period</p>
        <p className="mt-1 tabular-nums">
          <span
            className={cn(
              "font-semibold",
              surplus
                ? "text-primary"
                : savings === 0
                  ? "text-foreground"
                  : "text-destructive",
            )}
          >
            {savings >= 0 ? "+" : "−"}
            {formatMoney(Math.abs(savings), currency)} {surplus ? "saved" : "overspent"}
          </span>
        </p>
        <p className="mt-2 text-[11px]">
          Savings rate:{" "}
          <span className="font-medium tabular-nums text-foreground">
            {formatPercent(savingsRate, 1)}
          </span>{" "}
          of income
        </p>
      </div>
    </div>
  );
}
