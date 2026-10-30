"use client";

import { useMemo, useRef } from "react";
import { PiggyBank, Receipt, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { MonthlyFlowBarChartSavings } from "@/components/charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_HEIGHT_SAVINGS } from "@/lib/charts/constants";
import { formatMoney, formatPercent } from "@/lib/money";
import type { GlobalSavings, MonthlySavings, SavingsPoint } from "@/lib/savings/types";
import type { ExpenseWithMeta } from "@/app/(app)/expenses/types";
import { ExpenseForm } from "@/app/(app)/expenses/_components/expense-form";
import { ExpenseTable } from "@/app/(app)/expenses/_components/expense-table";
import { useLedgerOptimisticRows } from "@/hooks/use-ledger-optimistic-rows";
import type { AddFormControls } from "@/lib/use-add-form-accordion";
import {
  LedgerPage,
  LedgerPageActions,
  LedgerPageHeader,
  LedgerPageOverview,
  LedgerPageTable,
} from "@/components/ledger-page-layout";
import { cn } from "@/lib/utils";

type SavingsViewProps = {
  userId: string;
  currency: string;
  periodLabel: string;
  periodTotals: MonthlySavings;
  previousPeriodSavings: number;
  previousPeriodTransfers: number;
  global: GlobalSavings;
  trend: SavingsPoint[];
  transfers: ExpenseWithMeta[];
  totalIncome: number;
  monthKey: string;
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
  userId,
  currency,
  periodLabel,
  periodTotals,
  previousPeriodSavings,
  previousPeriodTransfers,
  global,
  trend,
  transfers,
  totalIncome,
  monthKey,
}: SavingsViewProps) {
  const addFormControlsRef = useRef<AddFormControls | null>(null);
  const {
    pendingAmountTotal,
    mergedRows: mergedTransfers,
    onOptimisticAdd,
    onOptimisticEnd,
  } = useLedgerOptimisticRows(transfers);

  const displayTransfers = useMemo(() => {
    return mergedTransfers.map((r) => ({
      ...r,
      sharePercent: totalIncome > 0 ? (r.amount / totalIncome) * 100 : 0,
    }));
  }, [mergedTransfers, totalIncome]);

  const transfersTotal = periodTotals.transfersTotal + pendingAmountTotal;
  const periodDelta = periodTotals.savings - previousPeriodSavings;
  const periodDeltaPositive = periodDelta >= 0;
  const transferDelta = transfersTotal - previousPeriodTransfers;
  const transferDeltaPositive = transferDelta >= 0;
  const savingsPositive = periodTotals.savings >= 0;
  const totalSavingsPositive = global.totalSavings >= 0;

  return (
    <LedgerPage>
      <LedgerPageHeader
        title="Savings"
        description="Log savings transfers as expenses in the Savings transfer category. Residual surplus is still income minus all expenses."
      />

      <LedgerPageOverview>
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
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {formatMoney(periodTotals.income, currency)}
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
                    {formatMoney(periodTotals.expense, currency)}
                  </p>
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
                Savings transfers
              </CardTitle>
              <CardDescription className="text-xs">Logged set-asides.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums text-primary">
                {formatMoney(transfersTotal, currency)}
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                {transferDeltaPositive ? (
                  <TrendingUp className="size-3.5" />
                ) : (
                  <TrendingDown className="size-3.5" />
                )}
                {transferDeltaPositive ? "+" : ""}
                {formatMoney(transferDelta, currency)} vs prior period
              </p>
            </CardContent>
          </Card>

          <Card className="border-border dark:border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Residual surplus
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
                {" · "}
                {periodDeltaPositive ? "+" : ""}
                {formatMoney(periodDelta, currency)} vs prior
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
                Transfers (lifetime)
              </CardTitle>
              <CardDescription className="text-xs">All savings transfers.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums text-primary">
                {formatMoney(global.totalTransfers, currency)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border dark:border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Surplus (lifetime)
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
          <CardContent className="w-full min-w-0 px-4 pb-4 pt-4 sm:px-6">
            <MonthlyFlowBarChartSavings
              title="Cash flow by month"
              subtitle={`Monthly residual surplus for ${periodLabel.toLowerCase()} (by recorded date).`}
              data={trend}
              currency={currency}
              height={CHART_HEIGHT_SAVINGS}
            />
          </CardContent>
        </Card>
      </LedgerPageOverview>

      <LedgerPageActions>
        <ExpenseForm
          className="col-span-full w-full"
          currency={currency}
          userId={userId}
          monthTotalIncome={totalIncome}
          lockedCategory="SAVINGS_CONTRIBUTION"
          accordionTitle="Add saving"
          submitLabel="Save"
          successMessage="Saving transfer added"
          shortcutKey="s"
          addFormControlsRef={addFormControlsRef}
          onOptimisticAdd={onOptimisticAdd}
          onOptimisticEnd={onOptimisticEnd}
        />
      </LedgerPageActions>

      <LedgerPageTable>
        <ExpenseTable
          expenses={displayTransfers}
          currency={currency}
          totalIncome={totalIncome}
          monthKey={monthKey}
          isolateSavings={false}
          onFocusAddForm={() => addFormControlsRef.current?.openAndFocus()}
        />
      </LedgerPageTable>
    </LedgerPage>
  );
}
