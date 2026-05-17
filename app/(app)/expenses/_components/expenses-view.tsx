"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import type { CategoryBreakdown, ExpenseMonthSummary, ExpenseWithMeta } from "../types";
import type { ExpenseCategory } from "@/generated/prisma/enums";
import {
  deserializeSerializedPeriod,
  periodToQueryString,
  type SerializedPeriod,
} from "@/lib/period";
import { CATEGORY_CONFIG } from "@/lib/expense-categories";
import { DuplicateExpenseBanner } from "./duplicate-modal";
import { ExpenseCategoryBar } from "./expense-category-bar";
import { ExpenseForm } from "./expense-form";
import { ExpenseSummary } from "./expense-summary";
import { ExpenseTable } from "./expense-table";
import { NetBar } from "./net-bar";
import {
  LedgerPage,
  LedgerPageActions,
  LedgerPageHeader,
  LedgerPageOverview,
  LedgerPageTable,
} from "@/components/ledger-page-layout";

type ExpensesViewProps = {
  userId: string;
  period: SerializedPeriod;
  expenses: ExpenseWithMeta[];
  summary: ExpenseMonthSummary;
  currency: string;
  filterCategory?: ExpenseCategory | null;
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
  period,
  expenses,
  summary,
  currency,
  filterCategory = null,
}: ExpensesViewProps) {
  const monthKey = period.to.slice(0, 7);
  const periodQuery = periodToQueryString(deserializeSerializedPeriod(period));
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
    const rows = filterCategory
      ? mergedExpenses.filter((r) => r.category === filterCategory)
      : mergedExpenses;
    return rows.map((r) => ({
      ...r,
      sharePercent: totalIncome > 0 ? (r.amount / totalIncome) * 100 : 0,
    }));
  }, [mergedExpenses, summary.totalIncome, filterCategory]);

  const adjustedSummary = useMemo((): ExpenseMonthSummary => {
    let extraTotal = 0;
    let extraFixed = 0;
    let extraVariable = 0;
    for (const p of pendingExpenses) {
      extraTotal += p.amount;
      if (p.kind === "FIXED") extraFixed += p.amount;
      else extraVariable += p.amount;
    }
    const total = summary.total + extraTotal;
    const fixed = summary.fixed + extraFixed;
    const variable = summary.variable + extraVariable;
    const totalIncome = summary.totalIncome;
    const savings = totalIncome - total;
    const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;
    return {
      total,
      fixed,
      variable,
      totalIncome,
      savings,
      savingsRate,
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
    <LedgerPage>
      <LedgerPageHeader
        title="Expenses"
        description="Track fixed and variable spending, compare to income, and plan the month ahead."
      />

      {filterCategory ? (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-teal-200 bg-teal-50/80 px-4 py-3 text-sm dark:border-teal-900 dark:bg-teal-950/40"
          role="status"
        >
          <p className="text-foreground">
            Showing{" "}
            <span className="font-medium">{CATEGORY_CONFIG[filterCategory].label}</span> only
            <span className="text-muted-foreground"> · {displayExpenses.length} entries</span>
          </p>
          <Link
            href={`/expenses?${periodQuery}`}
            className="font-medium text-teal-800 underline-offset-4 hover:underline dark:text-teal-300"
          >
            Clear filter
          </Link>
        </div>
      ) : null}

      <LedgerPageOverview>
        <ExpenseSummary summary={adjustedSummary} currency={currency} />
        <NetBar summary={adjustedSummary} currency={currency} />
        <div className="rounded-xl border border-border bg-background p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <ExpenseCategoryBar
            breakdown={displayBreakdown}
            currency={currency}
            monthTotal={adjustedSummary.total}
          />
        </div>
        <DuplicateExpenseBanner
          expenses={displayExpenses}
          currency={currency}
          monthKey={monthKey}
        />
      </LedgerPageOverview>

      <LedgerPageActions>
        <ExpenseForm
          className="col-span-full w-full"
          currency={currency}
          userId={userId}
          monthExpenseTotal={monthExpenseTotalForForm}
          monthTotalIncome={summary.totalIncome}
          amountFocusRef={amountRef}
          onOptimisticAdd={onOptimisticAdd}
          onOptimisticEnd={onOptimisticEnd}
        />
      </LedgerPageActions>

      <LedgerPageTable>
        <ExpenseTable
          expenses={displayExpenses}
          currency={currency}
          totalIncome={adjustedSummary.totalIncome}
          monthKey={monthKey}
          onFocusAddForm={() => amountRef.current?.focus()}
        />
      </LedgerPageTable>
    </LedgerPage>
  );
}
