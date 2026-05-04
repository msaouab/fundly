import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ExpenseMonthSummary } from "../types";

type ExpenseSummaryProps = {
  summary: ExpenseMonthSummary;
  currency: string;
};

export function ExpenseSummary({ summary, currency }: ExpenseSummaryProps) {
  const { total, fixed, variable, totalIncome } = summary;
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
  );
}
