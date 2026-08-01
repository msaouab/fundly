import { prisma } from "@/lib/prisma";
import { addMonths, monthRangeLocal } from "@/lib/month";
import { projectForecastMonths } from "@/lib/forecast/project";
import type {
  ForecastBaseline,
  ForecastHorizon,
  ForecastTemplateExpense,
  ForecastTemplateIncome,
} from "@/lib/forecast/types";
import type { ExpenseCategory, IncomeType, RecurrenceFrequency } from "@/generated/prisma/enums";
import { CATEGORY_CONFIG } from "@/lib/expense-categories";

const LOOKBACK_MONTHS = 3;

export async function fetchForecastBaseline(
  userId: string,
  horizon: ForecastHorizon = 6,
): Promise<ForecastBaseline> {
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;

  const lookbackStart = addMonths(thisYear, thisMonth, -(LOOKBACK_MONTHS - 1));
  const next = addMonths(thisYear, thisMonth, 1);
  const { start: historyStart } = monthRangeLocal(lookbackStart.year, lookbackStart.month);
  const { end: historyEnd } = monthRangeLocal(thisYear, thisMonth);

  const [user, incomeTemplates, expenseTemplates, variableExpenseRows] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true },
    }),
    prisma.recurringIncome.findMany({
      where: { userId },
      select: {
        source: true,
        type: true,
        amount: true,
        currency: true,
        recurrenceFrequency: true,
      },
    }),
    prisma.recurringExpense.findMany({
      where: { userId },
      select: {
        description: true,
        category: true,
        amount: true,
        currency: true,
        recurrenceFrequency: true,
      },
    }),
    prisma.expense.findMany({
      where: {
        userId,
        kind: "VARIABLE",
        date: { gte: historyStart, lte: historyEnd },
      },
      select: {
        amount: true,
        date: true,
        currency: true,
      },
    }),
  ]);

  const currency =
    user?.currency ??
    incomeTemplates[0]?.currency ??
    expenseTemplates[0]?.currency ??
    variableExpenseRows[0]?.currency ??
    "MAD";

  const incomes: ForecastTemplateIncome[] = incomeTemplates.map((r) => ({
    key: `${r.type}::${r.source.trim().toLowerCase()}`,
    source: r.source,
    type: r.type as IncomeType,
    amount: Number(r.amount),
    recurrenceFrequency: r.recurrenceFrequency as RecurrenceFrequency,
    anchorMonth: thisMonth,
  }));

  const fixedExpenses: ForecastTemplateExpense[] = expenseTemplates.map((r) => {
    const description =
      r.description.trim() ||
      CATEGORY_CONFIG[r.category as ExpenseCategory]?.label ||
      "Fixed expense";
    return {
      key: `${r.category}::${description.toLowerCase()}`,
      description,
      category: r.category as ExpenseCategory,
      amount: Number(r.amount),
      recurrenceFrequency: r.recurrenceFrequency as RecurrenceFrequency,
      anchorMonth: thisMonth,
    };
  });

  const thisMonthKey = `${thisYear}-${String(thisMonth).padStart(2, "0")}`;
  const variableByMonth = new Map<string, number>();
  const activeMonths = new Set<string>();
  for (const r of variableExpenseRows) {
    const key = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, "0")}`;
    if (key > thisMonthKey) continue;
    activeMonths.add(key);
    variableByMonth.set(key, (variableByMonth.get(key) ?? 0) + Number(r.amount));
  }

  let variableSum = 0;
  let variableSampleMonths = 0;
  for (const key of activeMonths) {
    variableSum += variableByMonth.get(key) ?? 0;
    variableSampleMonths += 1;
  }
  const variableMonthlyAvg =
    variableSampleMonths > 0 ? variableSum / variableSampleMonths : 0;

  return projectForecastMonths({
    incomes,
    fixedExpenses,
    variableMonthlyAvg,
    variableSampleMonths,
    currency,
    startYear: next.year,
    startMonth: next.month,
    horizon,
  });
}
