import { formatMoney } from "@/lib/money";
import type { MonthSummary } from "../types";

type IncomeNetBarProps = {
  summary: MonthSummary;
  currency: string;
};

export function IncomeNetBar({ summary, currency }: IncomeNetBarProps) {
  const { total, totalExpenses, net } = summary;
  const max = Math.max(total, totalExpenses, 1);
  const incomeW = (total / max) * 100;
  const expenseW = (totalExpenses / max) * 100;

  const surplus = net >= 0;
  const label = surplus ? "surplus" : "deficit";

  return (
    <div className="space-y-3 rounded-xl border border-border bg-background p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm font-medium text-foreground">Income vs expenses</p>
      <div className="relative h-4 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/90 dark:bg-emerald-500"
          style={{ width: `${Math.min(incomeW, 100)}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-orange-500/85 mix-blend-multiply dark:mix-blend-screen"
          style={{ width: `${Math.min(expenseW, 100)}%` }}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Net this month:{" "}
        <span
          className={
            surplus
              ? "font-semibold text-emerald-600 dark:text-emerald-400"
              : net === 0
                ? "font-semibold text-foreground"
                : "font-semibold text-red-600 dark:text-red-400"
          }
        >
          {net >= 0 ? "+" : "−"}
          {formatMoney(Math.abs(net), currency)} {label}
        </span>
      </p>
    </div>
  );
}
