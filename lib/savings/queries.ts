import type { ExpenseWithMeta } from "@/app/(app)/expenses/types";
import { computeCashflow } from "@/lib/cashflow";
import { prisma } from "@/lib/prisma";
import { monthRangeLocal } from "@/lib/month";
import {
  listMonthBucketsInRange,
  previousPeriod,
  type DatePeriod,
  type PeriodRange,
} from "@/lib/period";
import { trimEmptyFlowMonths } from "@/lib/charts/trim-flow-series";
import { deleteExpiredRecurringTemplates } from "@/lib/recurring/expire";
import {
  projectRecurringExpenseRows,
  recurringTemplatePeriodTotal,
} from "@/lib/recurring/project";
import type { ExpenseCategory, ExpenseKind } from "@/generated/prisma/enums";
import type { MonthlySavings, SavingsPageData, SavingsPoint } from "./types";

const SAVINGS_CATEGORY = "SAVINGS_CONTRIBUTION" as const;

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

async function sumSavingsTransfers(
  userId: string,
  start?: Date,
  end?: Date,
): Promise<number> {
  if (!start || !end) {
    const [oneOffAgg, templates] = await Promise.all([
      prisma.expense.aggregate({
        where: {
          userId,
          kind: "VARIABLE",
          category: SAVINGS_CATEGORY,
        },
        _sum: { amount: true },
      }),
      prisma.recurringExpense.findMany({
        where: { userId, category: SAVINGS_CATEGORY },
        select: {
          amount: true,
          occurrenceCount: true,
          startsAt: true,
          recurrenceFrequency: true,
        },
      }),
    ]);
    let recurringTotal = 0;
    if (templates.length) {
      const earliest = templates.reduce(
        (min, t) => (t.startsAt < min ? t.startsAt : min),
        templates[0].startsAt,
      );
      recurringTotal = recurringTemplatePeriodTotal(
        templates.map((t) => ({
          amount: Number(t.amount),
          occurrenceCount: t.occurrenceCount,
          startsAt: t.startsAt,
          recurrenceFrequency: t.recurrenceFrequency,
        })),
        { start: earliest, end: new Date() },
      );
    }
    return Number(oneOffAgg._sum.amount ?? 0) + recurringTotal;
  }

  const range: PeriodRange = { start, end };
  const [oneOffAgg, templates] = await Promise.all([
    prisma.expense.aggregate({
      where: {
        userId,
        kind: "VARIABLE",
        category: SAVINGS_CATEGORY,
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
    }),
    prisma.recurringExpense.findMany({
      where: { userId, category: SAVINGS_CATEGORY },
      select: {
        amount: true,
        occurrenceCount: true,
        startsAt: true,
        recurrenceFrequency: true,
      },
    }),
  ]);

  const recurring = recurringTemplatePeriodTotal(
    templates.map((t) => ({
      amount: Number(t.amount),
      occurrenceCount: t.occurrenceCount,
      startsAt: t.startsAt,
      recurrenceFrequency: t.recurrenceFrequency,
    })),
    range,
  );
  return Number(oneOffAgg._sum.amount ?? 0) + recurring;
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
  const series = await Promise.all(
    buckets.map(async (b) => {
      const { start: ms, end: me } = monthRangeLocal(b.year, b.month);
      const { income, expense } = await sumIncomeAndExpense(userId, ms, me);
      return toSavingsPoint(income, expense, b.monthKey, b.label);
    }),
  );

  return trimEmptyFlowMonths(series);
}

function rollup(
  income: number,
  expense: number,
  transfersTotal: number,
): MonthlySavings {
  const { savings, savingsRate } = computeCashflow(income, expense);
  return { income, expense, savings, savingsRate, transfersTotal };
}

async function fetchSavingsTransfers(
  userId: string,
  range: PeriodRange,
  totalIncome: number,
): Promise<{ transfers: ExpenseWithMeta[]; currency: string }> {
  await deleteExpiredRecurringTemplates(userId);

  const dateFilter = { date: { gte: range.start, lte: range.end } };
  const buckets = listMonthBucketsInRange(range.start, range.end, 120);
  const years = [...new Set(buckets.map((b) => b.year))];

  const [expenseRows, templates, monthPaid] = await Promise.all([
    prisma.expense.findMany({
      where: {
        userId,
        kind: "VARIABLE",
        category: SAVINGS_CATEGORY,
        ...dateFilter,
      },
      select: expenseSelect,
      orderBy: { date: "desc" },
    }),
    prisma.recurringExpense.findMany({
      where: { userId, category: SAVINGS_CATEGORY },
    }),
    prisma.recurringExpenseMonth.findMany({
      where: {
        recurringExpense: { userId, category: SAVINGS_CATEGORY },
        year: { in: years.length ? years : [new Date().getFullYear()] },
      },
      select: {
        recurringExpenseId: true,
        year: true,
        month: true,
        payee: true,
      },
    }),
  ]);

  const projected = projectRecurringExpenseRows(
    templates,
    monthPaid,
    range,
    totalIncome,
  );

  const currency =
    templates[0]?.currency ?? expenseRows[0]?.currency ?? "MAD";

  const oneOff: ExpenseWithMeta[] = expenseRows.map((r) => {
    const amount = Number(r.amount);
    return {
      id: r.id,
      userId: r.userId,
      description: r.description,
      kind: r.kind as ExpenseKind,
      category: r.category as ExpenseCategory,
      amount,
      date: r.date.toISOString(),
      currency: r.currency,
      isRecurring: false,
      recurrenceFrequency: r.recurrenceFrequency,
      payee: r.payee,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      sharePercent: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
    };
  });

  const transfers = [...projected, ...oneOff].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return { transfers, currency };
}

export async function fetchSavingsPageData(
  userId: string,
  period: DatePeriod,
): Promise<SavingsPageData> {
  const prev = previousPeriod(period);
  const range: PeriodRange = { start: period.start, end: period.end };

  const [
    periodTotals,
    previousTotals,
    globalTotals,
    periodTransfers,
    previousTransfers,
    globalTransfers,
    trend,
  ] = await Promise.all([
    sumIncomeAndExpense(userId, period.start, period.end),
    sumIncomeAndExpense(userId, prev.start, prev.end),
    sumIncomeAndExpense(userId),
    sumSavingsTransfers(userId, period.start, period.end),
    sumSavingsTransfers(userId, prev.start, prev.end),
    sumSavingsTransfers(userId),
    buildTrendForRange(userId, period.start, period.end),
  ]);

  const periodRollup = rollup(
    periodTotals.income,
    periodTotals.expense,
    periodTransfers,
  );
  const previousRollup = rollup(
    previousTotals.income,
    previousTotals.expense,
    previousTransfers,
  );
  const globalCashflow = computeCashflow(globalTotals.income, globalTotals.expense);

  // Income for share % — include recurring like expenses page would.
  const incomeTemplates = await prisma.recurringIncome.findMany({
    where: { userId },
    select: {
      amount: true,
      occurrenceCount: true,
      startsAt: true,
      recurrenceFrequency: true,
    },
  });
  const oneOffIncome = await prisma.income.aggregate({
    where: {
      userId,
      isRecurring: false,
      date: { gte: period.start, lte: period.end },
    },
    _sum: { amount: true },
  });
  const totalIncome =
    Number(oneOffIncome._sum.amount ?? 0) +
    recurringTemplatePeriodTotal(
      incomeTemplates.map((t) => ({
        amount: Number(t.amount),
        occurrenceCount: t.occurrenceCount,
        startsAt: t.startsAt,
        recurrenceFrequency: t.recurrenceFrequency,
      })),
      range,
    );

  const { transfers, currency } = await fetchSavingsTransfers(
    userId,
    range,
    totalIncome,
  );

  return {
    userId,
    currency,
    periodLabel: period.label,
    period: periodRollup,
    previousPeriodSavings: previousRollup.savings,
    previousPeriodTransfers: previousRollup.transfersTotal,
    global: {
      totalIncome: globalTotals.income,
      totalExpense: globalTotals.expense,
      totalSavings: globalCashflow.savings,
      lifetimeSavingsRate: globalCashflow.savingsRate,
      totalTransfers: globalTransfers,
    },
    trend,
    transfers,
    totalIncome,
  };
}
