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
  totalIncome: number;
  net: number;
  savingsRate: number;
};

export type DuplicateTarget = {
  month: number;
  year: number;
  label: string;
};
