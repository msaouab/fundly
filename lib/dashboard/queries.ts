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
      const [incomeAgg, expenseAgg] = await Promise.all([
        prisma.income.aggregate({
          where: { userId, date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { userId, date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
      ]);
      const income = Number(incomeAgg._sum.amount ?? 0);
      const expense = Number(expenseAgg._sum.amount ?? 0);
      return {
        monthKey: formatMonthKey(y, m),
        label: format(new Date(y, m - 1, 1), "MMM"),
        income,
        expense,
        net: income - expense,
      };
    }),
  );
}

async function fetchPreviousMonthNet(userId: string, year: number, month: number): Promise<number> {
  const { year: py, month: pm } = addMonths(year, month, -1);
  const { start, end } = monthRangeLocal(py, pm);
  const [incomeAgg, expenseAgg] = await Promise.all([
    prisma.income.aggregate({
      where: { userId, date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { userId, date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
  ]);
  const income = Number(incomeAgg._sum.amount ?? 0);
  const expense = Number(expenseAgg._sum.amount ?? 0);
  return income - expense;
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
  const [incomePage, expensePage, flowSeries, previousMonthNet] = await Promise.all([
    fetchIncomesPageData(userId, year, month),
    fetchExpensesPageData(userId, year, month),
    fetchMonthlyFlowSeries(userId, year, month, 6),
    fetchPreviousMonthNet(userId, year, month),
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
    previousMonthNet,
    largestExpense: pickLargestExpense(
      expensePage.expenses.map((e) => ({
        description: e.description,
        payee: e.payee,
        amount: e.amount,
      })),
    ),
  };
}
