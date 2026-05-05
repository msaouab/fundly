const EPS = 1e-10;

export type AmortizationRow = {
  month: number;
  payment: number;
  principalPortion: number;
  interestPortion: number;
  balance: number;
  cumulativeInterest: number;
};

export function monthlyPayment(principal: number, annualPercent: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualPercent / 100 / 12;
  if (Math.abs(r) < EPS) return principal / months;
  const f = (1 + r) ** months;
  return (principal * r * f) / (f - 1);
}

/** Standard amortization; extra monthly pays additional principal beyond the scheduled amortization slice. */
export function amortizationTable(
  principal: number,
  annualPercent: number,
  months: number,
  extraMonthly = 0,
): AmortizationRow[] {
  const rows: AmortizationRow[] = [];
  if (principal <= 0 || months <= 0) return rows;

  const r = annualPercent / 100 / 12;
  const scheduledMonthly = monthlyPayment(principal, annualPercent, months);
  let balance = principal;
  let cumulativeInterest = 0;
  let m = 0;
  const maxRows = 720;

  while (balance > EPS && m < maxRows) {
    m++;
    const interestPortion = balance * r;
    let principalScheduled = scheduledMonthly - interestPortion;
    if (principalScheduled < 0) principalScheduled = 0;
    let principalExtra = Math.max(0, extraMonthly);
    let principalTotal = principalScheduled + principalExtra;
    if (principalTotal > balance) {
      principalTotal = balance;
      principalExtra = Math.max(0, principalTotal - principalScheduled);
    }
    const payment = interestPortion + principalTotal;

    cumulativeInterest += interestPortion;
    balance -= principalTotal;

    rows.push({
      month: m,
      payment,
      principalPortion: principalTotal,
      interestPortion,
      balance: Math.max(0, balance),
      cumulativeInterest,
    });

    if (balance <= EPS) break;
  }

  return rows;
}

export function totalInterest(table: AmortizationRow[]): number {
  if (!table.length) return 0;
  return table[table.length - 1]!.cumulativeInterest;
}

export function totalPaid(table: AmortizationRow[]): number {
  return table.reduce((s, r) => s + r.payment, 0);
}

export function crossoverMonth(table: AmortizationRow[]): number | null {
  for (const row of table) {
    if (row.principalPortion > row.interestPortion) return row.month;
  }
  return null;
}
