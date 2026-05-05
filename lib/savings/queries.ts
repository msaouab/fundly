import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { addMonths, formatMonthKey, monthRangeLocal } from "@/lib/month";
import type { SavingsPageData, SavingsPoint } from "./types";

async function sumIncomeAndExpense(
  userId: string,
  start?: Date,
  end?: Date,
): Promise<{ income: number; expense: number }> {
  const dateFilter = start && end ? { date: { gte: start, lte: end } } : {};
  const [incomeAgg, expenseAgg] = await Promise.all([
    prisma.income.aggregate({
      where: { userId, ...dateFilter },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { userId, ...dateFilter },
      _sum: { amount: true },
    }),
  ]);

  return {
    income: Number(incomeAgg._sum.amount ?? 0),
    expense: Number(expenseAgg._sum.amount ?? 0),
  };
}

async function buildTrend(
  userId: string,
  endYear: number,
  endMonth: number,
  months = 12,
): Promise<SavingsPoint[]> {
  const deltas = Array.from({ length: months }, (_, i) => i - (months - 1));
  return Promise.all(
    deltas.map(async (delta) => {
      const { year, month } = addMonths(endYear, endMonth, delta);
      const { start, end } = monthRangeLocal(year, month);
      const { income, expense } = await sumIncomeAndExpense(userId, start, end);
      return {
        monthKey: formatMonthKey(year, month),
        label: format(new Date(year, month - 1, 1), "MMM"),
        income,
        expense,
        saved: income - expense,
      };
    }),
  );
}

export async function fetchSavingsPageData(
  userId: string,
  year: number,
  month: number,
): Promise<SavingsPageData> {
  const { start, end } = monthRangeLocal(year, month);
  const { year: py, month: pm } = addMonths(year, month, -1);
  const { start: pStart, end: pEnd } = monthRangeLocal(py, pm);

  const [monthlyTotals, previousTotals, globalTotals, trend, currencySource] =
    await Promise.all([
      sumIncomeAndExpense(userId, start, end),
      sumIncomeAndExpense(userId, pStart, pEnd),
      sumIncomeAndExpense(userId),
      buildTrend(userId, year, month, 12),
      prisma.income.findFirst({
        where: { userId },
        select: { currency: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const monthlySaved = monthlyTotals.income - monthlyTotals.expense;
  const previousSaved = previousTotals.income - previousTotals.expense;
  const totalSaved = globalTotals.income - globalTotals.expense;

  return {
    currency: currencySource?.currency ?? "MAD",
    monthly: {
      income: monthlyTotals.income,
      expense: monthlyTotals.expense,
      saved: monthlySaved,
      savingsRate:
        monthlyTotals.income > 0 ? (monthlySaved / monthlyTotals.income) * 100 : 0,
    },
    previousMonthSaved: previousSaved,
    global: {
      totalIncome: globalTotals.income,
      totalExpense: globalTotals.expense,
      totalSaved,
      lifetimeSavingsRate:
        globalTotals.income > 0 ? (totalSaved / globalTotals.income) * 100 : 0,
    },
    trend,
  };
}
