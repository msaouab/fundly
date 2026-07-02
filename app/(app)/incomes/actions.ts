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
import type { IncomeType, RecurrenceFrequency } from "@/generated/prisma/enums";
import type { SerializedIncome } from "./types";
import { incomeAddFormSchema, incomeEditFormSchema } from "./schema";

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
  payee: boolean;
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

const incomeSelect = {
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
} as const;

export async function addIncome(
  input: unknown,
): Promise<ActionResult<SerializedIncome>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const parsed = parseActionInput(incomeAddFormSchema, input);
    if (!parsed.ok) return parsed.result;
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
        payee: d.payee,
        note: null,
      },
      select: incomeSelect,
    });
    revalidateFinancePages();
    return actionOk(serializeIncome(row));
  }, "Failed to add income");
}

export async function editIncome(
  input: unknown,
): Promise<ActionResult<SerializedIncome>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const parsed = parseActionInput(incomeEditFormSchema, input, { fieldErrors: false });
    if (!parsed.ok) return parsed.result;
    const d = parsed.data;
    const { id, ...fields } = d;
    const existing = await prisma.income.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) {
      return actionFail("Income not found");
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
        payee: fields.payee,
        note: fields.note || null,
      },
      select: incomeSelect,
    });
    revalidateFinancePages();
    return actionOk(serializeIncome(row));
  }, "Failed to update");
}

export async function deleteIncome(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const existing = await prisma.income.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) {
      return actionFail("Income not found");
    }
    await prisma.income.delete({ where: { id } });
    revalidateFinancePages();
    return actionOk({ id });
  }, "Failed to delete");
}

export async function duplicateIncomes(
  ids: string[],
  targetMonthIso: string,
): Promise<ActionResult<{ count: number }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    if (!ids.length) {
      return actionFail("No incomes selected");
    }
    const m = z.string().regex(/^\d{4}-\d{2}$/).safeParse(targetMonthIso);
    if (!m.success) {
      return actionFail("Invalid month");
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
      return actionFail("Nothing to duplicate");
    }
    const data = originals.map((row) => ({
      userId: row.userId,
      source: row.source,
      type: row.type,
      amount: row.amount,
      date: shiftDateToLocalMonth(row.date, targetYear, targetMonth),
      currency: row.currency,
      isRecurring: row.isRecurring,
      recurrenceFrequency: row.recurrenceFrequency,
      payee: row.payee,
      note: row.note,
    }));
    const result = await prisma.income.createMany({ data });
    revalidateFinancePages();
    return actionOk({ count: result.count });
  }, "Duplicate failed");
}
