/**
 * Normalize a calendar day to local noon to avoid timezone boundary shifts
 * when converting to/from ISO strings and database timestamps.
 */
export function normalizeDateToLocalNoon(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12,
    0,
    0,
    0,
  );
}

/** Move a date into `targetMonth` (1–12), clamping the day to the month's length. */
export function shiftDateToLocalMonth(
  date: Date,
  targetYear: number,
  targetMonth1: number,
): Date {
  const lastDay = new Date(targetYear, targetMonth1, 0).getDate();
  const day = Math.min(date.getDate(), lastDay);
  return new Date(targetYear, targetMonth1 - 1, day, 12, 0, 0, 0);
}
