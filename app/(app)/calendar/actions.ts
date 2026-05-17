"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { getCountry } from "@/lib/countries";
import { prisma } from "@/lib/prisma";
import type {
  PlannedEventCategory,
  PlannedEventStatus,
  YearlyEventKind,
  YearlyEventRelation,
} from "@/generated/prisma/enums";

async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Unauthorized");
  return id;
}

function revalidateCalendar() {
  revalidatePath("/calendar");
  revalidatePath("/settings");
  revalidatePath("/");
}

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const countrySchema = z.object({
  countryCode: z.string().length(2),
});

export async function updateCountryAction(countryCode: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = countrySchema.safeParse({ countryCode: countryCode.toUpperCase() });
  if (!parsed.success) return { ok: false, error: "Invalid country." };

  const country = getCountry(parsed.data.countryCode);
  await prisma.user.update({
    where: { id: userId },
    data: {
      countryCode: country.code,
      currency: country.defaultCurrency,
    },
  });
  revalidateCalendar();
  return { ok: true };
}

const eventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional().nullable(),
  category: z.enum([
    "HOLIDAY",
    "TRAVEL",
    "FAMILY",
    "WEDDING",
    "EDUCATION",
    "SHOPPING",
    "OTHER",
  ]),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  budgetAmount: z.coerce.number().positive(),
  reservedAmount: z.coerce.number().min(0),
  currency: z.string().min(3).max(8).default("MAD"),
  sourceHolidayId: z.string().cuid().optional().nullable(),
  goalId: z.string().cuid().optional().nullable(),
});

export async function createPlannedEvent(form: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = eventSchema.safeParse(form);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid event data.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((i) => [i.path.join("."), i.message]),
      ),
    };
  }

  const d = parsed.data;
  let end = d.endDate ?? null;
  if (end && end < d.startDate) end = d.startDate;

  try {
    const row = await prisma.plannedEvent.create({
      data: {
        userId,
        title: d.title.trim(),
        description: d.description?.trim() || null,
        category: d.category as PlannedEventCategory,
        status: "PLANNING",
        startDate: d.startDate,
        endDate: end,
        budgetAmount: d.budgetAmount,
        reservedAmount: d.reservedAmount ?? 0,
        currency: d.currency,
        sourceHolidayId: d.sourceHolidayId ?? null,
        goalId: d.goalId ?? null,
      },
      select: { id: true },
    });
    revalidateCalendar();
    return { ok: true, id: row.id };
  } catch {
    return { ok: false, error: "Could not create event." };
  }
}

export async function updatePlannedEvent(
  eventId: string,
  form: unknown,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = eventSchema.safeParse(form);
  if (!parsed.success) {
    return { ok: false, error: "Invalid event data." };
  }

  const existing = await prisma.plannedEvent.findFirst({
    where: { id: eventId, userId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Event not found." };

  const d = parsed.data;
  let end = d.endDate ?? null;
  if (end && end < d.startDate) end = d.startDate;

  await prisma.plannedEvent.update({
    where: { id: eventId },
    data: {
      title: d.title.trim(),
      description: d.description?.trim() || null,
      category: d.category as PlannedEventCategory,
      startDate: d.startDate,
      endDate: end,
      budgetAmount: d.budgetAmount,
      reservedAmount: d.reservedAmount ?? 0,
      currency: d.currency,
    },
  });
  revalidateCalendar();
  return { ok: true, id: eventId };
}

export async function updateEventStatus(
  eventId: string,
  status: PlannedEventStatus,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const existing = await prisma.plannedEvent.findFirst({
    where: { id: eventId, userId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Event not found." };

  await prisma.plannedEvent.update({
    where: { id: eventId },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });
  revalidateCalendar();
  return { ok: true, id: eventId };
}

export async function deletePlannedEvent(eventId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const existing = await prisma.plannedEvent.findFirst({
    where: { id: eventId, userId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Event not found." };

  await prisma.plannedEvent.delete({ where: { id: eventId } });
  revalidateCalendar();
  return { ok: true };
}

const yearlyEventSchema = z.object({
  title: z.string().min(1).max(120),
  kind: z.enum(["BIRTHDAY", "ANNIVERSARY", "OTHER"]),
  relation: z.enum(["SELF", "SPOUSE", "CHILD", "PARENT", "SIBLING", "FRIEND", "OTHER"]),
  month: z.coerce.number().int().min(1).max(12),
  day: z.coerce.number().int().min(1).max(31),
  birthYear: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  giftBudget: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().min(3).max(8).default("MAD"),
  notes: z.string().max(500).optional().nullable(),
});

function validateMonthDay(month: number, day: number): string | null {
  const max = new Date(2024, month, 0).getDate();
  if (day > max) return `Day ${day} is invalid for month ${month}.`;
  return null;
}

export async function createYearlyEvent(form: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = yearlyEventSchema.safeParse(form);
  if (!parsed.success) {
    return { ok: false, error: "Invalid yearly event." };
  }
  const d = parsed.data;
  const dayErr = validateMonthDay(d.month, d.day);
  if (dayErr) return { ok: false, error: dayErr };

  const row = await prisma.yearlyEvent.create({
    data: {
      userId,
      title: d.title.trim(),
      kind: d.kind as YearlyEventKind,
      relation: d.relation as YearlyEventRelation,
      month: d.month,
      day: d.day,
      birthYear: d.birthYear ?? null,
      giftBudget: d.giftBudget ?? null,
      currency: d.currency,
      notes: d.notes?.trim() || null,
    },
    select: { id: true },
  });
  revalidateCalendar();
  return { ok: true, id: row.id };
}

export async function updateYearlyEvent(eventId: string, form: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = yearlyEventSchema.safeParse(form);
  if (!parsed.success) return { ok: false, error: "Invalid yearly event." };

  const existing = await prisma.yearlyEvent.findFirst({
    where: { id: eventId, userId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Yearly event not found." };

  const d = parsed.data;
  const dayErr = validateMonthDay(d.month, d.day);
  if (dayErr) return { ok: false, error: dayErr };

  await prisma.yearlyEvent.update({
    where: { id: eventId },
    data: {
      title: d.title.trim(),
      kind: d.kind as YearlyEventKind,
      relation: d.relation as YearlyEventRelation,
      month: d.month,
      day: d.day,
      birthYear: d.birthYear ?? null,
      giftBudget: d.giftBudget ?? null,
      currency: d.currency,
      notes: d.notes?.trim() || null,
    },
  });
  revalidateCalendar();
  return { ok: true, id: eventId };
}

export async function deleteYearlyEvent(eventId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const existing = await prisma.yearlyEvent.findFirst({
    where: { id: eventId, userId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Yearly event not found." };

  await prisma.yearlyEvent.delete({ where: { id: eventId } });
  revalidateCalendar();
  return { ok: true };
}

export async function seedHolidaysForCountry(countryCode: string): Promise<ActionResult> {
  await requireUserId();
  const { upsertHolidaysForCountry } = await import("@/lib/holidays/upsert");
  await upsertHolidaysForCountry(countryCode.toUpperCase());
  revalidateCalendar();
  return { ok: true };
}
