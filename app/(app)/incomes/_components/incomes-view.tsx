"use client";

import { useMemo, useState, useCallback } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import type { IncomeWithMeta, IncomeSource, MonthSummary } from "../types";
import type { IncomeType } from "@/generated/prisma/enums";
import { DuplicateIncomeBanner } from "./duplicate-modal";
import { IncomeForm } from "./income-form";
import { IncomeNetBar } from "./income-net-bar";
import { IncomeSources } from "./income-sources";
import { IncomeSummary } from "./income-summary";
import { IncomeTable } from "./income-table";
import { addMonths, formatMonthKey } from "@/lib/month";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type IncomesViewProps = {
  userId: string;
  monthKey: string;
  year: number;
  month: number;
  incomes: IncomeWithMeta[];
  summary: MonthSummary;
  currency: string;
};

export function IncomesView({
  userId,
  monthKey,
  year,
  month,
  incomes,
  summary,
  currency,
}: IncomesViewProps) {
  const router = useRouter();
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
    const net = total - summary.totalExpenses;
    return {
      total,
      recurring,
      variable,
      totalExpenses: summary.totalExpenses,
      net,
    };
  }, [pendingIncomes, summary]);

  const onOptimisticAdd = useCallback((row: IncomeWithMeta) => {
    setPendingIncomes((prev) => [row, ...prev]);
  }, []);

  const onOptimisticEnd = useCallback((tempId: string) => {
    setPendingIncomes((prev) => prev.filter((p) => p.id !== tempId));
  }, []);

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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-1 pb-10 md:px-0">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Incomes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track salary, freelance, passive income, and other money in for your household.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Month</span>
          <Select
            value={monthKey}
            onValueChange={(key) => {
              router.push(`/incomes?month=${key}`, { scroll: false });
            }}
          >
            <SelectTrigger className="w-[200px]">
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

      <IncomeSummary summary={adjustedSummary} currency={currency} />
      <IncomeNetBar summary={adjustedSummary} currency={currency} />

      <DuplicateIncomeBanner
        incomes={incomes}
        currency={currency}
        monthKey={monthKey}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr] lg:items-start">
        <div className="flex flex-col gap-6">
          <IncomeForm
            currency={currency}
            userId={userId}
            monthTotal={summary.total}
            onOptimisticAdd={onOptimisticAdd}
            onOptimisticEnd={onOptimisticEnd}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <IncomeSources sources={displaySources} currency={currency} />
          <IncomeTable incomes={displayIncomes} currency={currency} />
        </div>
      </div>
    </div>
  );
}
