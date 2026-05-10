"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CategoryBreakdown, ExpenseMonthSummary, ExpenseWithMeta } from "../types";
import type { ExpenseCategory } from "@/generated/prisma/enums";
import { MonthNavPicker } from "@/components/month-nav-picker";
import { DuplicateExpenseBanner } from "./duplicate-modal";
import { ExpenseCategoryBar } from "./expense-category-bar";
import { ExpenseForm } from "./expense-form";
import { ExpenseSummary } from "./expense-summary";
import { ExpenseTable } from "./expense-table";
import { NetBar } from "./net-bar";

type ExpensesViewProps = {
  userId: string;
  monthKey: string;
  year: number;
  month: number;
  expenses: ExpenseWithMeta[];
  summary: ExpenseMonthSummary;
  currency: string;
};

function buildBreakdownFromRows(rows: ExpenseWithMeta[]): CategoryBreakdown[] {
  const map = new Map<ExpenseCategory, { total: number; count: number }>();
  for (const r of rows) {
    const prev = map.get(r.category);
    const amt = r.amount;
    if (prev) {
      prev.total += amt;
      prev.count += 1;
    } else {
      map.set(r.category, { total: amt, count: 1 });
    }
  }
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const out: CategoryBreakdown[] = [...map.entries()].map(([category, v]) => ({
    category,
    total: v.total,
    percent: total > 0 ? (v.total / total) * 100 : 0,
    count: v.count,
  }));
  out.sort((a, b) => b.total - a.total);
  return out;
}

export function ExpensesView({
  userId,
  monthKey,
  year,
  month,
  expenses,
  summary,
  currency,
}: ExpensesViewProps) {
  const router = useRouter();
  const amountRef = useRef<HTMLInputElement | null>(null);
  const [pendingExpenses, setPendingExpenses] = useState<ExpenseWithMeta[]>([]);

  const mergedExpenses = useMemo(() => {
    const byId = new Map(expenses.map((r) => [r.id, r]));
    for (const p of pendingExpenses) {
      if (!byId.has(p.id)) {
        byId.set(p.id, p);
      }
    }
    return [...byId.values()].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [expenses, pendingExpenses]);

  const displayExpenses = useMemo(() => {
    const totalIncome = summary.totalIncome;
    return mergedExpenses.map((r) => ({
      ...r,
      sharePercent:
        totalIncome > 0 ? (r.amount / totalIncome) * 100 : 0,
    }));
  }, [mergedExpenses, summary.totalIncome]);

  const adjustedSummary = useMemo((): ExpenseMonthSummary => {
    let extraTotal = 0;
    let extraFixed = 0;
    let extraVariable = 0;
    let extraSavingsContribution = 0;
    let extraRecurringTransfer = 0;
    let extraOneOffTransfer = 0;
    for (const p of pendingExpenses) {
      extraTotal += p.amount;
      if (p.kind === "FIXED") extraFixed += p.amount;
      else extraVariable += p.amount;
      if (p.category === "SAVINGS_CONTRIBUTION") {
        extraSavingsContribution += p.amount;
        if (p.isRecurring) extraRecurringTransfer += p.amount;
        else extraOneOffTransfer += p.amount;
      }
    }
    const total = summary.total + extraTotal;
    const fixed = summary.fixed + extraFixed;
    const variable = summary.variable + extraVariable;
    const savingsContribution = summary.savingsContribution + extraSavingsContribution;
    const recurringSavingsTransfer =
      summary.recurringSavingsTransfer + extraRecurringTransfer;
    const oneOffSavingsTransfer = summary.oneOffSavingsTransfer + extraOneOffTransfer;
    const totalIncome = summary.totalIncome;
    const spendExcludingSavingsTransfers = total - savingsContribution;
    const net = totalIncome - spendExcludingSavingsTransfers;
    const remainingIncome = net;
    const remainingIncomeAfterFixedSavings = remainingIncome - recurringSavingsTransfer;
    const cashAfterAllExpenses = totalIncome - total;
    const savingsRate = totalIncome > 0 ? (remainingIncome / totalIncome) * 100 : 0;
    const discretionaryRateAfterFixed =
      totalIncome > 0 ? (remainingIncomeAfterFixedSavings / totalIncome) * 100 : 0;
    return {
      total,
      fixed,
      variable,
      savingsContribution,
      recurringSavingsTransfer,
      oneOffSavingsTransfer,
      totalIncome,
      net,
      spendExcludingSavingsTransfers,
      remainingIncome,
      remainingIncomeAfterFixedSavings,
      cashAfterAllExpenses,
      savingsRate,
      discretionaryRateAfterFixed,
    };
  }, [pendingExpenses, summary]);

  const displayBreakdown = useMemo(
    () => buildBreakdownFromRows(displayExpenses),
    [displayExpenses],
  );

  const onOptimisticAdd = useCallback((row: ExpenseWithMeta) => {
    setPendingExpenses((prev) => [row, ...prev]);
  }, []);

  const onOptimisticEnd = useCallback((tempId: string) => {
    setPendingExpenses((prev) => prev.filter((p) => p.id !== tempId));
  }, []);

  const monthExpenseTotalForForm =
    summary.total + pendingExpenses.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-1 pb-10 md:px-0">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Expenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track fixed and variable spending, compare to income, and plan the month ahead.
          </p>
        </div>
        <MonthNavPicker
          monthKey={monthKey}
          year={year}
          month={month}
          monthSelectName="expenseMonth"
          triggerClassName="dark:border-zinc-700"
          onMonthChange={(key) => router.push(`/expenses?month=${key}`, { scroll: false })}
        />
      </header>

      <ExpenseSummary summary={adjustedSummary} currency={currency} />
      <NetBar summary={adjustedSummary} currency={currency} />

      <div className="rounded-xl border border-border bg-background p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <ExpenseCategoryBar
          breakdown={displayBreakdown}
          currency={currency}
          monthTotal={adjustedSummary.total}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr] lg:items-start">
        <div className="flex flex-col gap-6">
          <DuplicateExpenseBanner
            expenses={displayExpenses}
            currency={currency}
            monthKey={monthKey}
          />
          <ExpenseForm
            currency={currency}
            userId={userId}
            monthExpenseTotal={monthExpenseTotalForForm}
            monthTotalIncome={summary.totalIncome}
            amountFocusRef={amountRef}
            onOptimisticAdd={onOptimisticAdd}
            onOptimisticEnd={onOptimisticEnd}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <ExpenseTable
            expenses={displayExpenses}
            currency={currency}
            totalIncome={adjustedSummary.totalIncome}
            monthKey={monthKey}
            onFocusAddForm={() => amountRef.current?.focus()}
          />
        </div>
      </div>
    </div>
  );
}
