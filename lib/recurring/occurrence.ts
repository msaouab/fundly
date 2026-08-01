import type { RecurrenceFrequency } from "@/generated/prisma/enums";
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

/**
 * Whether a template appears in a given calendar month.
 * Window starts at `startsAt`; null occurrenceCount = indefinite.
 */
export function isRecurringActiveInMonth(
  startsAt: Date,
  occurrenceCount: number | null | undefined,
  year: number,
  month: number,
  frequency?: RecurrenceFrequency | string | null,
): boolean {
  const end = occurrenceWindowEnd(startsAt, occurrenceCount, frequency);
  if (!end) {
    // Indefinite: still hide months before the start
    const start = windowStart(startsAt, frequency);
    const { start: monthStart } = monthRangeLocal(year, month);
    const monthEndExclusive = new Date(year, month, 1);
    return monthEndExclusive > start;
  }

  const start = windowStart(startsAt, frequency);
  const { start: monthStart } = monthRangeLocal(year, month);
  const monthEndExclusive = new Date(year, month, 1);
  return monthStart < end && monthEndExclusive > start;
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
