import type { CategoryBreakdown, ExpenseMonthSummary, ExpenseWithMeta } from "@/app/(app)/expenses/types";
import { computeCashflow } from "@/lib/cashflow";
import { prisma } from "@/lib/prisma";
import { listMonthBucketsInRange, type PeriodRange } from "@/lib/period";
import { deleteExpiredRecurringTemplates } from "@/lib/recurring/expire";
import {
  projectRecurringExpenseRows,
  recurringTemplatePeriodTotal,
} from "@/lib/recurring/project";
import type { ExpenseCategory, ExpenseKind } from "@/generated/prisma/enums";

const expenseSelect = {
  id: true,
  userId: true,
  description: true,
  kind: true,
  category: true,
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

export async function fetchExpensesPageData(
  userId: string,
  range: PeriodRange,
): Promise<{
  expenses: ExpenseWithMeta[];
  breakdown: CategoryBreakdown[];
  summary: ExpenseMonthSummary;
  currency: string;
}> {
  await deleteExpiredRecurringTemplates(userId);

  const dateFilter = { date: { gte: range.start, lte: range.end } };
  const buckets = listMonthBucketsInRange(range.start, range.end, 120);
  const years = [...new Set(buckets.map((b) => b.year))];

  const [expenseRows, incomeAgg, incomeTemplates, expenseTemplates, monthPaid] =
    await Promise.all([
      prisma.expense.findMany({
        where: { userId, kind: "VARIABLE", ...dateFilter },
        select: expenseSelect,
        orderBy: { date: "desc" },
      }),
      prisma.income.aggregate({
        where: { userId, ...dateFilter },
        _sum: { amount: true },
      }),
      prisma.recurringIncome.findMany({
        where: { userId },
        select: { amount: true, occurrenceCount: true, startsAt: true, currency: true, recurrenceFrequency: true },
      }),
      prisma.recurringExpense.findMany({
        where: { userId },
      }),
      prisma.recurringExpenseMonth.findMany({
        where: {
          recurringExpense: { userId },
          year: { in: years.length ? years : [new Date().getFullYear()] },
        },
        select: {
          recurringExpenseId: true,
          year: true,
          month: true,
          payee: true,
        },
      }),
    ]);

  const variableIncome = Number(incomeAgg._sum.amount ?? 0);
  const recurringIncomeTotal = recurringTemplatePeriodTotal(
    incomeTemplates.map((t) => ({
      amount: Number(t.amount),
      occurrenceCount: t.occurrenceCount,
      startsAt: t.startsAt,
      recurrenceFrequency: t.recurrenceFrequency,
    })),
    range,
  );
  const totalIncome = variableIncome + recurringIncomeTotal;

  const projected = projectRecurringExpenseRows(
    expenseTemplates,
    monthPaid,
    range,
    totalIncome,
  );

  const currency =
    expenseTemplates[0]?.currency ??
    expenseRows[0]?.currency ??
    incomeTemplates[0]?.currency ??
    "MAD";

  let variable = 0;
  const variableExpenses: ExpenseWithMeta[] = expenseRows.map((r) => {
    const amount = Number(r.amount);
    variable += amount;
    return {
      id: r.id,
      userId: r.userId,
      description: r.description,
      kind: r.kind as ExpenseKind,
      category: r.category as ExpenseCategory,
      amount,
      date: r.date.toISOString(),
      currency: r.currency,
      isRecurring: r.isRecurring,
      recurrenceFrequency: r.recurrenceFrequency,
      payee: r.payee,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      sharePercent: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
    };
  });

  const fixed = projected.reduce((s, r) => s + r.amount, 0);
  const total = fixed + variable;
  const { savings, savingsRate } = computeCashflow(totalIncome, total);

  const expenses: ExpenseWithMeta[] = [...projected, ...variableExpenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const catMap = new Map<ExpenseCategory, { total: number; count: number }>();
  for (const r of expenses) {
    const prev = catMap.get(r.category);
    if (prev) {
      prev.total += r.amount;
      prev.count += 1;
    } else {
      catMap.set(r.category, { total: r.amount, count: 1 });
    }
  }
  const breakdown: CategoryBreakdown[] = [...catMap.entries()].map(([category, v]) => ({
    category,
    total: v.total,
    percent: total > 0 ? (v.total / total) * 100 : 0,
    count: v.count,
  }));
  breakdown.sort((a, b) => b.total - a.total);

  return {
    expenses,
    breakdown,
    summary: {
      total,
      fixed,
      variable,
      totalIncome,
      savings,
      savingsRate,
    },
    currency,
  };
}
