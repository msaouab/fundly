const EPS = 1e-8;

export type DebtItem = {
  id: string;
  name: string;
  balance: number;
  annualRatePercent: number;
  minPayment: number;
};

export type DebtStrategy = "AVALANCHE" | "SNOWBALL";

export type DebtMonthState = {
  month: number;
  balances: Record<string, number>;
  cumulativeInterest: number;
};

export type DebtSimulationResult = {
  history: DebtMonthState[];
  payoffMonthById: Record<string, number>;
  totalInterest: number;
  monthsToDebtFree: number;
};

/** Active debts prioritized for where extra payments go (not for minimum ordering). */
function pickFocalId(strategy: DebtStrategy, debts: DebtItem[], balances: Record<string, number>): string | null {
  const alive = debts.filter((d) => balances[d.id]! > EPS);
  if (!alive.length) return null;
  if (strategy === "AVALANCHE") {
    alive.sort((a, b) => b.annualRatePercent - a.annualRatePercent || balances[b.id]! - balances[a.id]!);
  } else {
    alive.sort((a, b) => balances[a.id]! - balances[b.id]! || b.annualRatePercent - a.annualRatePercent);
  }
  return alive[0]!.id;
}

/**
 * Each month: accrue monthly interest on each open balance, pay minimum on each debt, then sweep
 * `extraMonthly` toward the prioritized debt until exhausted.
 */
export function simulateDebtPayoff(
  debts: DebtItem[],
  strategy: DebtStrategy,
  extraMonthly: number,
  maxMonths = 600,
): DebtSimulationResult {
  const payoffMonthById: Record<string, number> = {};
  if (!debts.length) {
    return { history: [], payoffMonthById, totalInterest: 0, monthsToDebtFree: 0 };
  }

  const balances: Record<string, number> = {};
  const monthlyRate: Record<string, number> = {};
  for (const d of debts) {
    balances[d.id] = d.balance;
    monthlyRate[d.id] = d.annualRatePercent / 100 / 12;
  }

  let cumulativeInterest = 0;
  const history: DebtMonthState[] = [];

  for (let month = 1; month <= maxMonths; month++) {
    const alive = debts.filter((d) => balances[d.id]! > EPS);
    if (!alive.length) break;

    for (const d of alive) {
      const intr = balances[d.id]! * monthlyRate[d.id]!;
      cumulativeInterest += intr;
      balances[d.id] = balances[d.id]! + intr;
    }

    for (const d of debts) {
      if (balances[d.id]! <= EPS) continue;
      const paid = Math.min(d.minPayment, balances[d.id]!);
      balances[d.id] = balances[d.id]! - paid;
      if (balances[d.id]! <= EPS) {
        balances[d.id] = 0;
        if (payoffMonthById[d.id] === undefined) payoffMonthById[d.id] = month;
      }
    }

    let bucket = Math.max(0, extraMonthly);
    while (bucket > EPS) {
      const focal = pickFocalId(strategy, debts, balances);
      if (!focal || balances[focal]! <= EPS) break;
      const payExtra = Math.min(bucket, balances[focal]!);
      balances[focal] = balances[focal]! - payExtra;
      bucket -= payExtra;
      if (balances[focal]! <= EPS) {
        balances[focal] = 0;
        if (payoffMonthById[focal] === undefined) payoffMonthById[focal] = month;
      }
    }

    history.push({
      month,
      balances: { ...balances },
      cumulativeInterest,
    });
  }

  for (const d of debts) {
    if (payoffMonthById[d.id] === undefined && balances[d.id]! <= EPS) {
      payoffMonthById[d.id] = history.length ? history[history.length - 1]!.month : 0;
    }
  }

  return {
    history,
    payoffMonthById,
    totalInterest: cumulativeInterest,
    monthsToDebtFree: history.length,
  };
}

export function debtBalanceSeries(
  result: DebtSimulationResult,
  debtIds: string[],
): { month: number; [key: string]: number }[] {
  return result.history.map((h) => {
    const row: { month: number; [key: string]: number } = { month: h.month };
    for (const id of debtIds) {
      row[id] = h.balances[id] ?? 0;
    }
    return row;
  });
}
