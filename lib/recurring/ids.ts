import { formatMonthKey } from "@/lib/month";

export const RECURRING_EXPENSE_ID_PREFIX = "recurring-expense:";
export const RECURRING_INCOME_ID_PREFIX = "recurring-income:";

export function recurringExpenseRowId(
  templateId: string,
  year: number,
  month: number,
): string {
  return `${RECURRING_EXPENSE_ID_PREFIX}${templateId}:${formatMonthKey(year, month)}`;
}

export function recurringIncomeRowId(
  templateId: string,
  year: number,
  month: number,
): string {
  return `${RECURRING_INCOME_ID_PREFIX}${templateId}:${formatMonthKey(year, month)}`;
}

export function parseRecurringExpenseRowId(
  id: string,
): { templateId: string; year: number; month: number } | null {
  if (!id.startsWith(RECURRING_EXPENSE_ID_PREFIX)) return null;
  const rest = id.slice(RECURRING_EXPENSE_ID_PREFIX.length);
  const sep = rest.lastIndexOf(":");
  if (sep <= 0) return null;
  const templateId = rest.slice(0, sep);
  const monthKey = rest.slice(sep + 1);
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return null;
  const [ys, ms] = monthKey.split("-");
  const year = Number(ys);
  const month = Number(ms);
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  return { templateId, year, month };
}

export function parseRecurringIncomeRowId(
  id: string,
): { templateId: string; year: number; month: number } | null {
  if (!id.startsWith(RECURRING_INCOME_ID_PREFIX)) return null;
  const rest = id.slice(RECURRING_INCOME_ID_PREFIX.length);
  const sep = rest.lastIndexOf(":");
  if (sep <= 0) return null;
  const templateId = rest.slice(0, sep);
  const monthKey = rest.slice(sep + 1);
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return null;
  const [ys, ms] = monthKey.split("-");
  const year = Number(ys);
  const month = Number(ms);
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  return { templateId, year, month };
}

export function isRecurringRowId(id: string): boolean {
  return (
    id.startsWith(RECURRING_EXPENSE_ID_PREFIX) ||
    id.startsWith(RECURRING_INCOME_ID_PREFIX)
  );
}
