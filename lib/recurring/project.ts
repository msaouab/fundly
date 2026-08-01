import type { ExpenseWithMeta } from "@/app/(app)/expenses/types";
import type { IncomeWithMeta } from "@/app/(app)/incomes/types";
import { monthRangeLocal } from "@/lib/month";
import { listMonthBucketsInRange, type PeriodRange } from "@/lib/period";
import {
  recurringExpenseRowId,
  recurringIncomeRowId,
} from "@/lib/recurring/ids";
import type {
  ExpenseCategory,
  IncomeType,
  RecurrenceFrequency,
} from "@/generated/prisma/enums";

type ExpenseTemplate = {
  id: string;
  userId: string;
  description: string;
  category: ExpenseCategory;
  amount: { toString(): string } | number;
  currency: string;
  recurrenceFrequency: RecurrenceFrequency;
  createdAt: Date;
  updatedAt: Date;
};

type IncomeTemplate = {
  id: string;
  userId: string;
  source: string;
  type: IncomeType;
  amount: { toString(): string } | number;
  currency: string;
  recurrenceFrequency: RecurrenceFrequency;
  createdAt: Date;
  updatedAt: Date;
};

export type ExpenseMonthPaid = {
  recurringExpenseId: string;
  year: number;
  month: number;
  payee: boolean;
};

export type IncomeMonthPaid = {
  recurringIncomeId: string;
  year: number;
  month: number;
  payee: boolean;
};

export function projectRecurringExpenseRows(
  templates: ExpenseTemplate[],
  monthPaid: ExpenseMonthPaid[],
  range: PeriodRange,
  totalIncome: number,
): ExpenseWithMeta[] {
  const paidMap = new Map(
    monthPaid.map(
      (m) => [`${m.recurringExpenseId}:${m.year}-${m.month}`, m.payee] as const,
    ),
  );
  const buckets = listMonthBucketsInRange(range.start, range.end, 120);
  const rows: ExpenseWithMeta[] = [];

  for (const bucket of buckets) {
    const { start } = monthRangeLocal(bucket.year, bucket.month);
    for (const t of templates) {
      const amount = Number(t.amount);
      const payee =
        paidMap.get(`${t.id}:${bucket.year}-${bucket.month}`) ?? false;
      rows.push({
        id: recurringExpenseRowId(t.id, bucket.year, bucket.month),
        userId: t.userId,
        description: t.description,
        kind: "FIXED",
        category: t.category,
        amount,
        date: start.toISOString(),
        currency: t.currency,
        isRecurring: true,
        recurrenceFrequency: t.recurrenceFrequency,
        payee,
        note: null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        sharePercent: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
      });
    }
  }

  return rows;
}

export function projectRecurringIncomeRows(
  templates: IncomeTemplate[],
  monthPaid: IncomeMonthPaid[],
  range: PeriodRange,
  periodIncomeTotal: number,
): IncomeWithMeta[] {
  const paidMap = new Map(
    monthPaid.map(
      (m) => [`${m.recurringIncomeId}:${m.year}-${m.month}`, m.payee] as const,
    ),
  );
  const buckets = listMonthBucketsInRange(range.start, range.end, 120);
  const rows: IncomeWithMeta[] = [];

  for (const bucket of buckets) {
    const { start } = monthRangeLocal(bucket.year, bucket.month);
    for (const t of templates) {
      const amount = Number(t.amount);
      const payee =
        paidMap.get(`${t.id}:${bucket.year}-${bucket.month}`) ?? false;
      rows.push({
        id: recurringIncomeRowId(t.id, bucket.year, bucket.month),
        userId: t.userId,
        source: t.source,
        type: t.type,
        amount,
        date: start.toISOString(),
        currency: t.currency,
        isRecurring: true,
        recurrenceFrequency: t.recurrenceFrequency,
        payee,
        note: null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        sharePercent: periodIncomeTotal > 0 ? (amount / periodIncomeTotal) * 100 : 0,
      });
    }
  }

  return rows;
}

/** Sum of template amounts × months overlapping the range. */
export function recurringTemplatePeriodTotal(
  templateAmounts: number[],
  range: PeriodRange,
): number {
  const monthCount = listMonthBucketsInRange(range.start, range.end, 120).length;
  const perMonth = templateAmounts.reduce((s, n) => s + n, 0);
  return perMonth * monthCount;
}
