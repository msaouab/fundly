const EPS = 1e-10;

/** Monthly periodic rate from annual percent (e.g. 5 → 5% APR). */
export function monthlyRateFromAnnualPercent(annualPercent: number): number {
  return annualPercent / 100 / 12;
}

/** Future value after `months` with beginning balance `pv` and end-of-month payment `pmt`. */
export function futureValue(pv: number, pmt: number, annualPercent: number, months: number): number {
  if (months <= 0) return pv;
  const r = monthlyRateFromAnnualPercent(annualPercent);
  if (Math.abs(r) < EPS) {
    return pv + pmt * months;
  }
  const factor = (1 + r) ** months;
  return pv * factor + pmt * ((factor - 1) / r);
}

/** Smallest number of whole months until balance reaches target (end-of-month convention). Returns `Infinity` if unreachable. */
export function monthsToGoal(
  target: number,
  saved: number,
  monthly: number,
  annualRatePercent: number,
): number {
  if (target <= saved) return 0;
  if (monthly <= 0) return Number.POSITIVE_INFINITY;
  const r = monthlyRateFromAnnualPercent(annualRatePercent);
  let balance = saved;
  const maxMonths = 1200;
  for (let m = 1; m <= maxMonths; m++) {
    balance = balance * (1 + r) + monthly;
    if (balance >= target - EPS) return m;
  }
  return Number.POSITIVE_INFINITY;
}

/** Required end-of-month payment to reach target in exactly `months` months. */
export function requiredMonthly(
  target: number,
  saved: number,
  months: number,
  annualRatePercent: number,
): number {
  if (months <= 0 || !Number.isFinite(months)) return Number.POSITIVE_INFINITY;
  const r = monthlyRateFromAnnualPercent(annualRatePercent);
  if (Math.abs(r) < EPS) {
    return (target - saved) / months;
  }
  const factor = (1 + r) ** months;
  const fvPv = saved * factor;
  const denom = (factor - 1) / r;
  return (target - fvPv) / denom;
}

export type SavingsProjectionRow = { month: number; balance: number };

/** Month-by-month balances until target or maxMonths cap. Month 0 = starting saved balance. */
export function projectionData(
  target: number,
  saved: number,
  monthly: number,
  annualRatePercent: number,
  maxMonths: number,
): SavingsProjectionRow[] {
  const r = monthlyRateFromAnnualPercent(annualRatePercent);
  const cap = Math.max(1, Math.min(maxMonths, 600));
  const out: SavingsProjectionRow[] = [];
  let balance = saved;
  out.push({ month: 0, balance });
  for (let m = 1; m <= cap; m++) {
    balance = balance * (1 + r) + monthly;
    out.push({ month: m, balance });
    if (balance >= target - EPS) break;
  }
  return out;
}

/** Total compound interest accrued over projection (final balance − contributions − starting principal). Approximation from series. */
export function totalInterestEarned(rows: SavingsProjectionRow[], saved: number, monthly: number): number {
  if (rows.length < 2) return 0;
  const finalBal = rows[rows.length - 1]!.balance;
  const months = rows.length - 1;
  return Math.max(0, finalBal - saved - monthly * months);
}
