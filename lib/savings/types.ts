export type SavingsPoint = {
  monthKey: string;
  label: string;
  income: number;
  /** All expense rows, including savings contributions. */
  expense: number;
  /** Savings rows with category SAVINGS_CONTRIBUTION. */
  savingsContribution: number;
  recurringSavingsTransfer: number;
  oneOffSavingsTransfer: number;
  /** Income minus spending that is not a savings transfer (`expense − savingsContribution`). */
  spendExcludingContribution: number;
  /** Leftover cash after non-transfer spending: `income − spendExcludingContribution`. */
  savedFromIncome: number;
  /** `savedFromIncome − recurringSavingsTransfer` — discretionary room after planned recurring saves. */
  savedFromIncomeAfterFixedSavings: number;
};

export type MonthlySavings = {
  income: number;
  expense: number;
  spendExcludingContribution: number;
  savingsContribution: number;
  recurringSavingsTransfer: number;
  oneOffSavingsTransfer: number;
  savedFromIncome: number;
  savedFromIncomeAfterFixedSavings: number;
  /** Income − all expenses (every row incl. transfers). */
  cashAfterAllExpenses: number;
  /** `savedFromIncome / income` when income > 0. */
  savingsRateFromIncome: number;
  /** `savedFromIncomeAfterFixedSavings / income` when income > 0. */
  discretionaryRateFromIncomeAfterFixed: number;
};

export type GlobalSavings = {
  totalIncome: number;
  totalExpense: number;
  totalSpendExcludingContribution: number;
  totalSavingsContribution: number;
  totalRecurringSavingsTransfer: number;
  totalOneOffSavingsTransfer: number;
  totalSavedFromIncome: number;
  totalSavedFromIncomeAfterFixedSavings: number;
  lifetimeCashAfterAllExpenses: number;
  lifetimeSavingsRateFromIncome: number;
  lifetimeDiscretionaryRateFromIncome: number;
};

export type SavingsPageData = {
  currency: string;
  monthly: MonthlySavings;
  previousMonthSavedFromIncome: number;
  previousMonthSavedFromIncomeAfterFixedSavings: number;
  global: GlobalSavings;
  trend: SavingsPoint[];
};
