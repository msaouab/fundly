import type { MonthlyCashFlowPoint } from "@/lib/charts/types";
import type { ExpenseWithMeta } from "@/app/(app)/expenses/types";

export type { MonthlyCashFlowPoint as SavingsPoint };

export type MonthlySavings = {
  income: number;
  expense: number;
  savings: number;
  savingsRate: number;
  /** Sum of SAVINGS_CONTRIBUTION expenses (one-off + recurring) in the period. */
  transfersTotal: number;
};

export type GlobalSavings = {
  totalIncome: number;
  totalExpense: number;
  totalSavings: number;
  lifetimeSavingsRate: number;
  totalTransfers: number;
};

export type SavingsPageData = {
  userId: string;
  currency: string;
  periodLabel: string;
  period: MonthlySavings;
  previousPeriodSavings: number;
  previousPeriodTransfers: number;
  global: GlobalSavings;
  trend: MonthlyCashFlowPoint[];
  /** Expense rows with category SAVINGS_CONTRIBUTION for the period. */
  transfers: ExpenseWithMeta[];
  totalIncome: number;
};
