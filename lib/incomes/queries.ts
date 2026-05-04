import { prisma } from "@/lib/prisma";
import { monthRangeLocal } from "@/lib/month";
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
  year: number,
  month: number,
): Promise<{
  incomes: IncomeWithMeta[];
  sources: IncomeSource[];
  summary: MonthSummary;
  currency: string;
}> {
  const { start, end } = monthRangeLocal(year, month);

  const [incomeRows, expenseAgg] = await Promise.all([
    prisma.income.findMany({
      where: { userId, date: { gte: start, lte: end } },
      select: incomeSelect,
      orderBy: { date: "desc" },
    }),
    prisma.expense.aggregate({
      where: { userId, date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
  ]);

  const currency = incomeRows[0]?.currency ?? "MAD";
  let total = 0;
  let recurring = 0;
  for (const r of incomeRows) {
    const n = Number(r.amount);
    total += n;
    if (r.isRecurring) recurring += n;
  }
  const variable = Math.max(0, total - recurring);
  const totalExpenses = Number(expenseAgg._sum.amount ?? 0);
  const net = total - totalExpenses;

  const incomes: IncomeWithMeta[] = incomeRows.map((r) => {
    const amount = Number(r.amount);
    const sharePercent = total > 0 ? (amount / total) * 100 : 0;
    return {
      id: r.id,
      userId: r.userId,
      source: r.source,
      type: r.type as IncomeType,
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

  const sourceMap = new Map<string, { type: IncomeType; total: number; count: number }>();
  for (const r of incomeRows) {
    const key = r.source;
    const prev = sourceMap.get(key);
    const amt = Number(r.amount);
    if (prev) {
      prev.total += amt;
      prev.count += 1;
    } else {
      sourceMap.set(key, {
        type: r.type as IncomeType,
        total: amt,
        count: 1,
      });
    }
  }
  const sources: IncomeSource[] = [...sourceMap.entries()].map(([name, v]) => ({
    name,
    type: v.type,
    total: v.total,
    count: v.count,
  }));

  const summary: MonthSummary = {
    total,
    recurring,
    variable,
    totalExpenses,
    net,
  };

  return { incomes, sources, summary, currency };
}
