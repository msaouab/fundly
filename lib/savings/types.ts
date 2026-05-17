import type { MonthlyCashFlowPoint } from "@/lib/charts/types";

export type { MonthlyCashFlowPoint as SavingsPoint };

export type MonthlySavings = {
  income: number;
  expense: number;
  savings: number;
  savingsRate: number;
};

export type GlobalSavings = {
  totalIncome: number;
  totalExpense: number;
  totalSavings: number;
  lifetimeSavingsRate: number;
};

export type SavingsPageData = {
  currency: string;
  periodLabel: string;
  period: MonthlySavings;
  previousPeriodSavings: number;
  global: GlobalSavings;
  trend: MonthlyCashFlowPoint[];
};
