"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { IncomeType, RecurrenceFrequency } from "@/generated/prisma/enums";
import type { SerializedIncome } from "./types";
import { incomeEditFormSchema, incomeFormSchema } from "./schema";

function serializeIncome(row: {
  id: string;
  userId: string;
  source: string;
  type: IncomeType;
  amount: { toString(): string };
  date: Date;
  currency: string;
  isRecurring: boolean;
  recurrenceFrequency: RecurrenceFrequency | null;
  payee: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SerializedIncome {
  return {
    id: row.id,
    userId: row.userId,
    source: row.source,
    type: row.type,
    amount: Number(row.amount),
    date: row.date.toISOString(),
    currency: row.currency,
    isRecurring: row.isRecurring,
    recurrenceFrequency: row.recurrenceFrequency,
    payee: row.payee,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Unauthorized");
  return id;
}

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function addIncome(
  input: unknown,
): Promise<ActionResult<SerializedIncome>> {
  try {
    const userId = await requireUserId();
    const parsed = incomeFormSchema.safeParse(input);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      return {
        ok: false,
        error: "Validation failed",
        fieldErrors: Object.fromEntries(
          Object.entries(flat)
            .filter(([, v]) => v?.[0])
            .map(([k, v]) => [k, v![0]]),
        ) as Record<string, string>,
      };
    }
    const d = parsed.data;
    const row = await prisma.income.create({
      data: {
        userId,
        source: d.source,
        type: d.type as IncomeType,
        amount: d.amount,
        date: d.date,
        currency: d.currency,
        isRecurring: d.isRecurring,
        recurrenceFrequency: d.isRecurring
          ? (d.recurrenceFrequency as RecurrenceFrequency)
          : null,
        payee: d.payee || null,
        note: d.note || null,
      },
      select: {
        id: true,
        userId: true,
        source: true,
        type: true,
        amount: true,
        date: true,
        currency: true,
        isRecurring: true,
        recurrenceFrequency: true,
        payee: true,
        note: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    revalidatePath("/incomes");
    return { ok: true, data: serializeIncome(row) };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to add income";
    return { ok: false, error: message };
  }
}

export async function editIncome(
  input: unknown,
): Promise<ActionResult<SerializedIncome>> {
  try {
    const userId = await requireUserId();
    const parsed = incomeEditFormSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Validation failed" };
    }
    const d = parsed.data;
    const { id, ...fields } = d;
    const existing = await prisma.income.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) {
      return { ok: false, error: "Income not found" };
    }
    const row = await prisma.income.update({
      where: { id },
      data: {
        source: fields.source,
        type: fields.type as IncomeType,
        amount: fields.amount,
        date: fields.date,
        currency: fields.currency,
        isRecurring: fields.isRecurring,
        recurrenceFrequency: fields.isRecurring
          ? (fields.recurrenceFrequency as RecurrenceFrequency)
          : null,
        payee: fields.payee || null,
        note: fields.note || null,
      },
      select: {
        id: true,
        userId: true,
        source: true,
        type: true,
        amount: true,
        date: true,
        currency: true,
        isRecurring: true,
        recurrenceFrequency: true,
        payee: true,
        note: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    revalidatePath("/incomes");
    return { ok: true, data: serializeIncome(row) };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update";
    return { ok: false, error: message };
  }
}

export async function deleteIncome(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const existing = await prisma.income.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) {
      return { ok: false, error: "Income not found" };
    }
    await prisma.income.delete({ where: { id } });
    revalidatePath("/incomes");
    return { ok: true, data: { id } };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete";
    return { ok: false, error: message };
  }
}

function shiftIncomeDateToMonth(date: Date, targetYear: number, targetMonth1: number): Date {
  const lastDay = new Date(targetYear, targetMonth1, 0).getDate();
  const day = Math.min(date.getDate(), lastDay);
  return new Date(targetYear, targetMonth1 - 1, day, 12, 0, 0, 0);
}

export async function duplicateIncomes(
  ids: string[],
  targetMonthIso: string,
): Promise<ActionResult<{ count: number }>> {
  try {
    const userId = await requireUserId();
    if (!ids.length) {
      return { ok: false, error: "No incomes selected" };
    }
    const m = z.string().regex(/^\d{4}-\d{2}$/).safeParse(targetMonthIso);
    if (!m.success) {
      return { ok: false, error: "Invalid month" };
    }
    const [ys, ms] = targetMonthIso.split("-");
    const targetYear = Number(ys);
    const targetMonth = Number(ms);
    const originals = await prisma.income.findMany({
      where: { userId, id: { in: ids } },
      select: {
        userId: true,
        source: true,
        type: true,
        amount: true,
        date: true,
        currency: true,
        isRecurring: true,
        recurrenceFrequency: true,
        payee: true,
        note: true,
      },
    });
    if (!originals.length) {
      return { ok: false, error: "Nothing to duplicate" };
    }
    const data = originals.map((row) => ({
      userId: row.userId,
      source: row.source,
      type: row.type,
      amount: row.amount,
      date: shiftIncomeDateToMonth(row.date, targetYear, targetMonth),
      currency: row.currency,
      isRecurring: row.isRecurring,
      recurrenceFrequency: row.recurrenceFrequency,
      payee: row.payee,
      note: row.note,
    }));
    const result = await prisma.income.createMany({ data });
    revalidatePath("/incomes");
    return { ok: true, data: { count: result.count } };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Duplicate failed";
    return { ok: false, error: message };
  }
}
