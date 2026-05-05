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
