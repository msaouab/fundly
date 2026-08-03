"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AppPage, AppPageHeader, AppPageOverview, AppPageSection } from "@/components/ledger-page-layout";
import { CATEGORY_CONFIG } from "@/lib/expense-categories";
import type { ForecastBaseline, ForecastHorizon, ForecastMonth } from "@/lib/forecast/types";
import { formatMoney, formatPercent } from "@/lib/money";
import { ledgerRowHover } from "@/lib/ledger-table-columns";
import { cn } from "@/lib/utils";

const HORIZONS: { value: ForecastHorizon; label: string }[] = [
  { value: 1, label: "Next month" },
  { value: 3, label: "Next 3 months" },
  { value: 6, label: "Next 6 months" },
];

type ForecastViewProps = {
  baseline: ForecastBaseline;
};

function HorizonToggle({
  value,
  onChange,
}: {
  value: ForecastHorizon;
  onChange: (h: ForecastHorizon) => void;
}) {
  return (
    <div
      className={cn(
        "flex rounded-lg border p-1",
        value === 1
          ? "border-primary/40 bg-primary/5 dark:border-primary/35 dark:bg-primary/10"
          : "border-border bg-muted/40 dark:border-zinc-700 dark:bg-zinc-800/50",
      )}
      role="group"
      aria-label="Forecast horizon"
    >
      {HORIZONS.map((h) => (
        <button
          key={h.value}
          type="button"
          onClick={() => onChange(h.value)}
          className={cn(
            "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            value === h.value
              ? h.value === 1
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-foreground text-background shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
              : "text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-zinc-800",
          )}
        >
          {h.label}
        </button>
      ))}
    </div>
  );
}

function MonthCard({
  month,
  currency,
}: {
  month: ForecastMonth;
  currency: string;
}) {
  const positive = month.totals.savings >= 0;
  const incomeLines = month.lines.filter((l) => l.kind === "income");
  const expenseLines = month.lines.filter((l) => l.kind !== "income");

  return (
    <Card className="border-border dark:border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{month.label}</CardTitle>
            <CardDescription>
              Fixed income {formatMoney(month.fixedIncome, currency)} · Fixed expenses{" "}
              {formatMoney(month.fixedExpense, currency)} · Variable{" "}
              {formatMoney(month.variableExpense, currency)}
            </CardDescription>
          </div>
          <p
            className={cn(
              "shrink-0 text-lg font-semibold tabular-nums",
              positive ? "text-primary" : "text-destructive",
            )}
          >
            {formatMoney(month.totals.savings, currency)}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border px-3 py-2 dark:border-zinc-800">
            <p className="text-xs text-muted-foreground">Income</p>
            <p className="text-sm font-semibold tabular-nums">
              {formatMoney(month.totals.income, currency)}
            </p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2 dark:border-zinc-800">
            <p className="text-xs text-muted-foreground">Expenses</p>
            <p className="text-sm font-semibold tabular-nums">
              {formatMoney(month.totals.expense, currency)}
            </p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2 dark:border-zinc-800">
            <p className="text-xs text-muted-foreground">Savings rate</p>
            <p
              className={cn(
                "text-sm font-semibold tabular-nums",
                positive ? "text-primary" : "text-destructive",
              )}
            >
              {formatPercent(month.totals.savingsRate, 1)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-md text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Line</th>
                <th className="pb-2 pr-3 font-medium whitespace-nowrap">Type</th>
                <th className="pb-2 font-medium whitespace-nowrap text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {incomeLines.map((line) => (
                <tr key={line.id} className={cn("border-b border-border/60", ledgerRowHover)}>
                  <td className="max-w-48 truncate py-2 pr-3 font-medium">{line.label}</td>
                  <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">Income</td>
                  <td className="py-2 text-right tabular-nums text-primary whitespace-nowrap">
                    +{formatMoney(line.amount, currency)}
                  </td>
                </tr>
              ))}
              {expenseLines.map((line) => {
                const cfg = line.category ? CATEGORY_CONFIG[line.category] : null;
                return (
                  <tr key={line.id} className={cn("border-b border-border/60 last:border-0", ledgerRowHover)}>
                    <td className="max-w-48 truncate py-2 pr-3 font-medium">
                      {cfg ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span aria-hidden>{cfg.icon}</span>
                          {line.label}
                        </span>
                      ) : (
                        line.label
                      )}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                      {line.kind === "fixed_expense" ? "Fixed" : "Variable"}
                    </td>
                    <td className="py-2 text-right tabular-nums text-destructive whitespace-nowrap">
                      −{formatMoney(line.amount, currency)}
                    </td>
                  </tr>
                );
              })}
              {month.lines.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-muted-foreground">
                    No projected lines — add recurring items first.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function ForecastView({ baseline }: ForecastViewProps) {
  const [horizon, setHorizon] = useState<ForecastHorizon>(3);
  const currency = baseline.currency;

  const months = useMemo(
    () => baseline.months.slice(0, horizon),
    [baseline.months, horizon],
  );

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const m of months) {
      income += m.totals.income;
      expense += m.totals.expense;
    }
    const savings = income - expense;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;
    return { income, expense, savings, savingsRate };
  }, [months]);

  const hasTemplates =
    baseline.incomes.length > 0 ||
    baseline.fixedExpenses.length > 0 ||
    baseline.variableMonthlyAvg > 0;

  return (
    <AppPage size="6xl">
      <AppPageHeader
        title="Forecast"
        description="Projected income, expenses, and savings for upcoming months — built from your recurring items and recent variable spend. This is a sandbox view; it does not change your ledger."
      />

      <HorizonToggle value={horizon} onChange={setHorizon} />

      {!hasTemplates ? (
        <Card className="border-dashed border-border dark:border-zinc-700">
          <CardHeader>
            <CardTitle className="text-base">Nothing to project yet</CardTitle>
            <CardDescription>
              Add fixed incomes and expenses on the Recurring page, or log a few months of
              spending so we can estimate variable costs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/settings/fixed"
              className="text-sm font-medium text-primary hover:underline"
            >
              Open Recurring setup
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <AppPageOverview>
            <section
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
              aria-label="Forecast summary"
            >
              <Card className="border-border dark:border-zinc-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Projected income
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums">
                    {formatMoney(summary.income, currency)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Over {horizon} month{horizon === 1 ? "" : "s"}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border dark:border-zinc-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Projected expenses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums">
                    {formatMoney(summary.expense, currency)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Fixed + estimated variable
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border dark:border-zinc-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Projected savings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p
                    className={cn(
                      "flex items-center gap-2 text-2xl font-semibold tabular-nums",
                      summary.savings >= 0 ? "text-primary" : "text-destructive",
                    )}
                  >
                    {summary.savings >= 0 ? (
                      <TrendingUp className="size-5 shrink-0" aria-hidden />
                    ) : (
                      <TrendingDown className="size-5 shrink-0" aria-hidden />
                    )}
                    {formatMoney(summary.savings, currency)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Income − expenses</p>
                </CardContent>
              </Card>
              <Card className="border-border dark:border-zinc-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg savings rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p
                    className={cn(
                      "text-2xl font-semibold tabular-nums",
                      summary.savings >= 0 ? "text-primary" : "text-destructive",
                    )}
                  >
                    {formatPercent(summary.savingsRate, 1)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Variable avg from {baseline.variableSampleMonths} month
                    {baseline.variableSampleMonths === 1 ? "" : "s"}
                  </p>
                </CardContent>
              </Card>
            </section>
          </AppPageOverview>

          <AppPageSection aria-label="Projected months">
            <div className="flex flex-col gap-6">
              {months.map((m) => (
                <MonthCard key={m.monthKey} month={m} currency={currency} />
              ))}
            </div>
          </AppPageSection>
        </>
      )}
    </AppPage>
  );
}
