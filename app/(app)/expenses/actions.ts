"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ExpenseCategory, ExpenseKind, RecurrenceFrequency } from "@/generated/prisma/enums";
import type { SerializedExpense } from "./types";
import { expenseEditFormSchema, expenseFormSchema } from "./schema";

function serializeExpense(row: {
  id: string;
  userId: string;
  description: string;
  kind: ExpenseKind;
  category: ExpenseCategory;
  amount: { toString(): string };
  date: Date;
  currency: string;
  isRecurring: boolean;
  recurrenceFrequency: RecurrenceFrequency | null;
  payee: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SerializedExpense {
  return {
    id: row.id,
    userId: row.userId,
    description: row.description,
    kind: row.kind,
    category: row.category,
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

const expenseSelect = {
  id: true,
  userId: true,
  description: true,
  kind: true,
  category: true,
  amount: true,
  date: true,
  currency: true,
  isRecurring: true,
  recurrenceFrequency: true,
  payee: true,
  note: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function addExpense(
  input: unknown,
): Promise<ActionResult<SerializedExpense>> {
  try {
    const userId = await requireUserId();
    const parsed = expenseFormSchema.safeParse(input);
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
    const row = await prisma.expense.create({
      data: {
        userId,
        description: d.description || "",
        kind: d.kind as ExpenseKind,
        category: d.category as ExpenseCategory,
        amount: d.amount,
        date: d.date,
        currency: d.currency,
        isRecurring: d.kind === "FIXED" ? d.isRecurring : false,
        recurrenceFrequency:
          d.kind === "FIXED" && d.isRecurring
            ? (d.recurrenceFrequency as RecurrenceFrequency)
            : null,
        payee: d.payee || null,
        note: d.note || null,
      },
      select: expenseSelect,
    });
    revalidatePath("/expenses");
    revalidatePath("/incomes");
    return { ok: true, data: serializeExpense(row) };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to add expense";
    return { ok: false, error: message };
  }
}

export async function editExpense(
  input: unknown,
): Promise<ActionResult<SerializedExpense>> {
  try {
    const userId = await requireUserId();
    const parsed = expenseEditFormSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Validation failed" };
    }
    const d = parsed.data;
    const { id, ...fields } = d;
    const existing = await prisma.expense.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) {
      return { ok: false, error: "Expense not found" };
    }
    const row = await prisma.expense.update({
      where: { id },
      data: {
        description: fields.description || "",
        kind: fields.kind as ExpenseKind,
        category: fields.category as ExpenseCategory,
        amount: fields.amount,
        date: fields.date,
        currency: fields.currency,
        isRecurring: fields.kind === "FIXED" ? fields.isRecurring : false,
        recurrenceFrequency:
          fields.kind === "FIXED" && fields.isRecurring
            ? (fields.recurrenceFrequency as RecurrenceFrequency)
            : null,
        payee: fields.payee || null,
        note: fields.note || null,
      },
      select: expenseSelect,
    });
    revalidatePath("/expenses");
    revalidatePath("/incomes");
    return { ok: true, data: serializeExpense(row) };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update";
    return { ok: false, error: message };
  }
}

export async function deleteExpense(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const existing = await prisma.expense.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) {
      return { ok: false, error: "Expense not found" };
    }
    await prisma.expense.delete({ where: { id } });
    revalidatePath("/expenses");
    revalidatePath("/incomes");
    return { ok: true, data: { id } };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete";
    return { ok: false, error: message };
  }
}

export async function deleteExpenses(ids: string[]): Promise<ActionResult<{ count: number }>> {
  try {
    const userId = await requireUserId();
    if (!ids.length) {
      return { ok: false, error: "No expenses selected" };
    }
    const result = await prisma.expense.deleteMany({
      where: { userId, id: { in: ids } },
    });
    revalidatePath("/expenses");
    revalidatePath("/incomes");
    return { ok: true, data: { count: result.count } };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete";
    return { ok: false, error: message };
  }
}

function shiftExpenseDateToMonth(date: Date, targetYear: number, targetMonth1: number): Date {
  const lastDay = new Date(targetYear, targetMonth1, 0).getDate();
  const day = Math.min(date.getDate(), lastDay);
  return new Date(targetYear, targetMonth1 - 1, day, 12, 0, 0, 0);
}

export async function duplicateExpenses(
  ids: string[],
  targetMonthIso: string,
): Promise<ActionResult<{ count: number }>> {
  try {
    const userId = await requireUserId();
    if (!ids.length) {
      return { ok: false, error: "No expenses selected" };
    }
    const m = z.string().regex(/^\d{4}-\d{2}$/).safeParse(targetMonthIso);
    if (!m.success) {
      return { ok: false, error: "Invalid month" };
    }
    const [ys, ms] = targetMonthIso.split("-");
    const targetYear = Number(ys);
    const targetMonth = Number(ms);
    const originals = await prisma.expense.findMany({
      where: { userId, id: { in: ids } },
      select: {
        userId: true,
        description: true,
        kind: true,
        category: true,
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
      description: row.description,
      kind: row.kind,
      category: row.category,
      amount: row.amount,
      date: shiftExpenseDateToMonth(row.date, targetYear, targetMonth),
      currency: row.currency,
      isRecurring: row.isRecurring,
      recurrenceFrequency: row.recurrenceFrequency,
      payee: row.payee,
      note: row.note,
    }));
    const result = await prisma.expense.createMany({ data });
    revalidatePath("/expenses");
    revalidatePath("/incomes");
    return { ok: true, data: { count: result.count } };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Duplicate failed";
    return { ok: false, error: message };
  }
}
