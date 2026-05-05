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
  /** Net cash flow: income − expense + savings contributions (“Savings” bar in chart). */
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
  /** Net (income − expenses + savings contributions) for the month before the selected month. */
  previousMonthNet: number;
  largestExpense: DashboardHighlight;
};
