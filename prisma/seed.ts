/**
 * Demo dataset for local / staging testing.
 *
 * Covers the last 3 calendar months (including current) plus recurring templates,
 * paid toggles, goals, planned/yearly events, and holiday-linked spend.
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

/** Calendar months of variable history (includes current month). */
const MONTHS_OF_HISTORY = 3;

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

type MonthBucket = { year: number; month: number; index: number };

function listHistoryMonths(endYear: number, endMonth: number): MonthBucket[] {
  const start = addMonths(endYear, endMonth, -(MONTHS_OF_HISTORY - 1));
  const buckets: MonthBucket[] = [];
  let y = start.year;
  let m = start.month;
  for (let i = 0; i < MONTHS_OF_HISTORY; i++) {
    buckets.push({ year: y, month: m, index: i });
    const next = addMonths(y, m, 1);
    y = next.year;
    m = next.month;
  }
  return buckets;
}

async function main() {
  const prisma = createPrisma();

  const now = new Date();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1;
  const endDay = now.getDate();
  const months = listHistoryMonths(endYear, endMonth);
  const first = months[0]!;
  const historyStart = atNoon(first.year, first.month, 1);

  console.log(
    `Seeding demo user (${MONTHS_OF_HISTORY} months: ${first.year}-${String(first.month).padStart(2, "0")} → ${endYear}-${String(endMonth).padStart(2, "0")})…`,
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

  // ── Recurring income templates (projected into ledger by schedule) ─────────
  const salary = await prisma.recurringIncome.create({
    data: {
      userId: user.id,
      source: "Acme Corp",
      type: "SALARY",
      amount: 18_200,
      currency: CURRENCY,
      recurrenceFrequency: "MONTHLY",
      occurrenceCount: null,
      startsAt: historyStart,
    },
  });

  const biweeklyAdvance = await prisma.recurringIncome.create({
    data: {
      userId: user.id,
      source: "Acme Corp (advance)",
      type: "SALARY",
      amount: 4_300,
      currency: CURRENCY,
      recurrenceFrequency: "BIWEEKLY",
      occurrenceCount: null,
      startsAt: atNoon(first.year, first.month, 1),
    },
  });

  const dividends = await prisma.recurringIncome.create({
    data: {
      userId: user.id,
      source: "Index fund dividends",
      type: "PASSIVE",
      amount: 800,
      currency: CURRENCY,
      recurrenceFrequency: "MONTHLY",
      occurrenceCount: null,
      startsAt: historyStart,
    },
  });

  // Yearly bonus — only in anniversary month (current month for demo visibility)
  const yearlyBonus = await prisma.recurringIncome.create({
    data: {
      userId: user.id,
      source: "Annual performance bonus",
      type: "BONUS",
      amount: 6_500,
      currency: CURRENCY,
      recurrenceFrequency: "YEARLY",
      occurrenceCount: null,
      startsAt: atNoon(endYear, endMonth, 15),
    },
  });

  // Limited window: weekly side gig for 8 weeks from history start
  const weeklyGig = await prisma.recurringIncome.create({
    data: {
      userId: user.id,
      source: "Weekend tutoring",
      type: "FREELANCE",
      amount: 600,
      currency: CURRENCY,
      recurrenceFrequency: "WEEKLY",
      occurrenceCount: 8,
      startsAt: atNoon(first.year, first.month, 5),
    },
  });

  // ── Recurring expense templates ────────────────────────────────────────────
  const rent = await prisma.recurringExpense.create({
    data: {
      userId: user.id,
      description: "Rent",
      category: "HOUSING",
      amount: 5_500,
      currency: CURRENCY,
      recurrenceFrequency: "MONTHLY",
      startsAt: historyStart,
    },
  });

  const utilities = await prisma.recurringExpense.create({
    data: {
      userId: user.id,
      description: "Electricity & water",
      category: "UTILITIES",
      amount: 450,
      currency: CURRENCY,
      recurrenceFrequency: "MONTHLY",
      startsAt: historyStart,
    },
  });

  const internet = await prisma.recurringExpense.create({
    data: {
      userId: user.id,
      description: "Internet",
      category: "SUBSCRIPTIONS",
      amount: 350,
      currency: CURRENCY,
      recurrenceFrequency: "MONTHLY",
      startsAt: historyStart,
    },
  });

  const mobile = await prisma.recurringExpense.create({
    data: {
      userId: user.id,
      description: "Mobile plan",
      category: "SUBSCRIPTIONS",
      amount: 199,
      currency: CURRENCY,
      recurrenceFrequency: "MONTHLY",
      startsAt: historyStart,
    },
  });

  const health = await prisma.recurringExpense.create({
    data: {
      userId: user.id,
      description: "Health insurance",
      category: "HEALTH",
      amount: 450,
      currency: CURRENCY,
      recurrenceFrequency: "MONTHLY",
      startsAt: historyStart,
    },
  });

  const gym = await prisma.recurringExpense.create({
    data: {
      userId: user.id,
      description: "Gym membership",
      category: "SUBSCRIPTIONS",
      amount: 299,
      currency: CURRENCY,
      recurrenceFrequency: "MONTHLY",
      startsAt: historyStart,
    },
  });

  const emergencyTransfer = await prisma.recurringExpense.create({
    data: {
      userId: user.id,
      description: "Emergency fund transfer",
      category: "SAVINGS_CONTRIBUTION",
      amount: 2_000,
      currency: CURRENCY,
      recurrenceFrequency: "MONTHLY",
      startsAt: historyStart,
    },
  });

  // Yearly — anniversary = first history month so it appears once in the 3-month window
  const carInsurance = await prisma.recurringExpense.create({
    data: {
      userId: user.id,
      description: "Car insurance (annual)",
      category: "TRANSPORT",
      amount: 4_800,
      currency: CURRENCY,
      recurrenceFrequency: "YEARLY",
      occurrenceCount: null,
      startsAt: atNoon(first.year, first.month, 8),
    },
  });

  // Limited: streaming trial for 3 months then ends
  const streaming = await prisma.recurringExpense.create({
    data: {
      userId: user.id,
      description: "Streaming bundle (trial)",
      category: "ENTERTAINMENT",
      amount: 149,
      currency: CURRENCY,
      recurrenceFrequency: "MONTHLY",
      occurrenceCount: 3,
      startsAt: historyStart,
    },
  });

  // ── Per-month Paid status (mix paid / unpaid across history) ────────────────
  const incomePaidRows: {
    recurringIncomeId: string;
    year: number;
    month: number;
    payee: boolean;
  }[] = [];
  const expensePaidRows: {
    recurringExpenseId: string;
    year: number;
    month: number;
    payee: boolean;
  }[] = [];

  for (const bucket of months) {
    const isCurrent = bucket.year === endYear && bucket.month === endMonth;
    const isOldest = bucket.index === 0;

    // Incomes: older months fully paid; current leaves dividend unpaid for demo toggle
    for (const t of [salary, biweeklyAdvance, weeklyGig]) {
      incomePaidRows.push({
        recurringIncomeId: t.id,
        year: bucket.year,
        month: bucket.month,
        payee: true,
      });
    }
    incomePaidRows.push({
      recurringIncomeId: dividends.id,
      year: bucket.year,
      month: bucket.month,
      payee: !isCurrent,
    });
    if (bucket.month === endMonth) {
      incomePaidRows.push({
        recurringIncomeId: yearlyBonus.id,
        year: bucket.year,
        month: bucket.month,
        payee: false,
      });
    }

    const monthlyBills = [rent, utilities, internet, mobile, health, gym, emergencyTransfer, streaming];
    for (const t of monthlyBills) {
      expensePaidRows.push({
        recurringExpenseId: t.id,
        year: bucket.year,
        month: bucket.month,
        // Current month: leave gym + emergency unpaid so Paid toggles are useful
        payee: isCurrent
          ? t.id !== gym.id && t.id !== emergencyTransfer.id
          : true,
      });
    }
    if (isOldest) {
      expensePaidRows.push({
        recurringExpenseId: carInsurance.id,
        year: bucket.year,
        month: bucket.month,
        payee: true,
      });
    }
  }

  await prisma.recurringIncomeMonth.createMany({ data: incomePaidRows });
  await prisma.recurringExpenseMonth.createMany({ data: expensePaidRows });

  // ── Variable one-off incomes & expenses for each history month ─────────────
  type IncomeSeed = {
    source: string;
    type: IncomeType;
    amount: number;
    date: Date;
    payee?: boolean;
    note?: string;
  };
  type ExpenseSeed = {
    description: string;
    category: ExpenseCategory;
    amount: number;
    date: Date;
    payee?: boolean;
    note?: string;
  };

  const oneOffIncomes: IncomeSeed[] = [];
  const variableExpenses: ExpenseSeed[] = [];

  for (const bucket of months) {
    const { year, month, index } = bucket;
    const isCurrent = year === endYear && month === endMonth;
    const isNegative = index === 1; // middle month: overspend demo

    if (index % 2 === 0) {
      oneOffIncomes.push({
        source: "Freelance — Studio Nour",
        type: "FREELANCE",
        amount: jitter(index, 2, 2_200, 4_800),
        date: atNoon(year, month, jitter(index, 3, 8, 20)),
        payee: true,
      });
    }

    if (isCurrent) {
      oneOffIncomes.push({
        source: "Consulting — weekend",
        type: "FREELANCE",
        amount: jitter(index, 9, 1_500, 2_600),
        date: atNoon(year, month, Math.min(endDay, 22)),
        payee: true,
      });
      oneOffIncomes.push({
        source: "Acme Corp",
        type: "SALARY",
        amount: 450,
        date: atNoon(year, month, 16),
        payee: true,
        note: "Transport allowance (duplicate-source demo)",
      });
    }

    if (isNegative) {
      oneOffIncomes.push({
        source: "Side project",
        type: "OTHER",
        amount: 900,
        date: atNoon(year, month, 10),
        note: "Lower than usual — sick leave",
      });
    } else {
      oneOffIncomes.push({
        source: "Side project",
        type: "OTHER",
        amount: jitter(index, 6, 800, 1_600),
        date: atNoon(year, month, jitter(index, 7, 5, 18)),
        payee: true,
      });
    }

    const groceryTrips = isCurrent ? 6 : 4;
    for (let g = 0; g < groceryTrips; g++) {
      variableExpenses.push({
        description: "Groceries",
        category: "FOOD_GROCERIES",
        amount: jitter(index, 20 + g, 320, 620),
        date: atNoon(year, month, 2 + g * 5),
        payee: g % 2 === 0,
      });
    }

    variableExpenses.push(
      {
        description: "Fuel & transit",
        category: "TRANSPORT",
        amount: jitter(index, 30, 650, 1_100),
        date: atNoon(year, month, 14),
        payee: true,
      },
      {
        description: "Restaurants",
        category: "ENTERTAINMENT",
        amount: jitter(index, 31, 280, 750),
        date: atNoon(year, month, 18),
      },
    );

    if (index % 2 === 0) {
      variableExpenses.push({
        description: "Weekend outing",
        category: "ENTERTAINMENT",
        amount: jitter(index, 32, 150, 450),
        date: atNoon(year, month, 24),
      });
    }

    if (index === 0) {
      variableExpenses.push({
        description: "Clothing",
        category: "SHOPPING",
        amount: jitter(index, 33, 400, 1_200),
        date: atNoon(year, month, 11),
      });
      variableExpenses.push({
        description: "Charity",
        category: "DONATIONS",
        amount: jitter(index, 34, 200, 500),
        date: atNoon(year, month, 25),
      });
    }

    if (!isNegative) {
      variableExpenses.push({
        description: "Extra savings deposit",
        category: "SAVINGS_CONTRIBUTION",
        amount: jitter(index, 35, 500, 1_200),
        date: atNoon(year, month, 27),
        payee: true,
      });
    }

    if (month === 7 || month === 8) {
      variableExpenses.push({
        description: "Summer travel",
        category: "TRAVEL",
        amount: jitter(index, 36, 1_500, 3_200),
        date: atNoon(year, month, 16),
      });
    }

    if (isEidFitrMonth(year, month)) {
      variableExpenses.push(
        {
          description: "Eid groceries & sweets",
          category: "FOOD_GROCERIES",
          amount: jitter(index, 40, 1_800, 2_800),
          date: atNoon(year, month, 12),
          payee: true,
        },
        {
          description: "Eid gifts",
          category: "SHOPPING",
          amount: jitter(index, 41, 2_000, 3_500),
          date: atNoon(year, month, 14),
        },
      );
    }

    if (isNegative) {
      variableExpenses.push(
        {
          description: "Emergency home repair",
          category: "HOUSING",
          amount: 6_500,
          date: atNoon(year, month, 9),
          payee: true,
        },
        {
          description: "Electronics — unplanned",
          category: "SHOPPING",
          amount: 4_200,
          date: atNoon(year, month, 17),
          payee: true,
        },
        {
          description: "Medical — not covered",
          category: "HEALTH",
          amount: 2_800,
          date: atNoon(year, month, 21),
        },
      );
    }

    if (isCurrent) {
      variableExpenses.push({
        description: "Pharmacy",
        category: "HEALTH",
        amount: jitter(index, 50, 120, 280),
        date: atNoon(year, month, Math.min(endDay, 19)),
        payee: true,
      });
      variableExpenses.push({
        description: "Online course",
        category: "EDUCATION",
        amount: 890,
        date: atNoon(year, month, Math.min(endDay, 12)),
        payee: true,
      });
    }
  }

  await prisma.income.createMany({
    data: oneOffIncomes.map((row) => ({
      userId: user.id,
      source: row.source,
      type: row.type,
      amount: row.amount,
      date: row.date,
      currency: CURRENCY,
      isRecurring: false,
      recurrenceFrequency: null,
      payee: row.payee ?? false,
      note: row.note ?? null,
    })),
  });

  await prisma.expense.createMany({
    data: variableExpenses.map((row) => ({
      userId: user.id,
      description: row.description,
      kind: "VARIABLE" as const,
      category: row.category,
      amount: row.amount,
      date: row.date,
      currency: CURRENCY,
      isRecurring: false,
      recurrenceFrequency: null,
      payee: row.payee ?? false,
      note: row.note ?? null,
    })),
  });

  // ── Goals ──────────────────────────────────────────────────────────────────
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

  // ── Holidays + planned events ──────────────────────────────────────────────
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

  const eidInWindow = months.some((b) => b.year === eidWhen.year && b.month === eidWhen.month);

  if (eidInWindow) {
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
          payee: true,
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
  }

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

  // Completed trip inside history window (oldest month)
  const successEvent = await prisma.plannedEvent.create({
    data: {
      userId: user.id,
      title: "Weekend in Chefchaouen",
      category: "TRAVEL",
      status: "COMPLETED",
      startDate: atNoon(first.year, first.month, 8),
      endDate: atNoon(first.year, first.month, 10),
      budgetAmount: 3_500,
      reservedAmount: 3_500,
      currency: CURRENCY,
      completedAt: atNoon(first.year, first.month, 11),
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
        date: atNoon(first.year, first.month, 9),
        currency: CURRENCY,
      },
      {
        userId: user.id,
        plannedEventId: successEvent.id,
        description: "Activities",
        kind: "VARIABLE",
        category: "ENTERTAINMENT",
        amount: 800,
        date: atNoon(first.year, first.month, 10),
        currency: CURRENCY,
      },
    ],
  });

  await prisma.plannedEvent.create({
    data: {
      userId: user.id,
      title: "Family wedding gift",
      category: "WEDDING",
      status: "PLANNING",
      startDate: atNoon(addMonths(endYear, endMonth, 1).year, addMonths(endYear, endMonth, 1).month, 20),
      endDate: null,
      budgetAmount: 3_000,
      reservedAmount: 1_000,
      currency: CURRENCY,
    },
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

  // ── Yearly events (birthdays / anniversary) ────────────────────────────────
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
        month: first.month,
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
        month: months[1]?.month ?? 9,
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

  const incomeCount = await prisma.income.count({ where: { userId: user.id } });
  const expenseCount = await prisma.expense.count({ where: { userId: user.id } });
  const recurringIncomeCount = await prisma.recurringIncome.count({
    where: { userId: user.id },
  });
  const recurringExpenseCount = await prisma.recurringExpense.count({
    where: { userId: user.id },
  });
  const paidIncomeMonths = await prisma.recurringIncomeMonth.count({
    where: { recurringIncome: { userId: user.id } },
  });
  const paidExpenseMonths = await prisma.recurringExpenseMonth.count({
    where: { recurringExpense: { userId: user.id } },
  });
  const goalCount = await prisma.goal.count({ where: { userId: user.id } });
  const eventCount = await prisma.plannedEvent.count({ where: { userId: user.id } });
  const yearlyCount = await prisma.yearlyEvent.count({ where: { userId: user.id } });

  console.log("\n✓ Demo data ready\n");
  console.log(`  Email:       ${DEMO_EMAIL}`);
  console.log(`  Password:    ${DEMO_PASSWORD}`);
  console.log(`  Profile:     ${DEMO_NAME} · ${COUNTRY} · ${CURRENCY}`);
  console.log(
    `  Recurring:   ${recurringIncomeCount} incomes · ${recurringExpenseCount} expenses`,
  );
  console.log(
    `  Paid rows:   ${paidIncomeMonths} income-months · ${paidExpenseMonths} expense-months`,
  );
  console.log(`  Incomes:     ${incomeCount} one-off (${MONTHS_OF_HISTORY} months)`);
  console.log(`  Expenses:    ${expenseCount} variable`);
  console.log(`  Goals:       ${goalCount}`);
  console.log(`  Calendar:    ${eventCount} planned · ${yearlyCount} yearly events`);
  console.log("\n  Covers:");
  console.log("  • Monthly / biweekly / weekly / yearly templates + startsAt");
  console.log("  • Limited occurrence windows (tutoring 8 weeks, streaming 3 months)");
  console.log("  • Mixed Paid toggles across months");
  console.log("  • Variable spend by category · goals · planned & yearly events");
  console.log("\n  Suggested tour:");
  console.log("  1. Dashboard → Last 3 months");
  console.log("  2. Incomes/Expenses → fixed group + yearly only in anniversary month");
  console.log("  3. Account → Recurring → edit start date / ends");
  console.log("  4. Forecast · Savings · Calendar");
  console.log("\n  Log in at /login\n");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
