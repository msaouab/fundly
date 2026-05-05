import { format } from "date-fns";
import { fetchExpensesPageData } from "@/lib/expenses/queries";
import { fetchIncomesPageData } from "@/lib/incomes/queries";
import { prisma } from "@/lib/prisma";
import { addMonths, formatMonthKey, monthRangeLocal } from "@/lib/month";
import type { DashboardData, MonthlyFlowPoint } from "./types";

async function fetchMonthlyFlowSeries(
  userId: string,
  endYear: number,
  endMonth: number,
  length: number,
): Promise<MonthlyFlowPoint[]> {
  const deltas = Array.from({ length }, (_, i) => i - (length - 1));
  return Promise.all(
    deltas.map(async (delta) => {
      const { year: y, month: m } = addMonths(endYear, endMonth, delta);
      const { start, end } = monthRangeLocal(y, m);
      const [incomeAgg, expenseAgg, recSav, onceSav] = await Promise.all([
        prisma.income.aggregate({
          where: { userId, date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { userId, date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: {
            userId,
            date: { gte: start, lte: end },
            category: "SAVINGS_CONTRIBUTION",
            isRecurring: true,
          },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: {
            userId,
            date: { gte: start, lte: end },
            category: "SAVINGS_CONTRIBUTION",
            isRecurring: false,
          },
          _sum: { amount: true },
        }),
      ]);
      const income = Number(incomeAgg._sum.amount ?? 0);
      const expense = Number(expenseAgg._sum.amount ?? 0);
      const recurringSavingsTransfers = Number(recSav._sum.amount ?? 0);
      const oneOffSavingsTransfers = Number(onceSav._sum.amount ?? 0);
      const savingsContribution = recurringSavingsTransfers + oneOffSavingsTransfers;
      const savedFromIncome = income - expense + savingsContribution;
      const remainderAfterFixedSavings = savedFromIncome - recurringSavingsTransfers;
      return {
        monthKey: formatMonthKey(y, m),
        label: format(new Date(y, m - 1, 1), "MMM"),
        income,
        expense,
        savedFromIncome,
        net: savedFromIncome,
        remainderAfterFixedSavings,
        recurringSavingsTransfers,
        oneOffSavingsTransfers,
      };
    }),
  );
}

async function fetchPreviousMonthCashFlowTotals(
  userId: string,
  year: number,
  month: number,
): Promise<{ grossRemainder: number; remainderAfterFixed: number }> {
  const { year: py, month: pm } = addMonths(year, month, -1);
  const { start, end } = monthRangeLocal(py, pm);
  const [incomeAgg, expenseAgg, recSav, onceSav] = await Promise.all([
    prisma.income.aggregate({
      where: { userId, date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { userId, date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: {
        userId,
        date: { gte: start, lte: end },
        category: "SAVINGS_CONTRIBUTION",
        isRecurring: true,
      },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: {
        userId,
        date: { gte: start, lte: end },
        category: "SAVINGS_CONTRIBUTION",
        isRecurring: false,
      },
      _sum: { amount: true },
    }),
  ]);
  const income = Number(incomeAgg._sum.amount ?? 0);
  const expense = Number(expenseAgg._sum.amount ?? 0);
  const savingsContribution =
    Number(recSav._sum.amount ?? 0) + Number(onceSav._sum.amount ?? 0);
  const recurringSavingsTransfers = Number(recSav._sum.amount ?? 0);
  const grossRemainder = income - expense + savingsContribution;
  const remainderAfterFixed = grossRemainder - recurringSavingsTransfers;
  return { grossRemainder, remainderAfterFixed };
}

function pickLargestExpense(
  expenses: { description: string; payee: string | null; amount: number }[],
): { label: string; amount: number } | null {
  if (!expenses.length) return null;
  let best = expenses[0]!;
  for (let i = 1; i < expenses.length; i++) {
    const r = expenses[i]!;
    if (r.amount > best.amount) best = r;
  }
  const label =
    best.description.trim() ||
    (typeof best.payee === "string" && best.payee.trim()) ||
    "Expense";
  return { label, amount: best.amount };
}

export async function fetchDashboardData(userId: string, year: number, month: number): Promise<DashboardData> {
  const [incomePage, expensePage, flowSeries, previousMonthTotals] = await Promise.all([
    fetchIncomesPageData(userId, year, month),
    fetchExpensesPageData(userId, year, month),
    fetchMonthlyFlowSeries(userId, year, month, 6),
    fetchPreviousMonthCashFlowTotals(userId, year, month),
  ]);

  const currency = incomePage.currency || expensePage.currency || "MAD";
  const sourcesSorted = [...incomePage.sources].sort((a, b) => b.total - a.total);

  return {
    currency,
    incomeSummary: incomePage.summary,
    expenseSummary: expensePage.summary,
    categoryBreakdown: expensePage.breakdown,
    incomeSources: sourcesSorted,
    flowSeries,
    previousMonthNet: previousMonthTotals.grossRemainder,
    previousMonthRemainderAfterFixed: previousMonthTotals.remainderAfterFixed,
    largestExpense: pickLargestExpense(
      expensePage.expenses
        .filter((e) => e.category !== "SAVINGS_CONTRIBUTION")
        .map((e) => ({
          description: e.description,
          payee: e.payee,
          amount: e.amount,
        })),
    ),
  };
}
