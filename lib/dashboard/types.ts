import type {
  CategoryBreakdown,
  ExpenseMonthSummary,
} from "@/app/(app)/expenses/types";
import type { IncomeSource, MonthSummary } from "@/app/(app)/incomes/types";
import type { MonthlyCashFlowPoint } from "@/lib/charts/types";

export type { MonthlyCashFlowPoint as MonthlyFlowPoint };

export type DashboardHighlight = {
  label: string;
  amount: number;
} | null;

export type DashboardData = {
  currency: string;
  periodLabel: string;
  incomeSummary: MonthSummary;
  expenseSummary: ExpenseMonthSummary;
  categoryBreakdown: CategoryBreakdown[];
  incomeSources: IncomeSource[];
  flowSeries: MonthlyCashFlowPoint[];
  previousPeriodSavings: number;
  largestExpense: DashboardHighlight;
};
