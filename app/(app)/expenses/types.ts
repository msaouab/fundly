import type { ExpenseCategory, ExpenseKind } from "@/generated/prisma/enums";

/** Client-safe expense row with numeric amount and ISO dates. */
export type SerializedExpense = {
  id: string;
  userId: string;
  description: string;
  kind: ExpenseKind;
  category: ExpenseCategory;
  amount: number;
  date: string;
  currency: string;
  isRecurring: boolean;
  recurrenceFrequency: string | null;
  payee: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseWithMeta = SerializedExpense & {
  /** `amount / monthly income × 100` (0 if income is 0). */
  sharePercent: number;
};

export type CategoryBreakdown = {
  category: ExpenseCategory;
  total: number;
  percent: number;
  count: number;
};

export type ExpenseMonthSummary = {
  total: number;
  fixed: number;
  variable: number;
  savingsContribution: number;
  /** SAVINGS_CONTRIBUTION rows marked recurring (weekly, monthly, …). */
  recurringSavingsTransfer: number;
  /** SAVINGS_CONTRIBUTION one-off moves. */
  oneOffSavingsTransfer: number;
  totalIncome: number;
  net: number;
  /** Spending rows except savings-category transfers: `totalExpense − savingsContribution`. */
  spendExcludingSavingsTransfers: number;
  /** Income minus spend excl. savings transfers (`net` alias for Savings/Dashboard wording). */
  remainingIncome: number;
  /** `remainingIncome − recurringSavingsTransfer` — cash left after planned recurring savings rows. */
  remainingIncomeAfterFixedSavings: number;
  /** Income minus every expense row (including savings transfers)—bank delta if all tracked. */
  cashAfterAllExpenses: number;
  /** `remainingIncome / totalIncome × 100` when income above zero — same numerator as headline net. */
  savingsRate: number;
  /** `remainingIncomeAfterFixedSavings / totalIncome × 100` when income above zero. */
  discretionaryRateAfterFixed: number;
};

export type DuplicateTarget = {
  month: number;
  year: number;
  label: string;
};
