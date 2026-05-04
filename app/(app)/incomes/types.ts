import type { IncomeType } from "@/generated/prisma/enums";

/** Client-safe income row with numeric amount and ISO date. */
export type SerializedIncome = {
  id: string;
  userId: string;
  source: string;
  type: IncomeType;
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

export type IncomeWithMeta = SerializedIncome & {
  sharePercent: number;
};

export type IncomeSource = {
  name: string;
  type: IncomeType;
  total: number;
  count: number;
};

export type MonthSummary = {
  total: number;
  recurring: number;
  variable: number;
  totalExpenses: number;
  net: number;
};
