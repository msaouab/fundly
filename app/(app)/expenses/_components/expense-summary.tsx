import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ExpenseMonthSummary } from "../types";

type ExpenseSummaryProps = {
  summary: ExpenseMonthSummary;
  currency: string;
};

export function ExpenseSummary({ summary, currency }: ExpenseSummaryProps) {
  const { total, fixed, variable, totalIncome, savings, savingsRate } = summary;
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
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-3">
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

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border bg-background dark:border-zinc-800 dark:bg-zinc-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Income</CardTitle>
            <CardDescription className="text-xs">All income in the selected range.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{formatMoney(totalIncome, currency)}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-background dark:border-zinc-800 dark:bg-zinc-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expenses</CardTitle>
            <CardDescription className="text-xs">All expenses in the selected range.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{formatMoney(total, currency)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/35 bg-primary/5 dark:border-primary/40 dark:bg-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Saved in period</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Income minus expenses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums",
                savings >= 0 ? "text-primary" : "text-destructive",
              )}
            >
              {formatMoney(savings, currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatPercent(savingsRate, 1)} of income
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
