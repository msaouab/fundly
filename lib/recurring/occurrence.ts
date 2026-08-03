import type { RecurrenceFrequency } from "@/generated/prisma/enums";
import { shiftDateToLocalMonth } from "@/lib/date";
import { monthRangeLocal } from "@/lib/month";

const PERIOD_UNIT: Record<
  RecurrenceFrequency,
  { singular: string; plural: string; afterN: string }
> = {
  WEEKLY: { singular: "week", plural: "weeks", afterN: "After N weeks" },
  BIWEEKLY: { singular: "biweek", plural: "biweeks", afterN: "After N biweeks" },
  MONTHLY: { singular: "month", plural: "months", afterN: "After N months" },
  YEARLY: { singular: "year", plural: "years", afterN: "After N years" },
};

export function recurrencePeriodUnit(
  frequency: RecurrenceFrequency | string | null | undefined,
) {
  const freq = (frequency as RecurrenceFrequency) || "MONTHLY";
  return PERIOD_UNIT[freq] ?? PERIOD_UNIT.MONTHLY;
}

/**
 * Exclusive end of the occurrence window (first instant after the last period).
 * null / invalid count → null (indefinite).
 */
export function occurrenceWindowEnd(
  startsAt: Date,
  occurrenceCount: number | null | undefined,
  frequency: RecurrenceFrequency | string | null | undefined,
): Date | null {
  if (occurrenceCount == null || occurrenceCount < 2) return null;
  const freq = (frequency as RecurrenceFrequency) || "MONTHLY";
  const start = new Date(startsAt);

  switch (freq) {
    case "WEEKLY": {
      const end = new Date(start);
      end.setDate(end.getDate() + occurrenceCount * 7);
      return end;
    }
    case "BIWEEKLY": {
      const end = new Date(start);
      end.setDate(end.getDate() + occurrenceCount * 14);
      return end;
    }
    case "YEARLY": {
      return new Date(start.getFullYear() + occurrenceCount, start.getMonth(), 1);
    }
    case "MONTHLY":
    default: {
      return new Date(start.getFullYear(), start.getMonth() + occurrenceCount, 1);
    }
  }
}

function windowStart(
  startsAt: Date,
  frequency: RecurrenceFrequency | string | null | undefined,
): Date {
  const freq = (frequency as RecurrenceFrequency) || "MONTHLY";
  if (freq === "WEEKLY" || freq === "BIWEEKLY") {
    const d = new Date(startsAt);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return new Date(startsAt.getFullYear(), startsAt.getMonth(), 1);
}

function isWithinOccurrenceWindow(
  startsAt: Date,
  occurrenceCount: number | null | undefined,
  year: number,
  month: number,
  frequency?: RecurrenceFrequency | string | null,
): boolean {
  const end = occurrenceWindowEnd(startsAt, occurrenceCount, frequency);
  const start = windowStart(startsAt, frequency);
  const { start: monthStart } = monthRangeLocal(year, month);
  const monthEndExclusive = new Date(year, month, 1);

  if (!end) {
    return monthEndExclusive > start;
  }
  return monthStart < end && monthEndExclusive > start;
}

/**
 * Whether this calendar month is a scheduled occurrence month for the frequency
 * (ignores occurrence-count window — check that separately).
 */
export function isRecurrenceScheduledInMonth(
  startsAt: Date,
  year: number,
  month: number,
  frequency?: RecurrenceFrequency | string | null,
): boolean {
  const freq = (frequency as RecurrenceFrequency) || "MONTHLY";
  const startMonth = startsAt.getMonth() + 1;

  switch (freq) {
    case "YEARLY":
      // e.g. insurance due every August → only August
      return month === startMonth;
    case "WEEKLY":
    case "BIWEEKLY": {
      const stepDays = freq === "WEEKLY" ? 7 : 14;
      const { start: monthStart, end: monthEnd } = monthRangeLocal(year, month);
      const cursor = new Date(startsAt);
      cursor.setHours(12, 0, 0, 0);
      if (cursor > monthEnd) return false;
      while (cursor < monthStart) {
        cursor.setDate(cursor.getDate() + stepDays);
      }
      return cursor <= monthEnd;
    }
    case "MONTHLY":
    default:
      return true;
  }
}

/**
 * Calendar date to show for a projected row in this month (local noon), or null
 * if the template does not occur in the month.
 */
export function occurrenceDateInMonth(
  startsAt: Date,
  year: number,
  month: number,
  frequency?: RecurrenceFrequency | string | null,
): Date | null {
  if (!isRecurrenceScheduledInMonth(startsAt, year, month, frequency)) {
    return null;
  }
  const freq = (frequency as RecurrenceFrequency) || "MONTHLY";
  if (freq === "WEEKLY" || freq === "BIWEEKLY") {
    const stepDays = freq === "WEEKLY" ? 7 : 14;
    const { start: monthStart, end: monthEnd } = monthRangeLocal(year, month);
    const cursor = new Date(startsAt);
    cursor.setHours(12, 0, 0, 0);
    while (cursor < monthStart) {
      cursor.setDate(cursor.getDate() + stepDays);
    }
    if (cursor > monthEnd) return null;
    return cursor;
  }
  return shiftDateToLocalMonth(startsAt, year, month);
}

/**
 * Whether a template appears in a given calendar month.
 * Respects the occurrence window and recurrence schedule (e.g. yearly → anniversary month only).
 */
export function isRecurringActiveInMonth(
  startsAt: Date,
  occurrenceCount: number | null | undefined,
  year: number,
  month: number,
  frequency?: RecurrenceFrequency | string | null,
): boolean {
  if (!isWithinOccurrenceWindow(startsAt, occurrenceCount, year, month, frequency)) {
    return false;
  }
  return isRecurrenceScheduledInMonth(startsAt, year, month, frequency);
}

/**
 * True when the as-of calendar month is fully past the occurrence window.
 */
export function isRecurringExpired(
  startsAt: Date,
  occurrenceCount: number | null | undefined,
  asOfYear: number,
  asOfMonth: number,
  frequency?: RecurrenceFrequency | string | null,
): boolean {
  const end = occurrenceWindowEnd(startsAt, occurrenceCount, frequency);
  if (!end) return false;
  const asOf = new Date(asOfYear, asOfMonth - 1, 1);
  return asOf >= end;
}

export function formatOccurrenceEnds(
  occurrenceCount: number | null | undefined,
  frequency?: RecurrenceFrequency | string | null,
): string {
  if (occurrenceCount == null) return "Indefinite";
  const { singular, plural } = recurrencePeriodUnit(frequency);
  const unit = occurrenceCount === 1 ? singular : plural;
  return `After ${occurrenceCount} ${unit}`;
}
