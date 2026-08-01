"use server";

import { prisma } from "@/lib/prisma";
import {
  actionFail,
  actionOk,
  parseActionInput,
  requireUserId,
  revalidateFinancePages,
  runAction,
  type ActionResult,
} from "@/lib/server/actions";
import { revalidatePath } from "next/cache";
import type { ExpenseCategory, IncomeType, RecurrenceFrequency } from "@/generated/prisma/enums";
import { normalizeDateToLocalNoon } from "@/lib/date";
import {
  recurringExpenseEditSchema,
  recurringExpenseFormSchema,
  recurringIncomeEditSchema,
  recurringIncomeFormSchema,
  recurringPaidSchema,
  toOccurrenceCount,
} from "./schema";

function revalidateRecurring() {
  revalidateFinancePages();
  revalidatePath("/settings/fixed");
}

export async function createRecurringExpense(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const parsed = parseActionInput(recurringExpenseFormSchema, input);
    if (!parsed.ok) return parsed.result;
    const d = parsed.data;
    const row = await prisma.recurringExpense.create({
      data: {
        userId,
        description: d.description || "",
        category: d.category as ExpenseCategory,
        amount: d.amount,
        currency: d.currency,
        recurrenceFrequency: d.recurrenceFrequency as RecurrenceFrequency,
        occurrenceCount: toOccurrenceCount(d.endsMode, d.occurrenceCount),
        startsAt: normalizeDateToLocalNoon(d.startsAt),
      },
      select: { id: true },
    });
    revalidateRecurring();
    return actionOk({ id: row.id });
  }, "Failed to add recurring expense");
}

export async function updateRecurringExpense(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const parsed = parseActionInput(recurringExpenseEditSchema, input, { fieldErrors: false });
    if (!parsed.ok) return parsed.result;
    const d = parsed.data;
    const existing = await prisma.recurringExpense.findFirst({
      where: { id: d.id, userId },
      select: { id: true },
    });
    if (!existing) return actionFail("Recurring expense not found");
    await prisma.recurringExpense.update({
      where: { id: d.id },
      data: {
        description: d.description || "",
        category: d.category as ExpenseCategory,
        amount: d.amount,
        currency: d.currency,
        recurrenceFrequency: d.recurrenceFrequency as RecurrenceFrequency,
        occurrenceCount: toOccurrenceCount(d.endsMode, d.occurrenceCount),
        startsAt: normalizeDateToLocalNoon(d.startsAt),
      },
    });
    revalidateRecurring();
    return actionOk({ id: d.id });
  }, "Failed to update recurring expense");
}

export async function deleteRecurringExpense(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const existing = await prisma.recurringExpense.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) return actionFail("Recurring expense not found");
    await prisma.recurringExpense.delete({ where: { id } });
    revalidateRecurring();
    return actionOk({ id });
  }, "Failed to delete recurring expense");
}

export async function createRecurringIncome(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const parsed = parseActionInput(recurringIncomeFormSchema, input);
    if (!parsed.ok) return parsed.result;
    const d = parsed.data;
    const row = await prisma.recurringIncome.create({
      data: {
        userId,
        source: d.source,
        type: d.type as IncomeType,
        amount: d.amount,
        currency: d.currency,
        recurrenceFrequency: d.recurrenceFrequency as RecurrenceFrequency,
        occurrenceCount: toOccurrenceCount(d.endsMode, d.occurrenceCount),
        startsAt: normalizeDateToLocalNoon(d.startsAt),
      },
      select: { id: true },
    });
    revalidateRecurring();
    return actionOk({ id: row.id });
  }, "Failed to add recurring income");
}

export async function updateRecurringIncome(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const parsed = parseActionInput(recurringIncomeEditSchema, input, { fieldErrors: false });
    if (!parsed.ok) return parsed.result;
    const d = parsed.data;
    const existing = await prisma.recurringIncome.findFirst({
      where: { id: d.id, userId },
      select: { id: true },
    });
    if (!existing) return actionFail("Recurring income not found");
    await prisma.recurringIncome.update({
      where: { id: d.id },
      data: {
        source: d.source,
        type: d.type as IncomeType,
        amount: d.amount,
        currency: d.currency,
        recurrenceFrequency: d.recurrenceFrequency as RecurrenceFrequency,
        occurrenceCount: toOccurrenceCount(d.endsMode, d.occurrenceCount),
        startsAt: normalizeDateToLocalNoon(d.startsAt),
      },
    });
    revalidateRecurring();
    return actionOk({ id: d.id });
  }, "Failed to update recurring income");
}

export async function deleteRecurringIncome(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const existing = await prisma.recurringIncome.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) return actionFail("Recurring income not found");
    await prisma.recurringIncome.delete({ where: { id } });
    revalidateRecurring();
    return actionOk({ id });
  }, "Failed to delete recurring income");
}

export async function setRecurringExpensePaid(
  input: unknown,
): Promise<ActionResult<{ payee: boolean }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const parsed = parseActionInput(recurringPaidSchema, input, { fieldErrors: false });
    if (!parsed.ok) return parsed.result;
    const d = parsed.data;
    const template = await prisma.recurringExpense.findFirst({
      where: { id: d.templateId, userId },
      select: { id: true },
    });
    if (!template) return actionFail("Recurring expense not found");
    await prisma.recurringExpenseMonth.upsert({
      where: {
        recurringExpenseId_year_month: {
          recurringExpenseId: d.templateId,
          year: d.year,
          month: d.month,
        },
      },
      create: {
        recurringExpenseId: d.templateId,
        year: d.year,
        month: d.month,
        payee: d.payee,
      },
      update: { payee: d.payee },
    });
    revalidateRecurring();
    return actionOk({ payee: d.payee });
  }, "Failed to update paid status");
}

export async function setRecurringIncomePaid(
  input: unknown,
): Promise<ActionResult<{ payee: boolean }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const parsed = parseActionInput(recurringPaidSchema, input, { fieldErrors: false });
    if (!parsed.ok) return parsed.result;
    const d = parsed.data;
    const template = await prisma.recurringIncome.findFirst({
      where: { id: d.templateId, userId },
      select: { id: true },
    });
    if (!template) return actionFail("Recurring income not found");
    await prisma.recurringIncomeMonth.upsert({
      where: {
        recurringIncomeId_year_month: {
          recurringIncomeId: d.templateId,
          year: d.year,
          month: d.month,
        },
      },
      create: {
        recurringIncomeId: d.templateId,
        year: d.year,
        month: d.month,
        payee: d.payee,
      },
      update: { payee: d.payee },
    });
    revalidateRecurring();
    return actionOk({ payee: d.payee });
  }, "Failed to update paid status");
}
