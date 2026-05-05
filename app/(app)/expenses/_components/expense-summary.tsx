import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ExpenseMonthSummary } from "../types";

type ExpenseSummaryProps = {
  summary: ExpenseMonthSummary;
  currency: string;
};

export function ExpenseSummary({ summary, currency }: ExpenseSummaryProps) {
  const {
    total,
    fixed,
    variable,
    savingsContribution,
    recurringSavingsTransfer,
    oneOffSavingsTransfer,
    totalIncome,
    spendExcludingSavingsTransfers,
    remainingIncome,
    remainingIncomeAfterFixedSavings,
    savingsRate,
    discretionaryRateAfterFixed,
  } = summary;
  const pctOfIncome = (part: number) =>
    totalIncome > 0 ? formatPercent((part / totalIncome) * 100, 0) : "0%";

  const cards = [
    {
      title: "Total expenses",
      value: total,
      hint: pctOfIncome(total),
      accent: "text-primary",
    },
    {
      title: "Fixed",
      value: fixed,
      hint: pctOfIncome(fixed),
      accent: "text-primary/90",
    },
    {
      title: "Variable",
      value: variable,
      hint: pctOfIncome(variable),
      accent: "text-primary/75",
    },
    {
      title: "Planned savings transfers",
      value: recurringSavingsTransfer,
      hint: pctOfIncome(recurringSavingsTransfer),
      accent: "text-blue-700 dark:text-blue-400",
    },
    {
      title: "One-off savings transfers",
      value: oneOffSavingsTransfer,
      hint: pctOfIncome(oneOffSavingsTransfer),
      accent: "text-sky-600 dark:text-sky-400",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => (
          <Card
            key={c.title}
            className="border-border bg-background dark:border-zinc-800 dark:bg-zinc-900"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {c.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className={cn("text-2xl font-semibold tabular-nums", c.accent)}>
                {formatMoney(c.value, currency)}
              </p>
              <p className="text-xs text-muted-foreground">{c.hint} of monthly income</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {savingsContribution > 0 ?
        <p className="text-xs text-muted-foreground">
          All savings-category moves this month (planned + one-off):{" "}
          <span className="font-medium tabular-nums text-foreground">
            {formatMoney(savingsContribution, currency)}
          </span>
        </p>
      : null}

      <div className="space-y-2 pt-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Remaining income · this month
        </h2>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">After fixed saving</span> = remainder room minus{' '}
          <span className="font-medium text-foreground">planned (recurring) savings transfers</span>. Gross
          remainder ignores all savings-category rows when measuring spend first.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-border bg-background dark:border-zinc-800 dark:bg-zinc-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly income</CardTitle>
              <CardDescription className="text-xs">Recorded incomes this month.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{formatMoney(totalIncome, currency)}</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-background dark:border-zinc-800 dark:bg-zinc-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Spend excl. savings transfers
              </CardTitle>
              <CardDescription className="text-xs">Total expenses − savings-category rows.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-2xl font-semibold tabular-nums">{formatMoney(spendExcludingSavingsTransfers, currency)}</p>
              <p className="text-xs text-muted-foreground">
                {pctOfIncome(spendExcludingSavingsTransfers)} of income
              </p>
            </CardContent>
          </Card>
          <Card className="border-primary/35 bg-primary/5 dark:border-primary/40 dark:bg-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground">
                Remaining income (after fixed savings)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Gross remainder {formatMoney(remainingIncome, currency)} − planned transfers{' '}
                {formatMoney(summary.recurringSavingsTransfer, currency)}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p
                className={cn(
                  "text-2xl font-semibold tabular-nums",
                  remainingIncomeAfterFixedSavings >= 0 ? "text-primary" : "text-destructive",
                )}
              >
                {formatMoney(remainingIncomeAfterFixedSavings, currency)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatPercent(discretionaryRateAfterFixed, 1)} of income (discretionary){' '}
                <span className="tabular-nums text-muted-foreground/80">
                  · gross room {formatPercent(savingsRate, 1)}
                </span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
