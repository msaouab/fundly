"use client";

import { format } from "date-fns";
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
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Cell,
  XAxis,
  YAxis,
} from "recharts";
import type {
  CategoryBreakdown,
  ExpenseMonthSummary,
} from "@/app/(app)/expenses/types";
import type { IncomeSource, MonthSummary } from "@/app/(app)/incomes/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORY_CONFIG } from "@/lib/expense-categories";
import { formatMoney, formatPercent } from "@/lib/money";
import { addMonths, formatMonthKey } from "@/lib/month";
import { cn } from "@/lib/utils";
import type { DashboardHighlight, MonthlyFlowPoint } from "@/lib/dashboard/types";

type DashboardViewProps = {
  email: string | null;
  monthKey: string;
  year: number;
  month: number;
  currency: string;
  incomeSummary: MonthSummary;
  expenseSummary: ExpenseMonthSummary;
  categoryBreakdown: CategoryBreakdown[];
  incomeSources: IncomeSource[];
  flowSeries: MonthlyFlowPoint[];
  previousMonthNet: number;
  largestExpense: DashboardHighlight;
};

/** Recharts measures the parent; % height + grid often yields -1 until layout settles. */
const DASHBOARD_CHART_HEIGHT = 280;

const PIE_COLORS = [
  "#0f766e",
  "#0d9488",
  "#14b8a6",
  "#0891b2",
  "#0369a1",
  "#4f46e5",
  "#7c3aed",
  "#a855f7",
  "#db2777",
  "#ea580c",
  "#ca8a04",
  "#52525c",
];

function compactAxis(amount: number, currency: string): string {
  const abs = Math.abs(amount);
  if (abs >= 1000)
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  return formatMoney(amount, currency);
}

export function DashboardView({
  email,
  monthKey,
  year,
  month,
  currency,
  incomeSummary,
  expenseSummary,
  categoryBreakdown,
  incomeSources,
  flowSeries,
  previousMonthNet,
  largestExpense,
}: DashboardViewProps) {
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

  const net = expenseSummary.net;
  const deltaNet = net - previousMonthNet;
  const netPositive = net >= 0;
  const recurringIncomeShare =
    incomeSummary.total > 0 ? (incomeSummary.recurring / incomeSummary.total) * 100 : 0;

  const topCategory = categoryBreakdown.find((c) => c.total > 0);
  const topSource = incomeSources[0];

  const pieSlices = useMemo(() => {
    const rows = categoryBreakdown.filter((b) => b.total > 0);
    return rows.map((b, i) => ({
      key: b.category,
      name: CATEGORY_CONFIG[b.category].label,
      value: b.total,
      fill: PIE_COLORS[i % PIE_COLORS.length]!,
    }));
  }, [categoryBreakdown]);

  const fixedPct =
    expenseSummary.total > 0 ? (expenseSummary.fixed / expenseSummary.total) * 100 : 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 pb-10">
      <header className="flex flex-col gap-4 px-1 sm:flex-row sm:items-start sm:justify-between md:px-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {email ? (
              <>Signed in as {email}</>
            ) : (
              <>Overview for the month</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Month</span>
          <Select
            value={monthKey}
            onValueChange={(key) => {
              router.push(`/?month=${key}`, { scroll: false });
            }}
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

      <section className="grid gap-4 md:grid-cols-12" aria-labelledby="dash-net-heading">
        <Card className="border-border md:col-span-7 lg:col-span-8 dark:border-zinc-800">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-baseline gap-3">
              <CardTitle id="dash-net-heading" className="text-base font-semibold">
                Net cash flow
              </CardTitle>
              <span className="text-xs text-muted-foreground">Income minus expenses</span>
            </div>
            <CardDescription className="sr-only">
              Net amount for this month after subtracting expenses from income.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p
              className={cn(
                "text-4xl font-semibold tabular-nums tracking-tight",
                netPositive ? "text-primary" : "text-destructive",
              )}
            >
              {formatMoney(net, currency)}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">vs previous month:</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-medium tabular-nums",
                  deltaNet > 0
                    ? "text-primary"
                    : deltaNet < 0
                      ? "text-destructive"
                      : "text-muted-foreground",
                )}
              >
                {deltaNet > 0 ? (
                  <TrendingUp className="size-4" aria-hidden />
                ) : deltaNet < 0 ? (
                  <TrendingDown className="size-4" aria-hidden />
                ) : null}
                {deltaNet >= 0 ? "+" : ""}
                {formatMoney(deltaNet, currency)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border md:col-span-5 lg:col-span-4 dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Savings rate</CardTitle>
            <CardDescription>Net divided by monthly income</CardDescription>
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
              Income, expenses, and savings · last 6 months
            </CardTitle>
            <CardDescription>
              Grouped bars for income, expenses, and savings by month.
            </CardDescription>
          </CardHeader>
          <CardContent className="w-full min-w-0 pb-4 pt-0">
            <div
              className="w-full min-w-0 [&_.recharts-cartesian-grid_line]:stroke-border [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-legend-wrapper]:text-muted-foreground"
              style={{ height: DASHBOARD_CHART_HEIGHT }}
            >
              <ResponsiveContainer width="100%" height={DASHBOARD_CHART_HEIGHT} minWidth={0} debounce={50}>
                <BarChart data={flowSeries} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
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
                      const point = payload?.[0]?.payload as MonthlyFlowPoint | undefined;
                      if (!point?.monthKey) return "";
                      return format(new Date(`${point.monthKey}-01T12:00:00`), "MMMM yyyy");
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="income" name="Income" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="expense" name="Expenses" fill="#e11d48" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar
                    dataKey="net"
                    name="Savings"
                    fill="#2563eb"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border min-h-0 min-w-0 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <PieChartIcon className="size-5 text-primary" aria-hidden />
              Spending by category
            </CardTitle>
            <CardDescription>Share of expense total for this month.</CardDescription>
          </CardHeader>
          <CardContent className="w-full min-w-0 pb-4 pt-0">
            {pieSlices.length === 0 ? (
              <p className="py-8 text-sm text-muted-foreground">No expenses yet for this month.</p>
            ) : (
              <div className="w-full min-w-0" style={{ height: DASHBOARD_CHART_HEIGHT }}>
                <ResponsiveContainer width="100%" height={DASHBOARD_CHART_HEIGHT} minWidth={0} debounce={50}>
                  <PieChart margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
                    <Pie
                      data={pieSlices}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={54}
                      outerRadius={92}
                      paddingAngle={2}
                    >
                      {pieSlices.map((entry) => (
                        <Cell key={entry.key} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        color: "var(--popover-foreground)",
                      }}
                      formatter={(value) => formatMoney(Number(value ?? 0), currency)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-label="Highlights and shortcuts" className="grid gap-4 md:grid-cols-2">
        <Card className="border-border dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base font-semibold">This month · quick facts</CardTitle>
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
              <p className="text-muted-foreground">No category spending recorded for this month.</p>
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
              <p className="text-muted-foreground">No income logged for this month.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Manage data</CardTitle>
            <CardDescription>Jump to detailed views for this month.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Link
              href={`/incomes?month=${monthKey}`}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-zinc-800 dark:hover:bg-zinc-800/80"
            >
              <span>Incomes</span>
              <ArrowRight className="size-4 opacity-70" aria-hidden />
            </Link>
            <Link
              href={`/expenses?month=${monthKey}`}
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
