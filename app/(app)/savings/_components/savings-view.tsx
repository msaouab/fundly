"use client";

import { PiggyBank, Receipt, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { MonthlyFlowBarChartSavings } from "@/components/charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_HEIGHT_SAVINGS } from "@/lib/charts/constants";
import { formatMoney, formatPercent } from "@/lib/money";
import type { GlobalSavings, MonthlySavings, SavingsPoint } from "@/lib/savings/types";
import { cn } from "@/lib/utils";

type SavingsViewProps = {
  currency: string;
  periodLabel: string;
  periodTotals: MonthlySavings;
  previousPeriodSavings: number;
  global: GlobalSavings;
  trend: SavingsPoint[];
};

function IncomeVsExpensesBar({
  income,
  expense,
  label,
}: {
  income: number;
  expense: number;
  currency: string;
  label: string;
}) {
  const pct = income > 0 ? Math.min(100, (expense / income) * 100) : expense > 0 ? 100 : 0;
  const overIncome = income > 0 && expense > income;

  return (
    <div className="space-y-1.5">
      <div
        className="h-2.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label={`${label}: expenses as ${formatPercent(pct, 0)} of income`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            overIncome ? "bg-destructive" : "bg-destructive/80",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {overIncome ? (
        <p className="text-xs font-medium text-destructive">Expenses exceeded income.</p>
      ) : null}
    </div>
  );
}

export function SavingsView({
  currency,
  periodLabel,
  periodTotals,
  previousPeriodSavings,
  global,
  trend,
}: SavingsViewProps) {
  const periodDelta = periodTotals.savings - previousPeriodSavings;
  const periodDeltaPositive = periodDelta >= 0;
  const savingsPositive = periodTotals.savings >= 0;
  const totalSavingsPositive = global.totalSavings >= 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Savings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add income and expenses on whatever dates they happen — savings is simply income minus
          expenses for the selected date range.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-labelledby="savings-month-kpis">
        <h2 id="savings-month-kpis" className="sr-only">
          {periodLabel}
        </h2>
        <Card className="border-border md:col-span-2 dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Income vs expenses
            </CardTitle>
            <CardDescription className="text-xs leading-snug">{periodLabel}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Wallet className="size-3.5 shrink-0 text-primary" aria-hidden />
                  Income
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{formatMoney(periodTotals.income, currency)}</p>
              </div>
              <div
                className="flex shrink-0 items-center px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                aria-hidden
              >
                vs
              </div>
              <div className="min-w-0 flex-1 text-right">
                <p className="inline-flex items-center justify-end gap-2 text-xs text-muted-foreground">
                  Expenses
                  <Receipt className="size-3.5 shrink-0 text-destructive" aria-hidden />
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{formatMoney(periodTotals.expense, currency)}</p>
              </div>
            </div>
            <IncomeVsExpensesBar
              income={periodTotals.income}
              expense={periodTotals.expense}
              currency={currency}
              label={periodLabel}
            />
          </CardContent>
        </Card>

        <Card className="border-border dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <PiggyBank className="size-4 text-primary" aria-hidden />
              Saved in period
            </CardTitle>
            <CardDescription className="text-xs">Income − expenses.</CardDescription>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums",
                savingsPositive ? "text-primary" : "text-destructive",
              )}
            >
              {formatMoney(periodTotals.savings, currency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatPercent(periodTotals.savingsRate, 1)} of income
            </p>
          </CardContent>
        </Card>

        <Card className="border-border dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vs previous period</CardTitle>
            <CardDescription className="text-xs">Change in savings.</CardDescription>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums",
                periodDeltaPositive ? "text-primary" : "text-destructive",
              )}
            >
              {periodDeltaPositive ? "+" : ""}
              {formatMoney(periodDelta, currency)}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              {periodDeltaPositive ? (
                <TrendingUp className="size-3.5" />
              ) : (
                <TrendingDown className="size-3.5" />
              )}
              vs prior period
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-labelledby="savings-global-kpis">
        <h2 id="savings-global-kpis" className="sr-only">
          All-time
        </h2>
        <Card className="border-border md:col-span-2 dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Income vs expenses (lifetime)
            </CardTitle>
            <CardDescription className="text-xs leading-snug">
              All recorded income and expenses to date.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Wallet className="size-3.5 shrink-0 text-primary" aria-hidden />
                  Income
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {formatMoney(global.totalIncome, currency)}
                </p>
              </div>
              <div
                className="flex shrink-0 items-center px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                aria-hidden
              >
                vs
              </div>
              <div className="min-w-0 flex-1 text-right">
                <p className="inline-flex items-center justify-end gap-2 text-xs text-muted-foreground">
                  Expenses
                  <Receipt className="size-3.5 shrink-0 text-destructive" aria-hidden />
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {formatMoney(global.totalExpense, currency)}
                </p>
              </div>
            </div>
            <IncomeVsExpensesBar
              income={global.totalIncome}
              expense={global.totalExpense}
              currency={currency}
              label="Lifetime"
            />
          </CardContent>
        </Card>

        <Card className="border-border dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total saved (lifetime)
            </CardTitle>
            <CardDescription className="text-xs">Income − expenses, all time.</CardDescription>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums",
                totalSavingsPositive ? "text-primary" : "text-destructive",
              )}
            >
              {formatMoney(global.totalSavings, currency)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Rate: {formatPercent(global.lifetimeSavingsRate, 1)} of lifetime income
            </p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border min-h-0 min-w-0 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Cash flow by month</CardTitle>
          <CardDescription>
            Monthly breakdown for {periodLabel.toLowerCase()} (by recorded date).
          </CardDescription>
        </CardHeader>
        <CardContent className="w-full min-w-0 pb-4 pt-0">
          <MonthlyFlowBarChartSavings data={trend} currency={currency} height={CHART_HEIGHT_SAVINGS} />
        </CardContent>
      </Card>
    </div>
  );
}
