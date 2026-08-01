import type { ExpenseCategory, IncomeType, RecurrenceFrequency } from "@/generated/prisma/enums";
import type { CashflowTotals } from "@/lib/cashflow";

export type ForecastHorizon = 1 | 3 | 6;

export type ForecastLineKind = "income" | "fixed_expense" | "variable_expense";

export type ForecastLine = {
  id: string;
  kind: ForecastLineKind;
  label: string;
  amount: number;
  /** Present for expense lines. */
  category?: ExpenseCategory;
  /** Present for income lines. */
  incomeType?: IncomeType;
  recurrenceFrequency?: RecurrenceFrequency | null;
};

export type ForecastMonth = {
  year: number;
  month: number;
  monthKey: string;
  label: string;
  lines: ForecastLine[];
  totals: CashflowTotals;
  fixedIncome: number;
  fixedExpense: number;
  variableExpense: number;
};

export type ForecastTemplateIncome = {
  key: string;
  source: string;
  type: IncomeType;
  amount: number;
  recurrenceFrequency: RecurrenceFrequency | null;
  /** Month (1–12) of last occurrence — used for YEARLY cadence. */
  anchorMonth: number;
  occurrenceCount: number | null;
  startsAt: Date;
};

export type ForecastTemplateExpense = {
  key: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  recurrenceFrequency: RecurrenceFrequency | null;
  anchorMonth: number;
  occurrenceCount: number | null;
  startsAt: Date;
};

export type ForecastBaseline = {
  currency: string;
  /** Average monthly VARIABLE spend from recent history. */
  variableMonthlyAvg: number;
  /** How many past months contributed to the variable average. */
  variableSampleMonths: number;
  incomes: ForecastTemplateIncome[];
  fixedExpenses: ForecastTemplateExpense[];
  months: ForecastMonth[];
};
