const EPS = 1e-10;

export type NetWorthPoint = {
  month: number;
  real: number;
  nominal: number;
};

/** Surplus repeats each month, growing by monthly income growth. Inflation adjusts real purchasing power vs today. */
export function netWorthSeries(
  currentNetWorth: number,
  monthlySurplus: number,
  monthlyIncomeGrowthPercent: number,
  horizonMonths: number,
  inflationAnnualPercent: number,
): NetWorthPoint[] {
  const out: NetWorthPoint[] = [];
  let nominal = currentNetWorth;
  const gm = monthlyIncomeGrowthPercent / 100 / 12;
  let surplus = monthlySurplus;
  const inflPerMonth =
    inflationAnnualPercent > EPS ? (1 + inflationAnnualPercent / 100) ** (1 / 12) - 1 : 0;

  for (let m = 0; m <= horizonMonths; m++) {
    const deflator =
      inflationAnnualPercent > EPS ? (1 + inflPerMonth) ** m : 1;
    const real = nominal / (deflator > EPS ? deflator : 1);
    out.push({ month: m, nominal, real });

    if (m === horizonMonths) break;
    nominal += surplus;
    surplus *= 1 + gm;
  }

  return out;
}

export type ScenarioLinePoint = {
  month: number;
  baseline: number;
  scenarios: Record<string, number>;
};

export type WhatIfScenario = {
  id: string;
  name: string;
  /** Adjustment to baseline monthly surplus (can be negative). */
  surplusDeltaMonthly: number;
};

/** Linear accumulation from surplus; baseline + each scenario stacks delta per month over horizon. */
export function scenarioComparison(
  startingBalance: number,
  baselineMonthlySurplus: number,
  scenarios: WhatIfScenario[],
  horizonMonths: number,
): ScenarioLinePoint[] {
  const rows: ScenarioLinePoint[] = [];
  let baseline = startingBalance;

  const scenBalances: Record<string, number> = {};
  for (const s of scenarios) {
    scenBalances[s.id] = startingBalance;
  }

  for (let m = 0; m <= horizonMonths; m++) {
    const sc: Record<string, number> = {};
    for (const s of scenarios) {
      sc[s.id] = scenBalances[s.id]!;
    }
    rows.push({ month: m, baseline, scenarios: sc });

    if (m === horizonMonths) break;
    baseline += baselineMonthlySurplus;
    for (const s of scenarios) {
      scenBalances[s.id]! += baselineMonthlySurplus + s.surplusDeltaMonthly;
    }
  }

  return rows;
}

export type FinancialHealthInputs = {
  savingsRatePercent: number;
  debtToIncomePercent: number;
  emergencyMonths: number;
};

export type FinancialHealthBreakdown = {
  /** Pieces of the heuristic before clamping — see tooltip copy in UI. */
  basePoints: number;
  savingsRateEffect: number;
  debtStressEffect: number;
  emergencyEffect: number;
};

/** Same formula as score; exposes rough additive breakdown for explanatory UI only. */
export function financialHealthScore(input: FinancialHealthInputs): {
  score: number;
  label: "Healthy" | "Good" | "Tight" | "At risk";
  breakdown: FinancialHealthBreakdown;
} {
  const sr = Math.max(0, Math.min(100, input.savingsRatePercent));
  const dti = Math.max(0, Math.min(100, input.debtToIncomePercent));
  const em = Math.max(0, input.emergencyMonths);

  const basePoints = 45;
  const savingsRateEffect = sr * 0.38;
  const debtStressEffect = -dti * 0.32;
  const emergencyEffect = Math.min(em, 12) * (8 / 12);
  let score = basePoints + savingsRateEffect + debtStressEffect + emergencyEffect;
  score = Math.max(0, Math.min(100, Math.round(score)));

  let label: "Healthy" | "Good" | "Tight" | "At risk" = "Good";
  if (score >= 75) label = "Healthy";
  else if (score >= 55) label = "Good";
  else if (score >= 35) label = "Tight";
  else label = "At risk";

  return {
    score,
    label,
    breakdown: {
      basePoints,
      savingsRateEffect,
      debtStressEffect,
      emergencyEffect,
    },
  };
}
