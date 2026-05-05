export type SavingsPoint = {
  monthKey: string;
  label: string;
  income: number;
  expense: number;
  saved: number;
};

export type MonthlySavings = {
  income: number;
  expense: number;
  saved: number;
  savingsRate: number;
};

export type GlobalSavings = {
  totalIncome: number;
  totalExpense: number;
  totalSaved: number;
  lifetimeSavingsRate: number;
};

export type SavingsPageData = {
  currency: string;
  monthly: MonthlySavings;
  previousMonthSaved: number;
  global: GlobalSavings;
  trend: SavingsPoint[];
};
