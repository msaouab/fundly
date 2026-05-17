"use client";

import {
  ArrowRight,
  Landmark,
  PieChartIcon,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { CategoryPieChart, MonthlyFlowBarChart } from "@/components/charts";
import type { SerializedPeriod } from "@/lib/period";
import type {
  CategoryBreakdown,
  ExpenseMonthSummary,
} from "@/app/(app)/expenses/types";
import type { IncomeSource, MonthSummary } from "@/app/(app)/incomes/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { categoryBreakdownToSlices } from "@/lib/charts/adapters/category-breakdown";
import { CHART_HEIGHT_DEFAULT } from "@/lib/charts/constants";
import { CATEGORY_CONFIG } from "@/lib/expense-categories";
import { formatMoney, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { DashboardHighlight, MonthlyFlowPoint } from "@/lib/dashboard/types";

type DashboardViewProps = {
  email: string | null;
  period: SerializedPeriod;
  periodLabel: string;
  currency: string;
  incomeSummary: MonthSummary;
  expenseSummary: ExpenseMonthSummary;
  categoryBreakdown: CategoryBreakdown[];
  incomeSources: IncomeSource[];
  flowSeries: MonthlyFlowPoint[];
  previousPeriodSavings: number;
  largestExpense: DashboardHighlight;
};

export function DashboardView({
  email,
  period,
  periodLabel,
  currency,
  incomeSummary,
  expenseSummary,
  categoryBreakdown,
  incomeSources,
  flowSeries,
  previousPeriodSavings,
  largestExpense,
}: DashboardViewProps) {
  const periodQuery =
    period.preset !== "custom" ? `period=${period.preset}` : `from=${period.from}&to=${period.to}`;

  const savings = expenseSummary.savings;
  const deltaSavings = savings - previousPeriodSavings;
  const savingsPositive = savings >= 0;
  const recurringIncomeShare =
    incomeSummary.total > 0 ? (incomeSummary.recurring / incomeSummary.total) * 100 : 0;

  const topCategory = categoryBreakdown.find((c) => c.total > 0);
  const topSource = incomeSources[0];

  const categoryChart = useMemo(
    () => categoryBreakdownToSlices(categoryBreakdown),
    [categoryBreakdown],
  );

  const fixedPct =
    expenseSummary.total > 0 ? (expenseSummary.fixed / expenseSummary.total) * 100 : 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 pb-10">
      <header className="px-1 md:px-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {email ? (
            <>Signed in as {email}</>
          ) : (
            <>Income, expenses, and savings for {periodLabel}</>
          )}
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-12" aria-labelledby="dash-savings-heading">
        <Card className="border-border md:col-span-7 lg:col-span-8 dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle id="dash-savings-heading" className="text-base font-semibold">
              Saved in period
            </CardTitle>
            <CardDescription>
              Total income minus total expenses — each entry counts on its recorded date.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p
              className={cn(
                "text-4xl font-semibold tabular-nums tracking-tight",
                savingsPositive ? "text-primary" : "text-destructive",
              )}
            >
              {formatMoney(savings, currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              Income {formatMoney(incomeSummary.total, currency)} − expenses{" "}
              {formatMoney(expenseSummary.total, currency)}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">vs previous period:</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-medium tabular-nums",
                  deltaSavings > 0
                    ? "text-primary"
                    : deltaSavings < 0
                      ? "text-destructive"
                      : "text-muted-foreground",
                )}
              >
                {deltaSavings > 0 ? (
                  <TrendingUp className="size-4" aria-hidden />
                ) : deltaSavings < 0 ? (
                  <TrendingDown className="size-4" aria-hidden />
                ) : null}
                {deltaSavings >= 0 ? "+" : ""}
                {formatMoney(deltaSavings, currency)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border md:col-span-5 lg:col-span-4 dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Savings rate</CardTitle>
            <CardDescription>
              Share of income left after all expenses this month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums text-primary">
              {formatPercent(expenseSummary.savingsRate, 1)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Recurring income: {formatPercent(recurringIncomeShare, 0)} of all income this month
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3 md:col-span-12 md:grid-cols-4">
          <Card className="border-border dark:border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Wallet className="size-4 text-primary" aria-hidden />
                Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{formatMoney(incomeSummary.total, currency)}</p>
            </CardContent>
          </Card>
          <Card className="border-border dark:border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Receipt className="size-4 text-destructive" aria-hidden />
                Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{formatMoney(expenseSummary.total, currency)}</p>
            </CardContent>
          </Card>
          <Card className="border-border sm:col-span-1 md:col-span-2 dark:border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Landmark className="size-4 text-primary/80" aria-hidden />
                Fixed vs variable expenses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm tabular-nums">
                <span className="text-muted-foreground">Fixed</span>
                <span>{formatMoney(expenseSummary.fixed, currency)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, fixedPct)).toFixed(1)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatPercent(fixedPct, 0)} fixed</span>
                <span>{formatMoney(expenseSummary.variable, currency)} variable</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section
        aria-labelledby="dash-flow-chart-title"
        className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr),minmax(0,320px)]"
      >
        <Card className="border-border min-h-0 min-w-0 dark:border-zinc-800">
          <CardHeader>
            <CardTitle id="dash-flow-chart-title" className="text-base font-semibold">
              Income, expenses, and savings by month
            </CardTitle>
            <CardDescription>
              One bar per calendar month in {periodLabel.toLowerCase()}.
            </CardDescription>
          </CardHeader>
          <CardContent className="w-full min-w-0 pb-4 pt-0">
            <MonthlyFlowBarChart
              data={flowSeries}
              currency={currency}
              height={CHART_HEIGHT_DEFAULT}
            />
          </CardContent>
        </Card>

        <Card className="border-border min-h-0 min-w-0 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <PieChartIcon className="size-5 text-primary" aria-hidden />
              Spending by category
            </CardTitle>
            <CardDescription>Share of expense total for the selected period.</CardDescription>
          </CardHeader>
          <CardContent className="w-full min-w-0 pb-4 pt-0">
            <CategoryPieChart
              slices={categoryChart.slices}
              colors={categoryChart.colors}
              currency={currency}
              height={CHART_HEIGHT_DEFAULT}
            />
          </CardContent>
        </Card>
      </section>

      <section aria-label="Highlights and shortcuts" className="grid gap-4 md:grid-cols-2">
        <Card className="border-border dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base font-semibold">{periodLabel} · quick facts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {topCategory ? (
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">{CATEGORY_CONFIG[topCategory.category].label}</span>{" "}
                is your biggest category at{" "}
                <span className="tabular-nums text-foreground">
                  {formatPercent(topCategory.percent, 0)}
                </span>{" "}
                of expenses ({formatMoney(topCategory.total, currency)}).
              </p>
            ) : (
              <p className="text-muted-foreground">No category spending in this period.</p>
            )}
            {largestExpense ? (
              <p className="text-muted-foreground">
                Largest single expense:{" "}
                <span className="font-medium text-foreground">{largestExpense.label}</span> at{" "}
                <span className="tabular-nums text-foreground">{formatMoney(largestExpense.amount, currency)}</span>.
              </p>
            ) : null}
            {topSource ? (
              <p className="text-muted-foreground">
                Top income source:{" "}
                <span className="font-medium text-foreground">{topSource.name}</span> (
                {formatMoney(topSource.total, currency)}
                {topSource.count > 1 ? ` · ${topSource.count} entries` : ""}).
              </p>
            ) : incomeSummary.total <= 0 ? (
              <p className="text-muted-foreground">No income logged in this period.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Manage data</CardTitle>
            <CardDescription>Jump to detailed views for the same period.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Link
              href={`/incomes?${periodQuery}`}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-zinc-800 dark:hover:bg-zinc-800/80"
            >
              <span>Incomes</span>
              <ArrowRight className="size-4 opacity-70" aria-hidden />
            </Link>
            <Link
              href={`/expenses?${periodQuery}`}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-zinc-800 dark:hover:bg-zinc-800/80"
            >
              <span>Expenses</span>
              <ArrowRight className="size-4 opacity-70" aria-hidden />
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
