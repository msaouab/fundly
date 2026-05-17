import type { CategoryBreakdown, ExpenseMonthSummary, ExpenseWithMeta } from "@/app/(app)/expenses/types";
import { computeCashflow } from "@/lib/cashflow";
import { prisma } from "@/lib/prisma";
import type { PeriodRange } from "@/lib/period";
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
  const dateFilter = { date: { gte: range.start, lte: range.end } };

  const [expenseRows, incomeAgg] = await Promise.all([
    prisma.expense.findMany({
      where: { userId, ...dateFilter },
      select: expenseSelect,
      orderBy: { date: "desc" },
    }),
    prisma.income.aggregate({
      where: { userId, ...dateFilter },
      _sum: { amount: true },
    }),
  ]);

  const currency = expenseRows[0]?.currency ?? "MAD";
  let total = 0;
  let fixed = 0;
  let variable = 0;
  for (const r of expenseRows) {
    const n = Number(r.amount);
    total += n;
    if (r.kind === "FIXED") fixed += n;
    else variable += n;
  }
  const totalIncome = Number(incomeAgg._sum.amount ?? 0);
  const { savings, savingsRate } = computeCashflow(totalIncome, total);

  const expenses: ExpenseWithMeta[] = expenseRows.map((r) => {
    const amount = Number(r.amount);
    const sharePercent = totalIncome > 0 ? (amount / totalIncome) * 100 : 0;
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
      sharePercent,
    };
  });

  const catMap = new Map<ExpenseCategory, { total: number; count: number }>();
  for (const r of expenseRows) {
    const c = r.category as ExpenseCategory;
    const prev = catMap.get(c);
    const amt = Number(r.amount);
    if (prev) {
      prev.total += amt;
      prev.count += 1;
    } else {
      catMap.set(c, { total: amt, count: 1 });
    }
  }
  const breakdown: CategoryBreakdown[] = [...catMap.entries()].map(([category, v]) => ({
    category,
    total: v.total,
    percent: total > 0 ? (v.total / total) * 100 : 0,
    count: v.count,
  }));
  breakdown.sort((a, b) => b.total - a.total);

  const summary: ExpenseMonthSummary = {
    total,
    fixed,
    variable,
    totalIncome,
    savings,
    savingsRate,
  };

  return { expenses, breakdown, summary, currency };
}
