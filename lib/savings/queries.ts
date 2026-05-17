import { computeCashflow } from "@/lib/cashflow";
import { prisma } from "@/lib/prisma";
import { monthRangeLocal } from "@/lib/month";
import { listMonthBucketsInRange, previousPeriod, type DatePeriod } from "@/lib/period";
import type { MonthlySavings, SavingsPageData, SavingsPoint } from "./types";

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

function toSavingsPoint(
  income: number,
  expense: number,
  monthKey: string,
  label: string,
): SavingsPoint {
  const { savings } = computeCashflow(income, expense);
  return { monthKey, label, income, expense, savings };
}

async function buildTrendForRange(
  userId: string,
  start: Date,
  end: Date,
): Promise<SavingsPoint[]> {
  const buckets = listMonthBucketsInRange(start, end, 36);
  return Promise.all(
    buckets.map(async (b) => {
      const { start: ms, end: me } = monthRangeLocal(b.year, b.month);
      const { income, expense } = await sumIncomeAndExpense(userId, ms, me);
      return toSavingsPoint(income, expense, b.monthKey, b.label);
    }),
  );
}

function rollup(income: number, expense: number): MonthlySavings {
  const { savings, savingsRate } = computeCashflow(income, expense);
  return { income, expense, savings, savingsRate };
}

export async function fetchSavingsPageData(
  userId: string,
  period: DatePeriod,
): Promise<SavingsPageData> {
  const prev = previousPeriod(period);

  const [periodTotals, previousTotals, globalTotals, trend, currencySource] =
    await Promise.all([
      sumIncomeAndExpense(userId, period.start, period.end),
      sumIncomeAndExpense(userId, prev.start, prev.end),
      sumIncomeAndExpense(userId),
      buildTrendForRange(userId, period.start, period.end),
      prisma.income.findFirst({
        where: { userId },
        select: { currency: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const periodRollup = rollup(periodTotals.income, periodTotals.expense);
  const previousRollup = rollup(previousTotals.income, previousTotals.expense);
  const globalCashflow = computeCashflow(globalTotals.income, globalTotals.expense);

  return {
    currency: currencySource?.currency ?? "MAD",
    periodLabel: period.label,
    period: periodRollup,
    previousPeriodSavings: previousRollup.savings,
    global: {
      totalIncome: globalTotals.income,
      totalExpense: globalTotals.expense,
      totalSavings: globalCashflow.savings,
      lifetimeSavingsRate: globalCashflow.savingsRate,
    },
    trend,
  };
}
