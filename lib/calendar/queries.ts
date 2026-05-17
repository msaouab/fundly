import { prisma } from "@/lib/prisma";
import { computeCashflow } from "@/lib/cashflow";
import { getCountry } from "@/lib/countries";
import { monthRangeLocal, formatMonthKey } from "@/lib/month";
import { upsertHolidaysForCountry } from "@/lib/holidays/upsert";
import { buildAnalytics, toSerializedEvent, type EventRaw } from "./analytics";
import { yearlyEventDateKey } from "./yearly";
import type {
  CalendarDayCell,
  CalendarPageData,
  SerializedHoliday,
  SerializedPlannedEvent,
  SerializedYearlyEvent,
} from "./types";

function atNoon(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function avgMonthlySavings(userId: string, months = 6): Promise<number> {
  const now = new Date();
  let totalSavings = 0;
  let count = 0;
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const { start, end } = monthRangeLocal(d.getFullYear(), d.getMonth() + 1);
    const [incomeAgg, expenseAgg] = await Promise.all([
      prisma.income.aggregate({
        where: { userId, date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { userId, date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
    ]);
    const income = Number(incomeAgg._sum.amount ?? 0);
    const expense = Number(expenseAgg._sum.amount ?? 0);
    totalSavings += computeCashflow(income, expense).savings;
    count += 1;
  }
  return count > 0 ? totalSavings / count : 0;
}

function serializeYearlyForMonth(
  rows: {
    id: string;
    title: string;
    kind: SerializedYearlyEvent["kind"];
    relation: SerializedYearlyEvent["relation"];
    month: number;
    day: number;
    birthYear: number | null;
    giftBudget: { toNumber?: () => number } | number | null;
    currency: string;
    notes: string | null;
  }[],
  viewYear: number,
  viewMonth: number,
): SerializedYearlyEvent[] {
  return rows
    .filter((r) => r.month === viewMonth)
    .map((r) => {
      const occurrenceDate = yearlyEventDateKey(viewYear, r.month, r.day);
      const giftBudget =
        r.giftBudget == null
          ? null
          : typeof r.giftBudget === "number"
            ? r.giftBudget
            : Number(r.giftBudget);
      const ageTurning =
        r.birthYear != null && r.kind === "BIRTHDAY" ? viewYear - r.birthYear : null;
      return {
        id: r.id,
        title: r.title,
        kind: r.kind,
        relation: r.relation,
        month: r.month,
        day: r.day,
        giftBudget,
        currency: r.currency,
        notes: r.notes,
        birthYear: r.birthYear,
        occurrenceDate,
        ageTurning,
      };
    })
    .sort((a, b) => a.day - b.day);
}

function buildMonthGrid(
  year: number,
  month: number,
  holidays: SerializedHoliday[],
  events: SerializedPlannedEvent[],
  yearlyEvents: SerializedYearlyEvent[],
): CalendarDayCell[] {
  const { start } = monthRangeLocal(year, month);
  const startDow = start.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayKey = dateKey(new Date());

  const holidayByDate = new Map<string, SerializedHoliday[]>();
  for (const h of holidays) {
    const key = h.date.slice(0, 10);
    const list = holidayByDate.get(key) ?? [];
    list.push(h);
    holidayByDate.set(key, list);
  }

  const yearlyByDate = new Map<string, SerializedYearlyEvent[]>();
  for (const y of yearlyEvents) {
    const key = y.occurrenceDate.slice(0, 10);
    const list = yearlyByDate.get(key) ?? [];
    list.push(y);
    yearlyByDate.set(key, list);
  }

  const eventsByDate = new Map<string, typeof events>();
  for (const e of events) {
    const startE = new Date(e.startDate);
    const endE = e.endDate ? new Date(e.endDate) : startE;
    const cur = new Date(startE.getFullYear(), startE.getMonth(), startE.getDate());
    const end = new Date(endE.getFullYear(), endE.getMonth(), endE.getDate());
    while (cur <= end) {
      const key = dateKey(cur);
      const list = eventsByDate.get(key) ?? [];
      list.push(e);
      eventsByDate.set(key, list);
      cur.setDate(cur.getDate() + 1);
    }
  }

  const cells: CalendarDayCell[] = [];
  const prevMonthDays = new Date(year, month - 1, 0).getDate();

  for (let i = 0; i < startDow; i++) {
    const day = prevMonthDays - startDow + i + 1;
    const d = atNoon(year, month - 1, day);
    const key = dateKey(d);
    cells.push({
      date: key,
      day,
      inMonth: false,
      isToday: key === todayKey,
      holidays: holidayByDate.get(key) ?? [],
      events: eventsByDate.get(key) ?? [],
      yearlyEvents: yearlyByDate.get(key) ?? [],
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = atNoon(year, month, day);
    const key = dateKey(d);
    cells.push({
      date: key,
      day,
      inMonth: true,
      isToday: key === todayKey,
      holidays: holidayByDate.get(key) ?? [],
      events: eventsByDate.get(key) ?? [],
      yearlyEvents: yearlyByDate.get(key) ?? [],
    });
  }

  const trailing = (7 - (cells.length % 7)) % 7;
  for (let day = 1; day <= trailing; day++) {
    const d = atNoon(year, month + 1, day);
    const key = dateKey(d);
    cells.push({
      date: key,
      day,
      inMonth: false,
      isToday: key === todayKey,
      holidays: holidayByDate.get(key) ?? [],
      events: eventsByDate.get(key) ?? [],
      yearlyEvents: yearlyByDate.get(key) ?? [],
    });
  }

  return cells;
}

export async function fetchCalendarPageData(
  userId: string,
  year: number,
  month: number,
): Promise<CalendarPageData> {
  const { start: monthStart, end: monthEnd } = monthRangeLocal(year, month);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { countryCode: true, currency: true },
  });
  const countryCode = user?.countryCode ?? "MA";
  const currency = user?.currency ?? "MAD";
  const country = getCountry(countryCode);

  const rangeStart = new Date(year, month - 3, 1);
  const rangeEnd = new Date(year, month + 2, 0, 23, 59, 59, 999);

  const holidayCount = await prisma.holiday.count({ where: { countryCode } });
  if (holidayCount === 0) {
    await upsertHolidaysForCountry(countryCode);
  }

  const [holidayRows, eventRows, yearlyRows, avgSave] = await Promise.all([
    prisma.holiday.findMany({
      where: {
        countryCode,
        date: { gte: rangeStart, lte: rangeEnd },
      },
      orderBy: { date: "asc" },
    }),
    prisma.plannedEvent.findMany({
      where: { userId },
      include: {
        expenses: { select: { amount: true } },
      },
      orderBy: { startDate: "asc" },
    }),
    prisma.yearlyEvent.findMany({
      where: { userId },
      orderBy: [{ month: "asc" }, { day: "asc" }, { title: "asc" }],
    }),
    avgMonthlySavings(userId),
  ]);

  const holidays: SerializedHoliday[] = holidayRows.map((h) => ({
    id: h.id,
    name: h.name,
    date: h.date.toISOString(),
    type: h.type,
    slug: h.slug,
  }));

  const eventRaws: EventRaw[] = await Promise.all(
    eventRows.map(async (e) => {
      const start = e.startDate;
      const end = e.endDate ?? e.startDate;
      const linkedSpend = e.expenses.reduce((s, x) => s + Number(x.amount), 0);

      const windowAgg = await prisma.expense.aggregate({
        where: {
          userId,
          date: { gte: start, lte: end },
        },
        _sum: { amount: true },
      });

      return {
        id: e.id,
        title: e.title,
        description: e.description,
        category: e.category,
        status: e.status,
        startDate: start,
        endDate: e.endDate,
        budgetAmount: Number(e.budgetAmount),
        reservedAmount: Number(e.reservedAmount),
        currency: e.currency,
        sourceHolidayId: e.sourceHolidayId,
        goalId: e.goalId,
        completedAt: e.completedAt,
        linkedSpend,
        windowSpend: Number(windowAgg._sum.amount ?? 0),
      };
    }),
  );

  const serializedEvents = eventRaws.map((e) => toSerializedEvent(e, avgSave));
  const analytics = buildAnalytics(serializedEvents, currency, avgSave);

  const allYearly = yearlyRows.map((r) => ({
    id: r.id,
    title: r.title,
    kind: r.kind,
    relation: r.relation,
    month: r.month,
    day: r.day,
    birthYear: r.birthYear,
    giftBudget: r.giftBudget,
    currency: r.currency,
    notes: r.notes,
  }));
  const monthYearlyEvents = serializeYearlyForMonth(allYearly, year, month);
  const days = buildMonthGrid(year, month, holidays, serializedEvents, monthYearlyEvents);

  const monthHolidays = holidays.filter((h) => {
    const d = new Date(h.date);
    return d >= monthStart && d <= monthEnd;
  });

  return {
    countryCode,
    countryName: country.name,
    currency,
    year,
    month,
    monthKey: formatMonthKey(year, month),
    days,
    analytics,
    holidays: monthHolidays,
    yearlyEvents: allYearly.map((r) => {
      const occurrenceDate = yearlyEventDateKey(year, r.month, r.day);
      const giftBudget = r.giftBudget == null ? null : Number(r.giftBudget);
      const ageTurning =
        r.birthYear != null && r.kind === "BIRTHDAY" ? year - r.birthYear : null;
      return {
        id: r.id,
        title: r.title,
        kind: r.kind,
        relation: r.relation,
        month: r.month,
        day: r.day,
        giftBudget,
        currency: r.currency,
        notes: r.notes,
        birthYear: r.birthYear,
        occurrenceDate,
        ageTurning,
      };
    }),
    monthYearlyEvents,
  };
}

export async function fetchPlannedEventById(userId: string, eventId: string) {
  const e = await prisma.plannedEvent.findFirst({
    where: { id: eventId, userId },
    include: { expenses: { select: { amount: true, date: true, description: true } } },
  });
  if (!e) return null;
  const avgSave = await avgMonthlySavings(userId);
  const start = e.startDate;
  const end = e.endDate ?? e.startDate;
  const linkedSpend = e.expenses.reduce((s, x) => s + Number(x.amount), 0);
  const windowAgg = await prisma.expense.aggregate({
    where: { userId, date: { gte: start, lte: end } },
    _sum: { amount: true },
  });
  const raw: EventRaw = {
    id: e.id,
    title: e.title,
    description: e.description,
    category: e.category,
    status: e.status,
    startDate: start,
    endDate: e.endDate,
    budgetAmount: Number(e.budgetAmount),
    reservedAmount: Number(e.reservedAmount),
    currency: e.currency,
    sourceHolidayId: e.sourceHolidayId,
    goalId: e.goalId,
    completedAt: e.completedAt,
    linkedSpend,
    windowSpend: Number(windowAgg._sum.amount ?? 0),
  };
  return toSerializedEvent(raw, avgSave);
}
