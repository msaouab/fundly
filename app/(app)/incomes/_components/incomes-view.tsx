"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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
  const amountRef = useRef<HTMLInputElement | null>(null);
  const [pendingIncomes, setPendingIncomes] = useState<IncomeWithMeta[]>([]);

  const mergedIncomes = useMemo(() => {
    const byId = new Map(incomes.map((r) => [r.id, r]));
    for (const p of pendingIncomes) {
      if (!byId.has(p.id)) {
        byId.set(p.id, p);
      }
    }
    return [...byId.values()].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [incomes, pendingIncomes]);

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
    let extraTotal = 0;
    let extraRecurring = 0;
    for (const p of pendingIncomes) {
      extraTotal += p.amount;
      if (p.isRecurring) extraRecurring += p.amount;
    }
    const total = summary.total + extraTotal;
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
  }, [pendingIncomes, summary]);

  const onOptimisticAdd = useCallback((row: IncomeWithMeta) => {
    setPendingIncomes((prev) => [row, ...prev]);
  }, []);

  const onOptimisticEnd = useCallback((tempId: string) => {
    setPendingIncomes((prev) => prev.filter((p) => p.id !== tempId));
  }, []);

  const monthIncomeTotalForForm =
    summary.total + pendingIncomes.reduce((s, p) => s + p.amount, 0);

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
          amountFocusRef={amountRef}
          onOptimisticAdd={onOptimisticAdd}
          onOptimisticEnd={onOptimisticEnd}
        />
      </LedgerPageActions>

      <LedgerPageTable>
        <IncomeTable
          incomes={displayIncomes}
          currency={currency}
          onFocusAddForm={() => amountRef.current?.focus()}
        />
      </LedgerPageTable>
    </LedgerPage>
  );
}
