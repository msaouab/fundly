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
  previousMonthSavedFromIncomeAfterFixedSavings: number;
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
  previousMonthSavedFromIncomeAfterFixedSavings,
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

  const monthDeltaAfterFixed =
    monthly.savedFromIncomeAfterFixedSavings - previousMonthSavedFromIncomeAfterFixedSavings;
  const monthDeltaGross = monthly.savedFromIncome - previousMonthSavedFromIncome;
  const monthDeltaAfterFixedPositive = monthDeltaAfterFixed >= 0;
  const savedFromIncomeAfterFixedPositive = monthly.savedFromIncomeAfterFixedSavings >= 0;
  const totalSavedFromIncomeAfterFixedPositive = global.totalSavedFromIncomeAfterFixedSavings >= 0;

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
            <strong className="font-medium text-foreground">Gross remainder</strong> is income minus
            spending excluding savings-category rows. <strong className="font-medium text-foreground">Remaining after fixed saving</strong> subtracts planned (recurring) savings transfers from that gross
            room—one-off transfers stay shown separately.
            <strong className="font-medium text-foreground"> Planned transfers</strong> use the savings category with &ldquo;recurring&rdquo; checked (weekly, monthly …).{' '}
            <strong className="font-medium text-foreground">One-off moves</strong> sweep the category without recurring.
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6" aria-labelledby="savings-month-kpis">
        <h2 id="savings-month-kpis" className="sr-only">
          This month
        </h2>
        <Card className="border-border xl:col-span-2 2xl:col-span-2 dark:border-zinc-800">
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
              <p className="text-xs text-muted-foreground">
                Cash after <span className="font-medium text-foreground">every</span> tracked row (incl. transfers):{' '}
                <span
                  className={cn(
                    "font-semibold tabular-nums text-foreground",
                    monthly.cashAfterAllExpenses < 0 && "text-destructive",
                  )}
                >
                  {formatMoney(monthly.cashAfterAllExpenses, currency)}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Remaining income (after fixed savings)
            </CardTitle>
            <CardDescription className="text-xs leading-snug">
              Gross remainder {formatMoney(monthly.savedFromIncome, currency)} minus planned transfers{' '}
              {formatMoney(monthly.recurringSavingsTransfer, currency)}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums",
                savedFromIncomeAfterFixedPositive ? "text-primary" : "text-destructive",
              )}
            >
              {formatMoney(monthly.savedFromIncomeAfterFixedSavings, currency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatPercent(monthly.discretionaryRateFromIncomeAfterFixed, 1)} of income (discretionary)
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Gross remainder:{" "}
              <span className="font-medium tabular-nums text-foreground">
                {formatMoney(monthly.savedFromIncome, currency)}
              </span>{" "}
              ({formatPercent(monthly.savingsRateFromIncome, 1)})
            </p>
          </CardContent>
        </Card>
        <Card className="border-border dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Planned transfers</CardTitle>
            <CardDescription className="text-xs leading-snug">
              Savings category rows marked recurring (weekly/monthly/yearly …).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-blue-700 dark:text-blue-400">
              {formatMoney(monthly.recurringSavingsTransfer, currency)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">One-off transfers</CardTitle>
            <CardDescription className="text-xs leading-snug">
              Same savings category, not flagged as recurring one-off deposits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-sky-600 dark:text-sky-400">
              {formatMoney(monthly.oneOffSavingsTransfer, currency)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border md:col-span-2 xl:col-span-2 2xl:col-span-1 dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vs previous month</CardTitle>
            <CardDescription className="text-xs">Change in remaining income after planned saves.</CardDescription>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums",
                monthDeltaAfterFixedPositive ? "text-primary" : "text-destructive",
              )}
            >
              {monthDeltaAfterFixedPositive ? "+" : ""}
              {formatMoney(monthDeltaAfterFixed, currency)}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              {monthDeltaAfterFixedPositive ? (
                <TrendingUp className="size-3.5" />
              ) : (
                <TrendingDown className="size-3.5" />
              )}
              after fixed saves vs prior month
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Gross remainder vs prior month:{" "}
              <span
                className={cn(
                  "font-medium tabular-nums",
                  monthDeltaGross >= 0 ? "text-foreground" : "text-destructive",
                )}
              >
                {monthDeltaGross >= 0 ? "+" : ""}
                {formatMoney(monthDeltaGross, currency)}
              </span>
            </p>
          </CardContent>
        </Card>
      </section>

      <section
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
        aria-labelledby="savings-global-kpis"
      >
        <h2 id="savings-global-kpis" className="sr-only">
          All-time
        </h2>
        <Card className="border-border xl:col-span-2 2xl:col-span-2 dark:border-zinc-800">
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
              <p className="text-xs text-muted-foreground">
                Cash after <span className="font-medium text-foreground">all</span> rows (lifetime):{' '}
                <span
                  className={cn(
                    "font-semibold tabular-nums text-foreground",
                    global.lifetimeCashAfterAllExpenses < 0 && "text-destructive",
                  )}
                >
                  {formatMoney(global.lifetimeCashAfterAllExpenses, currency)}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lifetime discretionary remainder
            </CardTitle>
            <CardDescription className="text-xs">
              Lifetime gross remainder minus recurring planned transfers (same definition as KPI above).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums",
                totalSavedFromIncomeAfterFixedPositive ? "text-primary" : "text-destructive",
              )}
            >
              {formatMoney(global.totalSavedFromIncomeAfterFixedSavings, currency)}
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Lifetime gross remainder:{" "}
              <span className="font-medium tabular-nums text-foreground">
                {formatMoney(global.totalSavedFromIncome, currency)}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card className="border-border dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lifetime discretionary rate
            </CardTitle>
            <CardDescription className="text-xs">Lifetime remaining after planned saves divided by lifetime income.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-primary">
              {formatPercent(global.lifetimeDiscretionaryRateFromIncome, 1)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Gross room / income: {formatPercent(global.lifetimeSavingsRateFromIncome, 1)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <PiggyBank className="size-4 text-primary" aria-hidden />
              Planned transfers (lifetime)
            </CardTitle>
            <CardDescription className="text-xs">Recurring savings-category moves.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-blue-700 dark:text-blue-400">
              {formatMoney(global.totalRecurringSavingsTransfer, currency)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">One-off transfers (lifetime)</CardTitle>
            <CardDescription className="text-xs">Non-recurring savings-category moves.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-sky-600 dark:text-sky-400">
              {formatMoney(global.totalOneOffSavingsTransfer, currency)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Combined: {formatMoney(global.totalSavingsContribution, currency)}
            </p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border min-h-0 min-w-0 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Cash flow · last 12 months</CardTitle>
          <CardDescription>
            Green = remaining income after planned recurring saves (not one-offs). Planned and one-off transfer amounts are stacked for context.
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
                      savedFromIncomeAfterFixedSavings: 2,
                      recurringSavingsTransfer: 3,
                      oneOffSavingsTransfer: 4,
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
                <Bar dataKey="income" name="Income" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="expense" name="Expenses (total)" fill="#e11d48" radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar
                  dataKey="savedFromIncomeAfterFixedSavings"
                  name="Remainder (after planned saves)"
                  fill="#059669"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
                <Bar
                  dataKey="recurringSavingsTransfer"
                  name="Planned transfers"
                  fill="#1d4ed8"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
                <Bar
                  dataKey="oneOffSavingsTransfer"
                  name="One-off transfers"
                  fill="#38bdf8"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
