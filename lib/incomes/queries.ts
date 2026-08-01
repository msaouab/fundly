import { prisma } from "@/lib/prisma";
import { computeCashflow } from "@/lib/cashflow";
import { listMonthBucketsInRange, type PeriodRange } from "@/lib/period";
import { deleteExpiredRecurringTemplates } from "@/lib/recurring/expire";
import {
  projectRecurringIncomeRows,
  recurringTemplatePeriodTotal,
} from "@/lib/recurring/project";
import type { IncomeWithMeta, IncomeSource, MonthSummary } from "@/app/(app)/incomes/types";
import type { IncomeType } from "@/generated/prisma/enums";

const incomeSelect = {
  id: true,
  userId: true,
  source: true,
  type: true,
  amount: true,
  date: true,
  currency: true,
  isRecurring: true,
  recurrenceFrequency: true,
  payee: true,
  note: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function fetchIncomesPageData(
  userId: string,
  range: PeriodRange,
): Promise<{
  incomes: IncomeWithMeta[];
  sources: IncomeSource[];
  summary: MonthSummary;
  currency: string;
}> {
  await deleteExpiredRecurringTemplates(userId);

  const dateFilter = { date: { gte: range.start, lte: range.end } };
  const buckets = listMonthBucketsInRange(range.start, range.end, 120);
  const years = [...new Set(buckets.map((b) => b.year))];

  const [incomeRows, expenseAgg, expenseTemplates, incomeTemplates, monthPaid] =
    await Promise.all([
      prisma.income.findMany({
        where: { userId, isRecurring: false, ...dateFilter },
        select: incomeSelect,
        orderBy: { date: "desc" },
      }),
      prisma.expense.aggregate({
        where: { userId, kind: "VARIABLE", ...dateFilter },
        _sum: { amount: true },
      }),
      prisma.recurringExpense.findMany({
        where: { userId },
        select: { amount: true, occurrenceCount: true, startsAt: true, recurrenceFrequency: true },
      }),
      prisma.recurringIncome.findMany({
        where: { userId },
      }),
      prisma.recurringIncomeMonth.findMany({
        where: {
          recurringIncome: { userId },
          year: { in: years.length ? years : [new Date().getFullYear()] },
        },
        select: {
          recurringIncomeId: true,
          year: true,
          month: true,
          payee: true,
        },
      }),
    ]);

  const variableIncomeSum = incomeRows.reduce((s, r) => s + Number(r.amount), 0);
  const recurringIncomeTotal = recurringTemplatePeriodTotal(
    incomeTemplates.map((t) => ({
      amount: Number(t.amount),
      occurrenceCount: t.occurrenceCount,
      startsAt: t.startsAt,
      recurrenceFrequency: t.recurrenceFrequency,
    })),
    range,
  );
  const total = variableIncomeSum + recurringIncomeTotal;

  const projected = projectRecurringIncomeRows(
    incomeTemplates,
    monthPaid,
    range,
    total,
  );

  const currency =
    incomeTemplates[0]?.currency ?? incomeRows[0]?.currency ?? "MAD";

  const oneOff: IncomeWithMeta[] = incomeRows.map((r) => {
    const amount = Number(r.amount);
    return {
      id: r.id,
      userId: r.userId,
      source: r.source,
      type: r.type as IncomeType,
      amount,
      date: r.date.toISOString(),
      currency: r.currency,
      isRecurring: false,
      recurrenceFrequency: r.recurrenceFrequency,
      payee: r.payee,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      sharePercent: total > 0 ? (amount / total) * 100 : 0,
    };
  });

  const recurring = projected.reduce((s, r) => s + r.amount, 0);
  const variable = Math.max(0, total - recurring);

  const variableExpenses = Number(expenseAgg._sum.amount ?? 0);
  const recurringExpenses = recurringTemplatePeriodTotal(
    expenseTemplates.map((t) => ({
      amount: Number(t.amount),
      occurrenceCount: t.occurrenceCount,
      startsAt: t.startsAt,
      recurrenceFrequency: t.recurrenceFrequency,
    })),
    range,
  );
  const totalExpenses = variableExpenses + recurringExpenses;
  const { savings } = computeCashflow(total, totalExpenses);

  const incomes: IncomeWithMeta[] = [...projected, ...oneOff].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const sourceMap = new Map<string, { type: IncomeType; total: number; count: number }>();
  for (const r of incomes) {
    const prev = sourceMap.get(r.source);
    if (prev) {
      prev.total += r.amount;
      prev.count += 1;
    } else {
      sourceMap.set(r.source, { type: r.type, total: r.amount, count: 1 });
    }
  }
  const sources: IncomeSource[] = [...sourceMap.entries()].map(([name, v]) => ({
    name,
    type: v.type,
    total: v.total,
    count: v.count,
  }));

  return {
    incomes,
    sources,
    summary: {
      total,
      recurring,
      variable,
      totalExpenses,
      savings,
    },
    currency,
  };
}
