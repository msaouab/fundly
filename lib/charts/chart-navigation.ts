import type { ExpenseCategory } from "@/generated/prisma/enums";
import { EXPENSE_CATEGORY_ORDER } from "@/lib/expense-categories";

export type FlowBarSeriesName = "Income" | "Expenses" | "Saved";

const FLOW_SERIES_PATH: Record<FlowBarSeriesName, "/incomes" | "/expenses" | "/savings"> = {
  Income: "/incomes",
  Expenses: "/expenses",
  Saved: "/savings",
};

export function hrefForFlowBarPoint(monthKey: string, series: FlowBarSeriesName): string {
  const base = FLOW_SERIES_PATH[series];
  return `${base}?month=${encodeURIComponent(monthKey)}`;
}

export function hrefForExpenseCategory(
  periodQuery: string,
  categoryId: string,
): string {
  const params = new URLSearchParams(periodQuery);
  params.set("category", categoryId);
  return `/expenses?${params.toString()}`;
}

export function parseExpenseCategoryParam(
  value: string | undefined,
): ExpenseCategory | null {
  if (!value?.trim()) return null;
  const key = value.trim().toUpperCase();
  return EXPENSE_CATEGORY_ORDER.includes(key as ExpenseCategory)
    ? (key as ExpenseCategory)
    : null;
}
