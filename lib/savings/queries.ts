import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { addMonths, formatMonthKey, monthRangeLocal } from "@/lib/month";
import type { MonthlySavings, SavingsPageData, SavingsPoint } from "./types";

async function sumIncomeAndExpense(
  userId: string,
  start?: Date,
  end?: Date,
): Promise<{
  income: number;
  expense: number;
  savingsContribution: number;
  recurringSavingsContribution: number;
  oneOffSavingsContribution: number;
}> {
  const dateFilter = start && end ? { date: { gte: start, lte: end } } : {};
  const [incomeAgg, expenseAgg, recurringAgg, oneOffAgg] = await Promise.all([
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
        isRecurring: true,
      },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: {
        userId,
        ...dateFilter,
        category: "SAVINGS_CONTRIBUTION",
        isRecurring: false,
      },
      _sum: { amount: true },
    }),
  ]);

  const recurringSavingsContribution = Number(recurringAgg._sum.amount ?? 0);
  const oneOffSavingsContribution = Number(oneOffAgg._sum.amount ?? 0);

  return {
    income: Number(incomeAgg._sum.amount ?? 0),
    expense: Number(expenseAgg._sum.amount ?? 0),
    savingsContribution: recurringSavingsContribution + oneOffSavingsContribution,
    recurringSavingsContribution,
    oneOffSavingsContribution,
  };
}

function toSavingsPoint(
  income: number,
  expense: number,
  recurringSavingsTransfer: number,
  oneOffSavingsTransfer: number,
  monthKey: string,
  label: string,
): SavingsPoint {
  const savingsContribution = recurringSavingsTransfer + oneOffSavingsTransfer;
  const spendExcludingContribution = expense - savingsContribution;
  const savedFromIncome = income - spendExcludingContribution;
  const savedFromIncomeAfterFixedSavings = savedFromIncome - recurringSavingsTransfer;
  return {
    monthKey,
    label,
    income,
    expense,
    savingsContribution,
    recurringSavingsTransfer,
    oneOffSavingsTransfer,
    spendExcludingContribution,
    savedFromIncome,
    savedFromIncomeAfterFixedSavings,
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
      const { income, expense, recurringSavingsContribution, oneOffSavingsContribution } =
        await sumIncomeAndExpense(userId, start, end);
      return toSavingsPoint(
        income,
        expense,
        recurringSavingsContribution,
        oneOffSavingsContribution,
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
  recurringSavingsTransfer: number,
  oneOffSavingsTransfer: number,
): MonthlySavings {
  const spendExcludingContribution = expense - savingsContribution;
  const savedFromIncome = income - spendExcludingContribution;
  const savedFromIncomeAfterFixedSavings = savedFromIncome - recurringSavingsTransfer;
  const cashAfterAllExpenses = income - expense;
  return {
    income,
    expense,
    spendExcludingContribution,
    savingsContribution,
    recurringSavingsTransfer,
    oneOffSavingsTransfer,
    savedFromIncome,
    savedFromIncomeAfterFixedSavings,
    cashAfterAllExpenses,
    savingsRateFromIncome: income > 0 ? (savedFromIncome / income) * 100 : 0,
    discretionaryRateFromIncomeAfterFixed:
      income > 0 ? (savedFromIncomeAfterFixedSavings / income) * 100 : 0,
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
    monthlyTotals.recurringSavingsContribution,
    monthlyTotals.oneOffSavingsContribution,
  );
  const previousMonth = monthlyRollup(
    previousTotals.income,
    previousTotals.expense,
    previousTotals.savingsContribution,
    previousTotals.recurringSavingsContribution,
    previousTotals.oneOffSavingsContribution,
  );
  const globalSpendExcl =
    globalTotals.expense - globalTotals.savingsContribution;
  const totalSavedFromIncome = globalTotals.income - globalSpendExcl;
  const totalSavedFromIncomeAfterFixedSavings =
    totalSavedFromIncome - globalTotals.recurringSavingsContribution;

  return {
    currency: currencySource?.currency ?? "MAD",
    monthly,
    previousMonthSavedFromIncome: previousMonth.savedFromIncome,
    previousMonthSavedFromIncomeAfterFixedSavings: previousMonth.savedFromIncomeAfterFixedSavings,
    global: {
      totalIncome: globalTotals.income,
      totalExpense: globalTotals.expense,
      totalSpendExcludingContribution: globalSpendExcl,
      totalSavingsContribution: globalTotals.savingsContribution,
      totalRecurringSavingsTransfer: globalTotals.recurringSavingsContribution,
      totalOneOffSavingsTransfer: globalTotals.oneOffSavingsContribution,
      totalSavedFromIncome,
      totalSavedFromIncomeAfterFixedSavings,
      lifetimeCashAfterAllExpenses: globalTotals.income - globalTotals.expense,
      lifetimeSavingsRateFromIncome:
        globalTotals.income > 0 ? (totalSavedFromIncome / globalTotals.income) * 100 : 0,
      lifetimeDiscretionaryRateFromIncome:
        globalTotals.income > 0
          ? (totalSavedFromIncomeAfterFixedSavings / globalTotals.income) * 100
          : 0,
    },
    trend,
  };
}
