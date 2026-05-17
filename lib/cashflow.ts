/** Monthly cashflow from dated income and expense rows (any day in the month). */
export type CashflowTotals = {
  income: number;
  expense: number;
  /** Income minus all expenses for the period. */
  savings: number;
  /** Savings as a share of income (0 when income is 0). */
  savingsRate: number;
};

export function computeCashflow(income: number, expense: number): CashflowTotals {
  const savings = income - expense;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;
  return { income, expense, savings, savingsRate };
}
