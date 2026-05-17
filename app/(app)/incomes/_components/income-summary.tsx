import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatPercent } from "@/lib/money";
import type { SerializedPeriod } from "@/lib/period";
import type { MonthSummary } from "../types";

type IncomeSummaryProps = {
  summary: MonthSummary;
  currency: string;
  period: SerializedPeriod;
};

export function IncomeSummary({ summary, currency, period }: IncomeSummaryProps) {
  const { total, recurring, variable } = summary;
  const shareHint = period.monthCount === 1 ? "of month" : "of period";
  const pct = (part: number) =>
    total > 0 ? formatPercent((part / total) * 100, 0) : "0%";

  const cards = [
    {
      title: "Total income",
      value: total,
      hint: pct(total),
    },
    {
      title: "Recurring",
      value: recurring,
      hint: pct(recurring),
    },
    {
      title: "Variable",
      value: variable,
      hint: pct(variable),
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
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {formatMoney(c.value, currency)}
            </p>
            <p className="text-xs text-muted-foreground">{c.hint} {shareHint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
