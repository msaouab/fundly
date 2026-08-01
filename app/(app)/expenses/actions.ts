"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { shiftDateToLocalMonth } from "@/lib/date";
import {
  actionFail,
  actionOk,
  parseActionInput,
  requireUserId,
  revalidateFinancePages,
  runAction,
  type ActionResult,
} from "@/lib/server/actions";
import type { ExpenseCategory, ExpenseKind, RecurrenceFrequency } from "@/generated/prisma/enums";
import type { SerializedExpense } from "./types";
import { expenseAddFormSchema, expenseEditFormSchema } from "./schema";

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
  payee: boolean;
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
  return runAction(async () => {
    const userId = await requireUserId();
    const parsed = parseActionInput(expenseAddFormSchema, input);
    if (!parsed.ok) return parsed.result;
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
        payee: d.payee,
        note: null,
      },
      select: expenseSelect,
    });
    revalidateFinancePages();
    return actionOk(serializeExpense(row));
  }, "Failed to add expense");
}

export async function editExpense(
  input: unknown,
): Promise<ActionResult<SerializedExpense>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const parsed = parseActionInput(expenseEditFormSchema, input, { fieldErrors: false });
    if (!parsed.ok) return parsed.result;
    const d = parsed.data;
    const { id, ...fields } = d;
    const existing = await prisma.expense.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) {
      return actionFail("Expense not found");
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
        payee: fields.payee,
        note: fields.note || null,
      },
      select: expenseSelect,
    });
    revalidateFinancePages();
    return actionOk(serializeExpense(row));
  }, "Failed to update");
}

export async function deleteExpense(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const existing = await prisma.expense.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) {
      return actionFail("Expense not found");
    }
    await prisma.expense.delete({ where: { id } });
    revalidateFinancePages();
    return actionOk({ id });
  }, "Failed to delete");
}

export async function deleteExpenses(ids: string[]): Promise<ActionResult<{ count: number }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    if (!ids.length) {
      return actionFail("No expenses selected");
    }
    const result = await prisma.expense.deleteMany({
      where: { userId, id: { in: ids } },
    });
    revalidateFinancePages();
    return actionOk({ count: result.count });
  }, "Failed to delete");
}

export async function duplicateExpenses(
  ids: string[],
  targetMonthIso: string,
): Promise<ActionResult<{ count: number }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    if (!ids.length) {
      return actionFail("No expenses selected");
    }
    const m = z.string().regex(/^\d{4}-\d{2}$/).safeParse(targetMonthIso);
    if (!m.success) {
      return actionFail("Invalid month");
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
        note: true,
      },
    });
    if (!originals.length) {
      return actionFail("Nothing to duplicate");
    }
    const data = originals.map((row) => ({
      userId: row.userId,
      description: row.description,
      kind: row.kind,
      category: row.category,
      amount: row.amount,
      date: shiftDateToLocalMonth(row.date, targetYear, targetMonth),
      currency: row.currency,
      isRecurring: row.isRecurring,
      recurrenceFrequency: row.recurrenceFrequency,
      // Paid is month-specific — start unpaid in the target month.
      payee: false,
      note: row.note,
    }));
    const result = await prisma.expense.createMany({ data });
    revalidateFinancePages();
    return actionOk({ count: result.count });
  }, "Duplicate failed");
}
