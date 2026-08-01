import { format } from "date-fns";
import { computeCashflow } from "@/lib/cashflow";
import { addMonths, formatMonthKey } from "@/lib/month";
import type { RecurrenceFrequency } from "@/generated/prisma/enums";
import type {
  ForecastBaseline,
  ForecastHorizon,
  ForecastLine,
  ForecastMonth,
  ForecastTemplateExpense,
  ForecastTemplateIncome,
} from "@/lib/forecast/types";

/** Convert a recurrence amount into an expected monthly cash amount. */
export function amountForMonth(
  amount: number,
  frequency: RecurrenceFrequency | null | undefined,
  targetMonth: number,
  anchorMonth: number,
): number | null {
  const freq = frequency ?? "MONTHLY";
  switch (freq) {
    case "WEEKLY":
      return amount * (52 / 12);
    case "BIWEEKLY":
      return amount * (26 / 12);
    case "MONTHLY":
      return amount;
    case "YEARLY":
      return targetMonth === anchorMonth ? amount : null;
    default:
      return amount;
  }
}

function buildMonthLines(
  year: number,
  month: number,
  incomes: ForecastTemplateIncome[],
  fixedExpenses: ForecastTemplateExpense[],
  variableMonthlyAvg: number,
): ForecastLine[] {
  const lines: ForecastLine[] = [];

  for (const inc of incomes) {
    const amt = amountForMonth(
      inc.amount,
      inc.recurrenceFrequency,
      month,
      inc.anchorMonth,
    );
    if (amt == null || amt <= 0) continue;
    lines.push({
      id: `income:${inc.key}`,
      kind: "income",
      label: inc.source,
      amount: Math.round(amt * 100) / 100,
      incomeType: inc.type,
      recurrenceFrequency: inc.recurrenceFrequency,
    });
  }

  for (const exp of fixedExpenses) {
    const amt = amountForMonth(
      exp.amount,
      exp.recurrenceFrequency,
      month,
      exp.anchorMonth,
    );
    if (amt == null || amt <= 0) continue;
    lines.push({
      id: `fixed:${exp.key}`,
      kind: "fixed_expense",
      label: exp.description.trim() || "Fixed expense",
      amount: Math.round(amt * 100) / 100,
      category: exp.category,
      recurrenceFrequency: exp.recurrenceFrequency,
    });
  }

  if (variableMonthlyAvg > 0) {
    lines.push({
      id: "variable:avg",
      kind: "variable_expense",
      label: "Estimated variable spend",
      amount: Math.round(variableMonthlyAvg * 100) / 100,
    });
  }

  return lines;
}

export function projectForecastMonths(input: {
  incomes: ForecastTemplateIncome[];
  fixedExpenses: ForecastTemplateExpense[];
  variableMonthlyAvg: number;
  variableSampleMonths: number;
  currency: string;
  /** First projected month (usually next calendar month). */
  startYear: number;
  startMonth: number;
  horizon: ForecastHorizon;
}): ForecastBaseline {
  const months: ForecastMonth[] = [];

  for (let i = 0; i < input.horizon; i++) {
    const { year, month } = addMonths(input.startYear, input.startMonth, i);
    const lines = buildMonthLines(
      year,
      month,
      input.incomes,
      input.fixedExpenses,
      input.variableMonthlyAvg,
    );

    let income = 0;
    let fixedExpense = 0;
    let variableExpense = 0;
    for (const line of lines) {
      if (line.kind === "income") income += line.amount;
      else if (line.kind === "fixed_expense") fixedExpense += line.amount;
      else variableExpense += line.amount;
    }
    const expense = fixedExpense + variableExpense;
    const totals = computeCashflow(income, expense);

    months.push({
      year,
      month,
      monthKey: formatMonthKey(year, month),
      label: format(new Date(year, month - 1, 1), "MMMM yyyy"),
      lines,
      totals,
      fixedIncome: income,
      fixedExpense,
      variableExpense,
    });
  }

  return {
    currency: input.currency,
    variableMonthlyAvg: input.variableMonthlyAvg,
    variableSampleMonths: input.variableSampleMonths,
    incomes: input.incomes,
    fixedExpenses: input.fixedExpenses,
    months,
  };
}

/** Deduplicate by key, keeping the latest date occurrence. */
export function pickLatestByKey<T extends { key: string; date: Date }>(
  rows: T[],
): T[] {
  const map = new Map<string, T>();
  for (const row of rows) {
    const prev = map.get(row.key);
    if (!prev || row.date > prev.date) map.set(row.key, row);
  }
  return [...map.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
}
