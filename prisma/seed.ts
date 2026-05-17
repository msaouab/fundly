/**
 * Demo dataset for local / staging testing.
 *
 * Run:  npm run db:seed
 * Login: demo@fundly.test / DemoFundly2026!
 */
import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import type {
  ExpenseCategory,
  ExpenseKind,
  GoalType,
  IncomeType,
} from "../generated/prisma/enums";
import { HOLIDAY_SEED } from "../lib/holidays/seed-data";
import { upsertHolidaysForCountry } from "../lib/holidays/upsert";
import { normalizePgConnectionString } from "../lib/pg-connection-string";

const DEMO_EMAIL = "demo@fundly.test";
const DEMO_PASSWORD = "DemoFundly2026!";
const DEMO_NAME = "Youssef Benali (Demo)";
const COUNTRY = "MA";
const CURRENCY = "MAD";

/** How many calendar months of history (includes current month). */
const MONTHS_OF_HISTORY = 14;

type MonthBuildContext = {
  monthIndex: number;
  totalMonths: number;
  isNegativeSavingsMonth: boolean;
  isRecentMonth: boolean;
  isEidFitrMonth: boolean;
};

function createPrisma(): PrismaClient {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set. Add it to .env before seeding.");
  }
  const adapter = new PrismaPg({
    connectionString: normalizePgConnectionString(raw),
  });
  return new PrismaClient({ adapter });
}

function atNoon(year: number, month: number, day: number): Date {
  const last = new Date(year, month, 0).getDate();
  const d = Math.min(day, last);
  return new Date(year, month - 1, d, 12, 0, 0, 0);
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function parseHolidayDate(iso: string): { year: number; month: number; day: number } {
  const [ys, ms, ds] = iso.split("-");
  return { year: Number(ys), month: Number(ms), day: Number(ds) };
}

function isEidFitrMonth(year: number, month: number): boolean {
  return HOLIDAY_SEED.some((h) => {
    if (h.countryCode !== COUNTRY || h.slug !== "eid-fitr") return false;
    const d = parseHolidayDate(h.date);
    return d.year === year && d.month === month;
  });
}

function findLatestPastEidFitr(before: Date): { year: number; month: number; day: number } | null {
  const cutoff = before.getTime();
  let best: { year: number; month: number; day: number; t: number } | null = null;
  for (const h of HOLIDAY_SEED) {
    if (h.countryCode !== COUNTRY || h.slug !== "eid-fitr") continue;
    const d = parseHolidayDate(h.date);
    const t = atNoon(d.year, d.month, d.day).getTime();
    if (t <= cutoff && (!best || t > best.t)) {
      best = { ...d, t };
    }
  }
  if (!best) return null;
  return { year: best.year, month: best.month, day: best.day };
}

/** Deterministic jitter in [min, max] from month index + salt. */
function jitter(monthIndex: number, salt: number, min: number, max: number): number {
  const t = Math.sin(monthIndex * 12.9898 + salt * 78.233) * 43758.5453;
  const u = t - Math.floor(t);
  return Math.round(min + u * (max - min));
}

type IncomeRow = {
  source: string;
  type: IncomeType;
  amount: number;
  date: Date;
  isRecurring?: boolean;
  recurrenceFrequency?: "MONTHLY" | "WEEKLY" | "BIWEEKLY" | "YEARLY";
  payee?: string;
  note?: string;
};

type ExpenseRow = {
  description: string;
  kind: ExpenseKind;
  category: ExpenseCategory;
  amount: number;
  date: Date;
  isRecurring?: boolean;
  recurrenceFrequency?: "MONTHLY" | "WEEKLY" | "BIWEEKLY" | "YEARLY";
  payee?: string;
  note?: string;
};

function buildMonthIncomes(
  year: number,
  month: number,
  ctx: MonthBuildContext,
): IncomeRow[] {
  const { monthIndex, isRecentMonth, isNegativeSavingsMonth } = ctx;
  const rows: IncomeRow[] = [];

  rows.push({
    source: "Acme Corp",
    type: "SALARY",
    amount: jitter(monthIndex, 1, 17_500, 19_200),
    date: atNoon(year, month, 15),
    isRecurring: true,
    recurrenceFrequency: "MONTHLY",
    payee: "Acme Corp — HR",
    note: "Net salary",
  });

  if (isRecentMonth && monthIndex % 2 === 0) {
    rows.push({
      source: "Acme Corp",
      type: "SALARY",
      amount: 450,
      date: atNoon(year, month, 16),
      payee: "Acme Corp — HR",
      note: "Transport allowance (duplicate check demo)",
    });
  }

  rows.push({
    source: "Acme Corp",
    type: "SALARY",
    amount: jitter(monthIndex, 8, 8_200, 9_100),
    date: atNoon(year, month, 1),
    isRecurring: true,
    recurrenceFrequency: "BIWEEKLY",
    payee: "Acme Corp — HR",
    note: "Mid-month advance",
  });

  if (monthIndex % 2 === 0) {
    rows.push({
      source: "Freelance — Studio Nour",
      type: "FREELANCE",
      amount: jitter(monthIndex, 2, 2_000, 5_500),
      date: atNoon(year, month, jitter(monthIndex, 3, 8, 22)),
      payee: "Studio Nour",
    });
  }

  if (month % 3 === 0) {
    rows.push({
      source: "Index fund dividends",
      type: "PASSIVE",
      amount: jitter(monthIndex, 4, 650, 950),
      date: atNoon(year, month, 28),
      isRecurring: true,
      recurrenceFrequency: "MONTHLY",
      payee: "CDG Capital",
    });
  }

  if (month === 12) {
    rows.push({
      source: "Year-end bonus",
      type: "BONUS",
      amount: jitter(monthIndex, 5, 4_500, 7_000),
      date: atNoon(year, month, 20),
      payee: "Acme Corp — HR",
    });
  }

  if (isNegativeSavingsMonth) {
    rows.push({
      source: "Side project",
      type: "OTHER",
      amount: 1_200,
      date: atNoon(year, month, 10),
      note: "Lower than usual — sick leave",
    });
  } else if (monthIndex % 5 === 1) {
    rows.push({
      source: "Side project",
      type: "OTHER",
      amount: jitter(monthIndex, 6, 800, 1_800),
      date: atNoon(year, month, jitter(monthIndex, 7, 5, 18)),
    });
  }

  if (isRecentMonth) {
    rows.push({
      source: "Consulting — weekend",
      type: "FREELANCE",
      amount: jitter(monthIndex, 9, 1_500, 2_800),
      date: atNoon(year, month, 22),
      payee: "Client Atlas",
    });
  }

  return rows;
}

function buildMonthExpenses(
  year: number,
  month: number,
  ctx: MonthBuildContext,
): ExpenseRow[] {
  const { monthIndex, isNegativeSavingsMonth, isRecentMonth, isEidFitrMonth } = ctx;
  const rows: ExpenseRow[] = [];

  const fixed: ExpenseRow[] = [
    {
      description: "Rent",
      kind: "FIXED",
      category: "HOUSING",
      amount: 5_500,
      date: atNoon(year, month, 1),
      isRecurring: true,
      recurrenceFrequency: "MONTHLY",
      payee: "M. Alaoui — landlord",
    },
    {
      description: "Electricity & water",
      kind: "FIXED",
      category: "UTILITIES",
      amount: jitter(monthIndex, 10, 380, 520),
      date: atNoon(year, month, 6),
      isRecurring: true,
      recurrenceFrequency: "MONTHLY",
      payee: "LYDEC",
    },
    {
      description: "Internet",
      kind: "FIXED",
      category: "SUBSCRIPTIONS",
      amount: 350,
      date: atNoon(year, month, 5),
      isRecurring: true,
      recurrenceFrequency: "MONTHLY",
      payee: "Maroc Telecom",
    },
    {
      description: "Mobile plan",
      kind: "FIXED",
      category: "SUBSCRIPTIONS",
      amount: 199,
      date: atNoon(year, month, 5),
      isRecurring: true,
      recurrenceFrequency: "MONTHLY",
      payee: "INWI",
    },
    {
      description: "Health insurance",
      kind: "FIXED",
      category: "HEALTH",
      amount: 450,
      date: atNoon(year, month, 10),
      isRecurring: true,
      recurrenceFrequency: "MONTHLY",
      payee: "AXA Maroc",
    },
    {
      description: "Gym membership",
      kind: "FIXED",
      category: "SUBSCRIPTIONS",
      amount: 299,
      date: atNoon(year, month, 12),
      isRecurring: true,
      recurrenceFrequency: "MONTHLY",
      payee: "Fitness Park",
    },
    {
      description: "Emergency fund transfer",
      kind: "FIXED",
      category: "SAVINGS_CONTRIBUTION",
      amount: isNegativeSavingsMonth ? 500 : 2_000,
      date: atNoon(year, month, 20),
      isRecurring: true,
      recurrenceFrequency: "MONTHLY",
    },
  ];

  rows.push(...fixed);

  const groceryTrips = isRecentMonth ? 6 : 4;
  for (let g = 0; g < groceryTrips; g++) {
    rows.push({
      description: "Groceries",
      kind: "VARIABLE",
      category: "FOOD_GROCERIES",
      amount: jitter(monthIndex, 20 + g, 320, 620),
      date: atNoon(year, month, 2 + g * 5),
      payee: g % 2 === 0 ? "Marjane" : "Carrefour",
    });
  }

  if (isEidFitrMonth) {
    rows.push({
      description: "Eid groceries & sweets",
      kind: "VARIABLE",
      category: "FOOD_GROCERIES",
      amount: jitter(monthIndex, 40, 1_800, 2_800),
      date: atNoon(year, month, 12),
      payee: "Hanout & pâtisserie",
    });
    rows.push({
      description: "Eid gifts",
      kind: "VARIABLE",
      category: "SHOPPING",
      amount: jitter(monthIndex, 41, 2_000, 3_500),
      date: atNoon(year, month, 14),
    });
  }

  if (month === 9) {
    rows.push({
      description: "School tuition — Youssef Jr.",
      kind: "FIXED",
      category: "EDUCATION",
      amount: 4_800,
      date: atNoon(year, month, 8),
      payee: "Collège Atlas",
    });
    rows.push({
      description: "School supplies",
      kind: "VARIABLE",
      category: "EDUCATION",
      amount: 950,
      date: atNoon(year, month, 12),
      payee: "Librairie des Écoles",
    });
  }

  rows.push({
    description: "Fuel & transit",
    kind: "VARIABLE",
    category: "TRANSPORT",
    amount: jitter(monthIndex, 30, 650, 1_100),
    date: atNoon(year, month, 14),
    payee: "Afriquia",
  });

  rows.push({
    description: "Restaurants",
    kind: "VARIABLE",
    category: "ENTERTAINMENT",
    amount: jitter(monthIndex, 31, 280, 750),
    date: atNoon(year, month, 18),
  });

  if (monthIndex % 3 !== 0) {
    rows.push({
      description: "Weekend outing",
      kind: "VARIABLE",
      category: "ENTERTAINMENT",
      amount: jitter(monthIndex, 32, 150, 450),
      date: atNoon(year, month, 24),
    });
  }

  if (monthIndex % 4 === 2) {
    rows.push({
      description: "Clothing",
      kind: "VARIABLE",
      category: "SHOPPING",
      amount: jitter(monthIndex, 33, 400, 1_200),
      date: atNoon(year, month, 11),
    });
  }

  if (monthIndex % 6 === 0) {
    rows.push({
      description: "Charity",
      kind: "VARIABLE",
      category: "DONATIONS",
      amount: jitter(monthIndex, 34, 200, 500),
      date: atNoon(year, month, 25),
    });
  }

  if (monthIndex % 4 === 1 && !isNegativeSavingsMonth) {
    rows.push({
      description: "Extra savings deposit",
      kind: "VARIABLE",
      category: "SAVINGS_CONTRIBUTION",
      amount: jitter(monthIndex, 35, 500, 1_500),
      date: atNoon(year, month, 27),
    });
  }

  if (month === 7 || month === 8) {
    rows.push({
      description: "Summer travel",
      kind: "VARIABLE",
      category: "TRAVEL",
      amount: jitter(monthIndex, 36, 1_500, 3_500),
      date: atNoon(year, month, 16),
    });
  }

  if (isNegativeSavingsMonth) {
    rows.push({
      description: "Emergency home repair",
      kind: "VARIABLE",
      category: "HOUSING",
      amount: 6_500,
      date: atNoon(year, month, 9),
      payee: "Plumber & materials",
    });
    rows.push({
      description: "Electronics — unplanned",
      kind: "VARIABLE",
      category: "SHOPPING",
      amount: 4_200,
      date: atNoon(year, month, 17),
      payee: "Electroplanet",
    });
    rows.push({
      description: "Medical — not covered",
      kind: "VARIABLE",
      category: "HEALTH",
      amount: 2_800,
      date: atNoon(year, month, 21),
    });
  }

  return rows;
}

async function main() {
  const prisma = createPrisma();

  const now = new Date();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1;
  const endDay = now.getDate();

  const start = addMonths(endYear, endMonth, -(MONTHS_OF_HISTORY - 1));

  console.log(
    `Seeding demo user (${MONTHS_OF_HISTORY} months: ${start.year}-${String(start.month).padStart(2, "0")} → ${endYear}-${String(endMonth).padStart(2, "0")})…`,
  );

  const existing = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    select: { id: true },
  });

  if (existing) {
    console.log("Removing previous demo data…");
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const passwordHash = await hash(DEMO_PASSWORD, 12);
  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      passwordHash,
      name: DEMO_NAME,
      countryCode: COUNTRY,
      currency: CURRENCY,
    },
  });

  const incomes: IncomeRow[] = [];
  const expenses: ExpenseRow[] = [];
  let monthIndex = 0;
  let y = start.year;
  let m = start.month;
  const totalMonths = MONTHS_OF_HISTORY;
  const negativeMonthIndex = Math.max(2, totalMonths - 5);

  while (y < endYear || (y === endYear && m <= endMonth)) {
    const ctx: MonthBuildContext = {
      monthIndex,
      totalMonths,
      isNegativeSavingsMonth: monthIndex === negativeMonthIndex,
      isRecentMonth: monthIndex >= totalMonths - 2,
      isEidFitrMonth: isEidFitrMonth(y, m),
    };
    incomes.push(...buildMonthIncomes(y, m, ctx));
    expenses.push(...buildMonthExpenses(y, m, ctx));
    const next = addMonths(y, m, 1);
    y = next.year;
    m = next.month;
    monthIndex += 1;
  }

  await prisma.income.createMany({
    data: incomes.map((row) => ({
      userId: user.id,
      source: row.source,
      type: row.type,
      amount: row.amount,
      date: row.date,
      currency: CURRENCY,
      isRecurring: row.isRecurring ?? false,
      recurrenceFrequency: row.recurrenceFrequency ?? null,
      payee: row.payee ?? null,
      note: row.note ?? null,
    })),
  });

  await prisma.expense.createMany({
    data: expenses.map((row) => ({
      userId: user.id,
      description: row.description,
      kind: row.kind,
      category: row.category,
      amount: row.amount,
      date: row.date,
      currency: CURRENCY,
      isRecurring: row.isRecurring ?? false,
      recurrenceFrequency: row.recurrenceFrequency ?? null,
      payee: row.payee ?? null,
      note: row.note ?? null,
    })),
  });

  const vacationDeadline = addMonths(endYear, endMonth, 4);
  const goals = await Promise.all([
    prisma.goal.create({
      data: {
        userId: user.id,
        name: "Emergency fund",
        emoji: "🛡️",
        type: "EMERGENCY_FUND" satisfies GoalType,
        targetAmount: 50_000,
        savedAmount: 22_000,
        monthlyContrib: 2_000,
        interestRate: 2.5,
        currency: CURRENCY,
        deadline: atNoon(
          addMonths(endYear, endMonth, 8).year,
          addMonths(endYear, endMonth, 8).month,
          1,
        ),
      },
    }),
    prisma.goal.create({
      data: {
        userId: user.id,
        name: "Summer vacation",
        emoji: "✈️",
        type: "VACATION" satisfies GoalType,
        targetAmount: 15_000,
        savedAmount: 8_200,
        monthlyContrib: 800,
        interestRate: 0,
        currency: CURRENCY,
        deadline: atNoon(vacationDeadline.year, vacationDeadline.month, 15),
      },
    }),
    prisma.goal.create({
      data: {
        userId: user.id,
        name: "New car",
        emoji: "🚗",
        type: "CAR" satisfies GoalType,
        targetAmount: 120_000,
        savedAmount: 35_000,
        monthlyContrib: 1_500,
        interestRate: 3,
        currency: CURRENCY,
        deadline: atNoon(endYear + 1, 6, 1),
      },
    }),
    prisma.goal.create({
      data: {
        userId: user.id,
        name: "House down payment",
        emoji: "🏠",
        type: "HOUSE" satisfies GoalType,
        targetAmount: 300_000,
        savedAmount: 48_000,
        monthlyContrib: 2_500,
        interestRate: 4,
        currency: CURRENCY,
        deadline: atNoon(endYear + 3, 1, 1),
      },
    }),
    prisma.goal.create({
      data: {
        userId: user.id,
        name: "Education — university fund",
        emoji: "🎓",
        type: "EDUCATION" satisfies GoalType,
        targetAmount: 80_000,
        savedAmount: 12_500,
        monthlyContrib: 1_200,
        interestRate: 2,
        currency: CURRENCY,
        deadline: atNoon(endYear + 5, 9, 1),
      },
    }),
    prisma.goal.create({
      data: {
        userId: user.id,
        name: "Laptop upgrade",
        emoji: "💻",
        type: "DEVICE" satisfies GoalType,
        targetAmount: 12_000,
        savedAmount: 11_400,
        monthlyContrib: 200,
        interestRate: 0,
        currency: CURRENCY,
        deadline: atNoon(endYear, endMonth, 28),
      },
    }),
  ]);

  const vacationGoal = goals.find((g) => g.name === "Summer vacation")!;

  await upsertHolidaysForCountry(COUNTRY);

  const eidHoliday = await prisma.holiday.findFirst({
    where: { countryCode: COUNTRY, slug: "eid-fitr", date: { lte: now } },
    orderBy: { date: "desc" },
  });

  const eidWhen = eidHoliday
    ? {
        year: eidHoliday.date.getFullYear(),
        month: eidHoliday.date.getMonth() + 1,
        day: eidHoliday.date.getDate(),
      }
    : findLatestPastEidFitr(now) ?? { year: endYear, month: 3, day: 20 };

  const eidEvent = await prisma.plannedEvent.create({
    data: {
      userId: user.id,
      title: "Eid al-Fitr family visit",
      category: "HOLIDAY",
      status: "COMPLETED",
      startDate: atNoon(eidWhen.year, eidWhen.month, eidWhen.day),
      endDate: atNoon(eidWhen.year, eidWhen.month, Math.min(eidWhen.day + 2, 28)),
      budgetAmount: 8_000,
      reservedAmount: 7_200,
      currency: CURRENCY,
      sourceHolidayId: eidHoliday?.id ?? null,
      completedAt: atNoon(eidWhen.year, eidWhen.month, Math.min(eidWhen.day + 3, 28)),
    },
  });

  await prisma.expense.createMany({
    data: [
      {
        userId: user.id,
        plannedEventId: eidEvent.id,
        description: "Gifts & groceries",
        kind: "VARIABLE",
        category: "SHOPPING",
        amount: 3_200,
        date: atNoon(eidWhen.year, eidWhen.month, Math.min(eidWhen.day + 1, 28)),
        currency: CURRENCY,
        payee: "Hanout & mall",
      },
      {
        userId: user.id,
        plannedEventId: eidEvent.id,
        description: "Travel & fuel",
        kind: "VARIABLE",
        category: "TRAVEL",
        amount: 4_100,
        date: atNoon(eidWhen.year, eidWhen.month, Math.min(eidWhen.day + 1, 28)),
        currency: CURRENCY,
      },
      {
        userId: user.id,
        plannedEventId: eidEvent.id,
        description: "Restaurant",
        kind: "VARIABLE",
        category: "ENTERTAINMENT",
        amount: 2_400,
        date: atNoon(eidWhen.year, eidWhen.month, Math.min(eidWhen.day + 2, 28)),
        currency: CURRENCY,
      },
    ],
  });

  const tripStart = addMonths(endYear, endMonth, 2);
  await prisma.plannedEvent.create({
    data: {
      userId: user.id,
      title: "Summer coast trip",
      category: "TRAVEL",
      status: "ACTIVE",
      startDate: atNoon(tripStart.year, tripStart.month, 10),
      endDate: atNoon(tripStart.year, tripStart.month, 17),
      budgetAmount: 15_000,
      reservedAmount: 5_500,
      currency: CURRENCY,
      goalId: vacationGoal.id,
    },
  });

  const successTrip = addMonths(endYear, endMonth, -4);
  const successEvent = await prisma.plannedEvent.create({
    data: {
      userId: user.id,
      title: "Weekend in Chefchaouen",
      category: "TRAVEL",
      status: "COMPLETED",
      startDate: atNoon(successTrip.year, successTrip.month, 8),
      endDate: atNoon(successTrip.year, successTrip.month, 10),
      budgetAmount: 3_500,
      reservedAmount: 3_500,
      currency: CURRENCY,
      completedAt: atNoon(successTrip.year, successTrip.month, 11),
    },
  });

  await prisma.expense.createMany({
    data: [
      {
        userId: user.id,
        plannedEventId: successEvent.id,
        description: "Riad & meals",
        kind: "VARIABLE",
        category: "TRAVEL",
        amount: 2_100,
        date: atNoon(successTrip.year, successTrip.month, 9),
        currency: CURRENCY,
      },
      {
        userId: user.id,
        plannedEventId: successEvent.id,
        description: "Activities",
        kind: "VARIABLE",
        category: "ENTERTAINMENT",
        amount: 800,
        date: atNoon(successTrip.year, successTrip.month, 10),
        currency: CURRENCY,
      },
    ],
  });

  await prisma.yearlyEvent.createMany({
    data: [
      {
        userId: user.id,
        title: "My birthday",
        kind: "BIRTHDAY",
        relation: "SELF",
        month: endMonth,
        day: Math.min(endDay, 28),
        birthYear: 1990,
        giftBudget: 500,
        currency: CURRENCY,
      },
      {
        userId: user.id,
        title: "Wife — Amina",
        kind: "BIRTHDAY",
        relation: "SPOUSE",
        month: 2,
        day: 14,
        birthYear: 1992,
        giftBudget: 1_200,
        currency: CURRENCY,
      },
      {
        userId: user.id,
        title: "Son — Youssef Jr.",
        kind: "BIRTHDAY",
        relation: "CHILD",
        month: 9,
        day: 3,
        birthYear: 2018,
        giftBudget: 400,
        currency: CURRENCY,
      },
      {
        userId: user.id,
        title: "Daughter — Lina",
        kind: "BIRTHDAY",
        relation: "CHILD",
        month: 4,
        day: 22,
        birthYear: 2021,
        giftBudget: 350,
        currency: CURRENCY,
      },
      {
        userId: user.id,
        title: "Mother — Fatima",
        kind: "BIRTHDAY",
        relation: "PARENT",
        month: 11,
        day: 8,
        birthYear: 1965,
        giftBudget: 600,
        currency: CURRENCY,
      },
      {
        userId: user.id,
        title: "Friend — Karim",
        kind: "BIRTHDAY",
        relation: "FRIEND",
        month: 5,
        day: 30,
        giftBudget: 300,
        currency: CURRENCY,
      },
      {
        userId: user.id,
        title: "Wedding anniversary",
        kind: "ANNIVERSARY",
        relation: "SPOUSE",
        month: 7,
        day: 20,
        giftBudget: 2_000,
        currency: CURRENCY,
      },
    ],
  });

  const newYearYear = endMonth === 12 && endDay > 28 ? endYear + 1 : endYear;
  await prisma.plannedEvent.create({
    data: {
      userId: user.id,
      title: "New Year dinner",
      category: "FAMILY",
      status: "PLANNING",
      startDate: atNoon(newYearYear, 12, 31),
      endDate: atNoon(newYearYear + 1, 1, 1),
      budgetAmount: 2_500,
      reservedAmount: 800,
      currency: CURRENCY,
    },
  });

  const incomeCount = await prisma.income.count({ where: { userId: user.id } });
  const expenseCount = await prisma.expense.count({ where: { userId: user.id } });
  const goalCount = await prisma.goal.count({ where: { userId: user.id } });
  const eventCount = await prisma.plannedEvent.count({ where: { userId: user.id } });
  const yearlyCount = await prisma.yearlyEvent.count({ where: { userId: user.id } });

  console.log("\n✓ Demo data ready\n");
  console.log(`  Email:       ${DEMO_EMAIL}`);
  console.log(`  Password:    ${DEMO_PASSWORD}`);
  console.log(`  Profile:     ${DEMO_NAME} · ${COUNTRY} · ${CURRENCY}`);
  console.log(`  Incomes:     ${incomeCount} rows (${MONTHS_OF_HISTORY} months)`);
  console.log(`  Expenses:    ${expenseCount} rows`);
  console.log(`  Goals:       ${goalCount} (incl. laptop ~95% funded)`);
  console.log(`  Calendar:    ${eventCount} planned · ${yearlyCount} yearly events`);
  console.log("\n  Suggested tour:");
  console.log("  1. Dashboard → try global date filter (Last 3 months)");
  console.log("  2. Savings → compare vs previous period · summer trip goal");
  console.log("  3. Calendar → birthdays this month · Eid overspend · trip at risk");
  console.log("\n  Log in at /login\n");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
