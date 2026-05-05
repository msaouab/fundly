import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { addMonths, formatMonthKey, monthRangeLocal } from "@/lib/month";
import type { MonthlySavings, SavingsPageData, SavingsPoint } from "./types";

async function sumIncomeAndExpense(
  userId: string,
  start?: Date,
  end?: Date,
): Promise<{ income: number; expense: number; savingsContribution: number }> {
  const dateFilter = start && end ? { date: { gte: start, lte: end } } : {};
  const [incomeAgg, expenseAgg, savingsContributionAgg] = await Promise.all([
    prisma.income.aggregate({
      where: { userId, ...dateFilter },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { userId, ...dateFilter },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: {
        userId,
        ...dateFilter,
        category: "SAVINGS_CONTRIBUTION",
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    income: Number(incomeAgg._sum.amount ?? 0),
    expense: Number(expenseAgg._sum.amount ?? 0),
    savingsContribution: Number(savingsContributionAgg._sum.amount ?? 0),
  };
}

function toSavingsPoint(
  income: number,
  expense: number,
  savingsContribution: number,
  monthKey: string,
  label: string,
): SavingsPoint {
  const spendExcludingContribution = expense - savingsContribution;
  const savedFromIncome = income - spendExcludingContribution;
  return {
    monthKey,
    label,
    income,
    expense,
    savingsContribution,
    spendExcludingContribution,
    savedFromIncome,
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
      const { income, expense, savingsContribution } = await sumIncomeAndExpense(userId, start, end);
      return toSavingsPoint(
        income,
        expense,
        savingsContribution,
        formatMonthKey(year, month),
        format(new Date(year, month - 1, 1), "MMM"),
      );
    }),
  );
}

function monthlyRollup(
  income: number,
  expense: number,
  savingsContribution: number,
): MonthlySavings {
  const spendExcludingContribution = expense - savingsContribution;
  const savedFromIncome = income - spendExcludingContribution;
  return {
    income,
    expense,
    spendExcludingContribution,
    savingsContribution,
    savedFromIncome,
    savingsRateFromIncome: income > 0 ? (savedFromIncome / income) * 100 : 0,
  };
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

  const monthly = monthlyRollup(
    monthlyTotals.income,
    monthlyTotals.expense,
    monthlyTotals.savingsContribution,
  );
  const previousMonth = monthlyRollup(
    previousTotals.income,
    previousTotals.expense,
    previousTotals.savingsContribution,
  );
  const globalSpendExcl =
    globalTotals.expense - globalTotals.savingsContribution;
  const totalSavedFromIncome = globalTotals.income - globalSpendExcl;

  return {
    currency: currencySource?.currency ?? "MAD",
    monthly,
    previousMonthSavedFromIncome: previousMonth.savedFromIncome,
    global: {
      totalIncome: globalTotals.income,
      totalExpense: globalTotals.expense,
      totalSpendExcludingContribution: globalSpendExcl,
      totalSavingsContribution: globalTotals.savingsContribution,
      totalSavedFromIncome,
      lifetimeSavingsRateFromIncome:
        globalTotals.income > 0 ? (totalSavedFromIncome / globalTotals.income) * 100 : 0,
    },
    trend,
  };
}
