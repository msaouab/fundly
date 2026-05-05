"use client";

import { format } from "date-fns";
import { PiggyBank, TrendingDown, TrendingUp } from "lucide-react";
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
  previousMonthSaved: number;
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
  previousMonthSaved,
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

  const monthDelta = monthly.saved - previousMonthSaved;
  const monthDeltaPositive = monthDelta >= 0;
  const monthSavedPositive = monthly.saved >= 0;
  const totalSavedPositive = global.totalSaved >= 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Savings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Combined model: monthly savings flow + global savings balance.
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

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="border-border dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saved this month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn("text-2xl font-semibold tabular-nums", monthSavedPositive ? "text-primary" : "text-destructive")}>
              {formatMoney(monthly.saved, currency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatPercent(monthly.savingsRate, 1)} savings rate
            </p>
          </CardContent>
        </Card>
        <Card className="border-border dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Income this month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{formatMoney(monthly.income, currency)}</p>
          </CardContent>
        </Card>
        <Card className="border-border dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expenses this month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{formatMoney(monthly.expense, currency)}</p>
          </CardContent>
        </Card>
        <Card className="border-border dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vs previous month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn("text-2xl font-semibold tabular-nums", monthDeltaPositive ? "text-primary" : "text-destructive")}>
              {monthDeltaPositive ? "+" : ""}
              {formatMoney(monthDelta, currency)}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              {monthDeltaPositive ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              savings change
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-border dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saved all time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn("text-2xl font-semibold tabular-nums", totalSavedPositive ? "text-primary" : "text-destructive")}>
              {formatMoney(global.totalSaved, currency)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lifetime savings rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-primary">
              {formatPercent(global.lifetimeSavingsRate, 1)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <PiggyBank className="size-4 text-primary" />
              Global balance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="text-muted-foreground">
              Income: <span className="font-medium text-foreground tabular-nums">{formatMoney(global.totalIncome, currency)}</span>
            </p>
            <p className="text-muted-foreground">
              Expenses: <span className="font-medium text-foreground tabular-nums">{formatMoney(global.totalExpense, currency)}</span>
            </p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border min-h-0 min-w-0 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Income, expenses, and savings · last 12 months</CardTitle>
          <CardDescription>Monthly flow (income/expense) and both monthly + global decision context.</CardDescription>
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
                <Bar dataKey="income" name="Income" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="expense" name="Expenses" fill="#e11d48" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="saved" name="Savings" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
