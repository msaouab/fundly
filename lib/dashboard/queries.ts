import { fetchExpensesPageData } from "@/lib/expenses/queries";
import { fetchIncomesPageData } from "@/lib/incomes/queries";
import { computeCashflow } from "@/lib/cashflow";
import { prisma } from "@/lib/prisma";
import { monthRangeLocal } from "@/lib/month";
import {
  listMonthBucketsInRange,
  previousPeriod,
  type DatePeriod,
} from "@/lib/period";
import { trimEmptyFlowMonths } from "@/lib/charts/trim-flow-series";
import type { DashboardData, MonthlyFlowPoint } from "./types";

async function fetchFlowSeriesForRange(
  userId: string,
  start: Date,
  end: Date,
): Promise<MonthlyFlowPoint[]> {
  const buckets = listMonthBucketsInRange(start, end, 24);
  const series = await Promise.all(
    buckets.map(async (b) => {
      const { start: ms, end: me } = monthRangeLocal(b.year, b.month);
      const [incomeAgg, expenseAgg] = await Promise.all([
        prisma.income.aggregate({
          where: { userId, date: { gte: ms, lte: me } },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { userId, date: { gte: ms, lte: me } },
          _sum: { amount: true },
        }),
      ]);
      const income = Number(incomeAgg._sum.amount ?? 0);
      const expense = Number(expenseAgg._sum.amount ?? 0);
      const { savings } = computeCashflow(income, expense);
      return {
        monthKey: b.monthKey,
        label: b.label,
        income,
        expense,
        savings,
      };
    }),
  );

  return trimEmptyFlowMonths(series);
}

async function fetchPeriodSavings(
  userId: string,
  start: Date,
  end: Date,
): Promise<number> {
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
  return computeCashflow(income, expense).savings;
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

export async function fetchDashboardData(
  userId: string,
  period: DatePeriod,
): Promise<DashboardData> {
  const range = { start: period.start, end: period.end };
  const prev = previousPeriod(period);

  const [incomePage, expensePage, flowSeries, previousPeriodSavings] = await Promise.all([
    fetchIncomesPageData(userId, range),
    fetchExpensesPageData(userId, range),
    fetchFlowSeriesForRange(userId, period.start, period.end),
    fetchPeriodSavings(userId, prev.start, prev.end),
  ]);

  const currency = incomePage.currency || expensePage.currency || "MAD";
  const sourcesSorted = [...incomePage.sources].sort((a, b) => b.total - a.total);

  return {
    currency,
    periodLabel: period.label,
    incomeSummary: incomePage.summary,
    expenseSummary: expensePage.summary,
    categoryBreakdown: expensePage.breakdown,
    incomeSources: sourcesSorted,
    flowSeries,
    previousPeriodSavings,
    largestExpense: pickLargestExpense(
      expensePage.expenses.map((e) => ({
        description: e.description,
        payee: e.payee,
        amount: e.amount,
      })),
    ),
  };
}
