"use client";

import { useMemo, useRef } from "react";
import { useLedgerOptimisticRows } from "@/hooks/use-ledger-optimistic-rows";
import type { AddFormControls } from "@/lib/use-add-form-accordion";
import type { IncomeWithMeta, IncomeSource, MonthSummary } from "../types";
import type { IncomeType } from "@/generated/prisma/enums";
import { DuplicateIncomeBanner } from "./duplicate-modal";
import { IncomeForm } from "./income-form";
import { IncomeNetBar } from "./income-net-bar";
import { IncomeSources } from "./income-sources";
import { IncomeSummary } from "./income-summary";
import { IncomeTable } from "./income-table";
import type { SerializedPeriod } from "@/lib/period";
import {
  LedgerPage,
  LedgerPageActions,
  LedgerPageHeader,
  LedgerPageOverview,
  LedgerPageTable,
} from "@/components/ledger-page-layout";

type IncomesViewProps = {
  userId: string;
  period: SerializedPeriod;
  incomes: IncomeWithMeta[];
  summary: MonthSummary;
  currency: string;
};

export function IncomesView({
  userId,
  period,
  incomes,
  summary,
  currency,
}: IncomesViewProps) {
  const monthKey = period.to.slice(0, 7);
  const addFormControlsRef = useRef<AddFormControls | null>(null);
  const {
    pendingRows: pendingIncomes,
    mergedRows: mergedIncomes,
    pendingAmountTotal,
    onOptimisticAdd,
    onOptimisticEnd,
  } = useLedgerOptimisticRows(incomes);

  const displayIncomes = useMemo(() => {
    const total = mergedIncomes.reduce((s, r) => s + r.amount, 0);
    return mergedIncomes.map((r) => ({
      ...r,
      sharePercent: total > 0 ? (r.amount / total) * 100 : 0,
    }));
  }, [mergedIncomes]);

  const displaySources = useMemo((): IncomeSource[] => {
    const map = new Map<string, { type: IncomeType; total: number; count: number }>();
    for (const r of displayIncomes) {
      const prev = map.get(r.source);
      const amt = r.amount;
      if (prev) {
        prev.total += amt;
        prev.count += 1;
      } else {
        map.set(r.source, { type: r.type, total: amt, count: 1 });
      }
    }
    return [...map.entries()].map(([name, v]) => ({
      name,
      type: v.type,
      total: v.total,
      count: v.count,
    }));
  }, [displayIncomes]);

  const adjustedSummary = useMemo((): MonthSummary => {
    let extraRecurring = 0;
    for (const row of pendingIncomes) {
      if (row.isRecurring) extraRecurring += row.amount;
    }
    const total = summary.total + pendingAmountTotal;
    const recurring = summary.recurring + extraRecurring;
    const variable = Math.max(0, total - recurring);
    const savings = total - summary.totalExpenses;
    return {
      total,
      recurring,
      variable,
      totalExpenses: summary.totalExpenses,
      savings,
    };
  }, [pendingIncomes, pendingAmountTotal, summary]);

  const monthIncomeTotalForForm = summary.total + pendingAmountTotal;

  return (
    <LedgerPage>
      <LedgerPageHeader
        title="Incomes"
        description="Track salary, freelance, passive income, and other money in for your household."
      />

      <LedgerPageOverview>
        <IncomeSummary summary={adjustedSummary} currency={currency} period={period} />
        <IncomeNetBar summary={adjustedSummary} currency={currency} />
        <div className="rounded-xl border border-border bg-background p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <IncomeSources sources={displaySources} currency={currency} />
        </div>
        <DuplicateIncomeBanner incomes={incomes} currency={currency} monthKey={monthKey} />
      </LedgerPageOverview>

      <LedgerPageActions>
        <IncomeForm
          className="col-span-full w-full"
          currency={currency}
          userId={userId}
          monthTotal={monthIncomeTotalForForm}
          addFormControlsRef={addFormControlsRef}
          onOptimisticAdd={onOptimisticAdd}
          onOptimisticEnd={onOptimisticEnd}
        />
      </LedgerPageActions>

      <LedgerPageTable>
        <IncomeTable
          incomes={displayIncomes}
          currency={currency}
          onFocusAddForm={() => addFormControlsRef.current?.openAndFocus()}
        />
      </LedgerPageTable>
    </LedgerPage>
  );
}
