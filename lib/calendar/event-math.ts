/** Months until event start (minimum 0). */
export function monthsUntil(start: Date, from = new Date()): number {
  const a = from.getFullYear() * 12 + from.getMonth();
  const b = start.getFullYear() * 12 + start.getMonth();
  return Math.max(0, b - a);
}

export function requiredMonthlySave(
  budget: number,
  reserved: number,
  start: Date,
  from = new Date(),
): number {
  const remaining = Math.max(0, budget - reserved);
  const months = monthsUntil(start, from);
  if (remaining <= 0) return 0;
  if (months <= 0) return remaining;
  return remaining / months;
}

export function fundingProgress(budget: number, reserved: number): number {
  if (budget <= 0) return reserved > 0 ? 100 : 0;
  return Math.min(100, (reserved / budget) * 100);
}
