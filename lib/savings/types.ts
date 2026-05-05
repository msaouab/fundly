export type SavingsPoint = {
  monthKey: string;
  label: string;
  income: number;
  /** All expense rows, including savings contributions. */
  expense: number;
  /** Savings rows with category SAVINGS_CONTRIBUTION. */
  savingsContribution: number;
  /** Income minus spending that is not a savings transfer (`expense − savingsContribution`). */
  spendExcludingContribution: number;
  /** Leftover cash after non-transfer spending: `income − spendExcludingContribution`. */
  savedFromIncome: number;
};

export type MonthlySavings = {
  income: number;
  expense: number;
  spendExcludingContribution: number;
  savingsContribution: number;
  savedFromIncome: number;
  /** `savedFromIncome / income` when income > 0. */
  savingsRateFromIncome: number;
};

export type GlobalSavings = {
  totalIncome: number;
  totalExpense: number;
  totalSpendExcludingContribution: number;
  totalSavingsContribution: number;
  totalSavedFromIncome: number;
  lifetimeSavingsRateFromIncome: number;
};

export type SavingsPageData = {
  currency: string;
  monthly: MonthlySavings;
  previousMonthSavedFromIncome: number;
  global: GlobalSavings;
  trend: SavingsPoint[];
};
