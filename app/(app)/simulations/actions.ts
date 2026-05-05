"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { GoalType, SimType } from "@/generated/prisma/enums";

async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Unauthorized");
  return id;
}

const goalTypeEnum = z.enum([
  "CAR",
  "HOUSE",
  "VACATION",
  "EMERGENCY_FUND",
  "EDUCATION",
  "WEDDING",
  "DEVICE",
  "OTHER",
]);

const createGoalSchema = z.object({
  name: z.string().min(1).max(200),
  emoji: z.string().min(1).max(16).default("🎯"),
  type: goalTypeEnum,
  targetAmount: z.coerce.number().positive(),
  savedAmount: z.coerce.number().min(0).default(0),
  monthlyContrib: z.coerce.number().min(0),
  interestRate: z.coerce.number().min(0).max(25).default(0),
  currency: z.string().min(3).max(8).default("MAD"),
});

export type GoalActionOk = {
  ok: true;
  id: string;
};

export type GoalActionErr = {
  ok: false;
  error: string;
  fieldErrors?: Record<string, string>;
};

export type GoalActionResult = GoalActionOk | GoalActionErr;

export async function createGoal(form: unknown): Promise<GoalActionResult> {
  const userId = await requireUserId();
  const parsed = createGoalSchema.safeParse(form);
  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(
      parsed.error.issues.map((i) => [i.path.join("."), i.message]),
    );
    return { ok: false, error: "Invalid goal data.", fieldErrors };
  }

  try {
    const row = await prisma.goal.create({
      data: {
        userId,
        name: parsed.data.name.trim(),
        emoji: parsed.data.emoji,
        type: parsed.data.type as GoalType,
        targetAmount: parsed.data.targetAmount,
        savedAmount: parsed.data.savedAmount,
        monthlyContrib: parsed.data.monthlyContrib,
        interestRate: parsed.data.interestRate,
        currency: parsed.data.currency,
      },
      select: { id: true },
    });
    revalidatePath("/simulations");
    return { ok: true, id: row.id };
  } catch {
    return { ok: false, error: "Could not create goal." };
  }
}

export async function updateGoalSavings(goalId: string, savedAmount: number): Promise<GoalActionResult> {
  const userId = await requireUserId();
  if (!Number.isFinite(savedAmount) || savedAmount < 0) {
    return { ok: false, error: "Invalid savings amount." };
  }

  const existing = await prisma.goal.findFirst({
    where: { id: goalId, userId, isActive: true },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Goal not found." };

  await prisma.goal.update({
    where: { id: goalId },
    data: { savedAmount },
  });

  revalidatePath("/simulations");
  return { ok: true, id: goalId };
}

export async function deleteGoal(goalId: string): Promise<GoalActionResult> {
  const userId = await requireUserId();
  const existing = await prisma.goal.findFirst({
    where: { id: goalId, userId, isActive: true },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Goal not found." };

  await prisma.goal.update({
    where: { id: goalId },
    data: { isActive: false },
  });

  revalidatePath("/simulations");
  return { ok: true, id: goalId };
}

const simTypeEnum = z.enum(["SAVINGS_GOAL", "LOAN", "DEBT_PAYOFF", "WHAT_IF", "NET_WORTH"]);

export async function saveSimulation(input: unknown): Promise<GoalActionResult> {
  const userId = await requireUserId();
  const schema = z.object({
    goalId: z.string().cuid().optional().nullable(),
    type: simTypeEnum,
    name: z.string().min(1).max(200),
    configJson: z.custom<object>((data) => typeof data === "object" && data !== null),
    resultJson: z.custom<object>((data) => typeof data === "object" && data !== null),
  });

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid simulation payload." };
  }

  try {
    if (parsed.data.goalId) {
      const owns = await prisma.goal.findFirst({
        where: { id: parsed.data.goalId, userId, isActive: true },
        select: { id: true },
      });
      if (!owns) return { ok: false, error: "Goal not found." };
    }

    const row = await prisma.simulation.create({
      data: {
        userId,
        goalId: parsed.data.goalId ?? null,
        type: parsed.data.type as SimType,
        name: parsed.data.name.trim(),
        configJson: parsed.data.configJson,
        resultJson: parsed.data.resultJson,
      },
      select: { id: true },
    });
    revalidatePath("/simulations");
    return { ok: true, id: row.id };
  } catch {
    return { ok: false, error: "Could not save simulation." };
  }
}
