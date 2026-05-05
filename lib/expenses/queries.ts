import type { CategoryBreakdown, ExpenseMonthSummary, ExpenseWithMeta } from "@/app/(app)/expenses/types";
import { prisma } from "@/lib/prisma";
import { monthRangeLocal } from "@/lib/month";
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
  year: number,
  month: number,
): Promise<{
  expenses: ExpenseWithMeta[];
  breakdown: CategoryBreakdown[];
  summary: ExpenseMonthSummary;
  currency: string;
}> {
  const { start, end } = monthRangeLocal(year, month);

  const [expenseRows, incomeAgg] = await Promise.all([
    prisma.expense.findMany({
      where: { userId, date: { gte: start, lte: end } },
      select: expenseSelect,
      orderBy: { date: "desc" },
    }),
    prisma.income.aggregate({
      where: { userId, date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
  ]);

  const currency = expenseRows[0]?.currency ?? "MAD";
  let total = 0;
  let fixed = 0;
  let variable = 0;
  let savingsContribution = 0;
  let recurringSavingsTransfer = 0;
  let oneOffSavingsTransfer = 0;
  for (const r of expenseRows) {
    const n = Number(r.amount);
    total += n;
    if (r.kind === "FIXED") fixed += n;
    else variable += n;
    if (r.category === "SAVINGS_CONTRIBUTION") {
      savingsContribution += n;
      if (r.isRecurring) recurringSavingsTransfer += n;
      else oneOffSavingsTransfer += n;
    }
  }
  const totalIncome = Number(incomeAgg._sum.amount ?? 0);
  // Savings contributions are recorded as expenses but represent money moved to savings,
  // not discretionary spend — align net / rate with the Savings page.
  const spendExcludingSavingsTransfers = total - savingsContribution;
  const net = totalIncome - spendExcludingSavingsTransfers;
  const remainingIncome = net;
  const remainingIncomeAfterFixedSavings = remainingIncome - recurringSavingsTransfer;
  const cashAfterAllExpenses = totalIncome - total;
  const savingsRate = totalIncome > 0 ? (remainingIncome / totalIncome) * 100 : 0;
  const discretionaryRateAfterFixed =
    totalIncome > 0 ? (remainingIncomeAfterFixedSavings / totalIncome) * 100 : 0;

  const expenses: ExpenseWithMeta[] = expenseRows.map((r) => {
    const amount = Number(r.amount);
    const sharePercent =
      totalIncome > 0 ? (amount / totalIncome) * 100 : 0;
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

  return { expenses, breakdown, summary, currency };
}
