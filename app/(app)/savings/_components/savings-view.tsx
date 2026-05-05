"use client";

import { format } from "date-fns";
import { PiggyBank, Receipt, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney, formatPercent } from "@/lib/money";
import { addMonths, formatMonthKey } from "@/lib/month";
import type { GlobalSavings, MonthlySavings, SavingsPoint } from "@/lib/savings/types";
import { cn } from "@/lib/utils";

type SavingsViewProps = {
  year: number;
  month: number;
  monthKey: string;
  currency: string;
  monthly: MonthlySavings;
  previousMonthSavedFromIncome: number;
  global: GlobalSavings;
  trend: SavingsPoint[];
};

function compactAxis(amount: number, currency: string): string {
  if (Math.abs(amount) >= 1000) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  }
  return formatMoney(amount, currency);
}

export function SavingsView({
  year,
  month,
  monthKey,
  currency,
  monthly,
  previousMonthSavedFromIncome,
  global,
  trend,
}: SavingsViewProps) {
  const router = useRouter();
  const monthNavOptions = useMemo(() => {
    const out: { key: string; label: string }[] = [];
    for (let delta = -12; delta <= 12; delta++) {
      const { year: y, month: m } = addMonths(year, month, delta);
      const key = formatMonthKey(y, m);
      out.push({
        key,
        label: format(new Date(y, m - 1, 1), "MMMM yyyy"),
      });
    }
    return out;
  }, [year, month]);

  const monthDelta = monthly.savedFromIncome - previousMonthSavedFromIncome;
  const monthDeltaPositive = monthDelta >= 0;
  const savedFromIncomePositive = monthly.savedFromIncome >= 0;
  const totalSavedFromIncomePositive = global.totalSavedFromIncome >= 0;

  const monthlyExpensePctOfIncome =
    monthly.income > 0 ? Math.min(100, (monthly.expense / monthly.income) * 100) : monthly.expense > 0 ? 100 : 0;
  const monthlyOverIncome = monthly.income > 0 && monthly.expense > monthly.income;
  const rawMonthlyGap = monthly.income - monthly.expense;

  const lifetimeExpensePctOfIncome =
    global.totalIncome > 0
      ? Math.min(100, (global.totalExpense / global.totalIncome) * 100)
      : global.totalExpense > 0
        ? 100
        : 0;
  const lifetimeOverIncome = global.totalIncome > 0 && global.totalExpense > global.totalIncome;
  const rawLifetimeGap = global.totalIncome - global.totalExpense;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Savings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Surplus from income after non-transfer spending, plus tracked savings transfers from
            expenses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Month</span>
          <Select
            value={monthKey}
            onValueChange={(key) => router.push(`/savings?month=${key}`, { scroll: false })}
          >
            <SelectTrigger className="w-[200px]" aria-label="Select month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthNavOptions.map((o) => (
                <SelectItem key={o.key} value={o.key}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" aria-labelledby="savings-month-kpis">
        <h2 id="savings-month-kpis" className="sr-only">
          This month
        </h2>
        <Card className="border-border xl:col-span-2 dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Income vs expenses
            </CardTitle>
            <CardDescription className="text-xs leading-snug">
              This month. Expenses include savings transfer rows until you carve them out below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Wallet className="size-3.5 shrink-0 text-primary" aria-hidden />
                  Income
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{formatMoney(monthly.income, currency)}</p>
              </div>
              <div
                className="flex shrink-0 items-center px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                aria-hidden
              >
                vs
              </div>
              <div className="min-w-0 flex-1 text-right">
                <p className="inline-flex items-center justify-end gap-2 text-xs text-muted-foreground">
                  Expenses (total)
                  <Receipt className="size-3.5 shrink-0 text-destructive" aria-hidden />
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{formatMoney(monthly.expense, currency)}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <div
                className="h-2.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(monthlyExpensePctOfIncome)}
                aria-label={`Expenses as a share of income: ${formatPercent(monthlyExpensePctOfIncome, 0)}`}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width]",
                    monthlyOverIncome ? "bg-destructive" : "bg-destructive/80",
                  )}
                  style={{ width: `${monthlyExpensePctOfIncome}%` }}
                />
              </div>
              <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  Spending excl. transfers:{" "}
                  <span className="font-medium tabular-nums text-foreground">
                    {formatMoney(monthly.spendExcludingContribution, currency)}
                  </span>
                </span>
                <span>
                  Income − expenses (raw):{" "}
                  <span
                    className={cn(
                      "font-medium tabular-nums",
                      rawMonthlyGap >= 0 ? "text-foreground" : "text-destructive",
                    )}
                  >
                    {formatMoney(rawMonthlyGap, currency)}
                  </span>
                </span>
              </div>
              {monthlyOverIncome ? (
                <p className="text-xs font-medium text-destructive">
                  Total expenses exceeded income this month.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saved from income
            </CardTitle>
            <CardDescription className="text-xs leading-snug">
              Income minus spending, excluding savings transfers as spend.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums",
                savedFromIncomePositive ? "text-primary" : "text-destructive",
              )}
            >
              {formatMoney(monthly.savedFromIncome, currency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatPercent(monthly.savingsRateFromIncome, 1)} of income
            </p>
          </CardContent>
        </Card>
        <Card className="border-border dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Savings transfer</CardTitle>
            <CardDescription className="text-xs leading-snug">
              Fixed transfer using expense category SAVINGS_CONTRIBUTION.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-blue-600 dark:text-blue-400">
              {formatMoney(monthly.savingsContribution, currency)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border md:col-span-2 xl:col-span-1 dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vs previous month</CardTitle>
            <CardDescription className="text-xs">Change in saved-from-income.</CardDescription>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums",
                monthDeltaPositive ? "text-primary" : "text-destructive",
              )}
            >
              {monthDeltaPositive ? "+" : ""}
              {formatMoney(monthDelta, currency)}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              {monthDeltaPositive ? (
                <TrendingUp className="size-3.5" />
              ) : (
                <TrendingDown className="size-3.5" />
              )}
              vs prior month surplus
            </p>
          </CardContent>
        </Card>
      </section>

      <section
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"
        aria-labelledby="savings-global-kpis"
      >
        <h2 id="savings-global-kpis" className="sr-only">
          All-time
        </h2>
        <Card className="border-border xl:col-span-2 dark:border-zinc-800">
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
                  Expenses (total)
                  <Receipt className="size-3.5 shrink-0 text-destructive" aria-hidden />
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {formatMoney(global.totalExpense, currency)}
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <div
                className="h-2.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(lifetimeExpensePctOfIncome)}
                aria-label={`Lifetime expenses as a share of income: ${formatPercent(lifetimeExpensePctOfIncome, 0)}`}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width]",
                    lifetimeOverIncome ? "bg-destructive" : "bg-destructive/80",
                  )}
                  style={{ width: `${lifetimeExpensePctOfIncome}%` }}
                />
              </div>
              <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  Spending excl. transfers:{" "}
                  <span className="font-medium tabular-nums text-foreground">
                    {formatMoney(global.totalSpendExcludingContribution, currency)}
                  </span>
                </span>
                <span>
                  Income − expenses (raw):{" "}
                  <span
                    className={cn(
                      "font-medium tabular-nums",
                      rawLifetimeGap >= 0 ? "text-foreground" : "text-destructive",
                    )}
                  >
                    {formatMoney(rawLifetimeGap, currency)}
                  </span>
                </span>
              </div>
              {lifetimeOverIncome ? (
                <p className="text-xs font-medium text-destructive">
                  Total expenses have exceeded total income so far.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lifetime saved from income
            </CardTitle>
            <CardDescription className="text-xs">Income minus non-transfer spending, all dates.</CardDescription>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums",
                totalSavedFromIncomePositive ? "text-primary" : "text-destructive",
              )}
            >
              {formatMoney(global.totalSavedFromIncome, currency)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lifetime savings rate
            </CardTitle>
            <CardDescription className="text-xs">From surplus vs lifetime income.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-primary">
              {formatPercent(global.lifetimeSavingsRateFromIncome, 1)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <PiggyBank className="size-4 text-primary" aria-hidden />
              Lifetime savings transfers
            </CardTitle>
            <CardDescription className="text-xs">
              Total recorded as SAVINGS_CONTRIBUTION on expenses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-blue-600 dark:text-blue-400">
              {formatMoney(global.totalSavingsContribution, currency)}
            </p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border min-h-0 min-w-0 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Cash flow · last 12 months</CardTitle>
          <CardDescription>
            Income and total expenses versus surplus from income and tracked savings transfers.
          </CardDescription>
        </CardHeader>
        <CardContent className="w-full min-w-0 pb-4 pt-0">
          <div
            className="h-[320px] w-full min-w-0 [&_.recharts-cartesian-grid_line]:stroke-border [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-legend-wrapper]:text-muted-foreground"
          >
            <ResponsiveContainer width="100%" height={320} minWidth={0} debounce={50}>
              <BarChart data={trend} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => compactAxis(Number(v), currency)}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--popover-foreground)",
                  }}
                  itemSorter={(item) => {
                    const order: Record<string, number> = {
                      income: 0,
                      expense: 1,
                      savedFromIncome: 2,
                      savingsContribution: 3,
                    };
                    return order[String(item.dataKey ?? "")] ?? 99;
                  }}
                  formatter={(value, name) => [
                    formatMoney(Number(value ?? 0), currency),
                    String(name ?? ""),
                  ]}
                  labelFormatter={(_, payload) => {
                    const point = payload?.[0]?.payload as SavingsPoint | undefined;
                    if (!point?.monthKey) return "";
                    return format(new Date(`${point.monthKey}-01T12:00:00`), "MMMM yyyy");
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="income" name="Income" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expense" name="Expenses (total)" fill="#e11d48" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar
                  dataKey="savedFromIncome"
                  name="Saved from income"
                  fill="#059669"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="savingsContribution"
                  name="Savings transfer"
                  fill="#2563eb"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
