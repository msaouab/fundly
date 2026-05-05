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
  /** Income minus spending excluding savings-category rows (implicit “remainder” room). */
  savedFromIncome: number;
  /** Same value as savedFromIncome; kept for wording parity with KPIs. */
  net: number;
  /** Gross remainder − planned recurring savings transfers (discretionary room). */
  remainderAfterFixedSavings: number;
  recurringSavingsTransfers: number;
  oneOffSavingsTransfers: number;
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
  /** Gross remainder (income − spend excl. transfers) for the month before the selected month. */
  previousMonthNet: number;
  /** Remainder after planned recurring transfers for the month before the selected month. */
  previousMonthRemainderAfterFixed: number;
  largestExpense: DashboardHighlight;
};
