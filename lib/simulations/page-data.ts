import { prisma } from "@/lib/prisma";
import { monthRangeLocal } from "@/lib/month";
import type { GoalType } from "@/generated/prisma/enums";

export type SerializedGoal = {
  id: string;
  name: string;
  emoji: string;
  type: GoalType;
  targetAmount: number;
  savedAmount: number;
  monthlyContrib: number;
  interestRate: number;
  currency: string;
  deadline: string | null;
};

export type SerializedSimulation = {
  id: string;
  goalId: string | null;
  type: string;
  name: string;
  configJson: unknown;
  resultJson: unknown;
  createdAt: string;
};

function num(d: { toString(): string }): number {
  return Number(d);
}

export async function fetchSimulationsPageData(userId: string, nowYear: number, nowMonth: number) {
  const { start, end } = monthRangeLocal(nowYear, nowMonth);

  const [goals, simulations, incomeAgg, spendAgg] = await Promise.all([
    prisma.goal.findMany({
      where: { userId, isActive: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.simulation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        goalId: true,
        type: true,
        name: true,
        configJson: true,
        resultJson: true,
        createdAt: true,
      },
    }),
    prisma.income.aggregate({
      where: { userId, date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.expense.findMany({
      where: {
        userId,
        date: { gte: start, lte: end },
      },
      select: { category: true, amount: true },
    }),
  ]);

  let spendExclContribution = 0;
  let savingsContribution = 0;
  for (const r of spendAgg) {
    const amt = Number(r.amount);
    if (r.category === "SAVINGS_CONTRIBUTION") savingsContribution += amt;
    spendExclContribution += amt;
  }
  spendExclContribution -= savingsContribution;

  const serializedGoals: SerializedGoal[] = goals.map((g) => ({
    id: g.id,
    name: g.name,
    emoji: g.emoji,
    type: g.type,
    targetAmount: num(g.targetAmount),
    savedAmount: num(g.savedAmount),
    monthlyContrib: num(g.monthlyContrib),
    interestRate: num(g.interestRate),
    currency: g.currency,
    deadline: g.deadline ? g.deadline.toISOString() : null,
  }));

  const monthlyIncome = Number(incomeAgg._sum.amount ?? 0);
  const savedFromIncome = monthlyIncome - spendExclContribution;

  return {
    goals: serializedGoals,
    simulations: simulations.map(
      (s): SerializedSimulation => ({
        id: s.id,
        goalId: s.goalId,
        type: s.type,
        name: s.name,
        configJson: s.configJson,
        resultJson: s.resultJson,
        createdAt: s.createdAt.toISOString(),
      }),
    ),
    hints: {
      monthlyIncome,
      baselineMonthlySurplus: savedFromIncome,
      monthLabel: `${nowYear}-${String(nowMonth).padStart(2, "0")}`,
    },
  };
}

/** Lifetime surplus approximation for net worth seed hint — not accounting data. */
export async function fetchLifetimeSurplusHint(userId: string): Promise<number> {
  const [incomeAgg, expenseAgg] = await Promise.all([
    prisma.income.aggregate({
      where: { userId },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      where: { userId },
      _sum: { amount: true },
    }),
  ]);
  let totalExp = 0;
  let contribution = 0;
  for (const row of expenseAgg) {
    const a = Number(row._sum.amount ?? 0);
    totalExp += a;
    if (row.category === "SAVINGS_CONTRIBUTION") contribution += a;
  }
  const income = Number(incomeAgg._sum.amount ?? 0);
  const spendExcl = totalExp - contribution;
  return income - spendExcl;
}
