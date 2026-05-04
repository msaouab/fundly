import type {
  CategoryBreakdown,
  ExpenseMonthSummary,
} from "@/app/(app)/expenses/types";
import type { IncomeSource, MonthSummary } from "@/app/(app)/incomes/types";

export type MonthlyFlowPoint = {
  monthKey: string;
  /** Short label for chart axis */
  label: string;
  income: number;
  expense: number;
  net: number;
};

export type DashboardHighlight = {
  label: string;
  amount: number;
} | null;

export type DashboardData = {
  currency: string;
  incomeSummary: MonthSummary;
  expenseSummary: ExpenseMonthSummary;
  categoryBreakdown: CategoryBreakdown[];
  incomeSources: IncomeSource[];
  flowSeries: MonthlyFlowPoint[];
  /** Net (income − expenses) for the calendar month before the selected month. */
  previousMonthNet: number;
  largestExpense: DashboardHighlight;
};
