/**
 * One-off: convert dated FIXED expenses / recurring incomes into templates,
 * then delete those dated rows so ledger tables don't double-count.
 *
 * Run after schema push: npx tsx prisma/migrate-recurring-templates.ts
 */
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function expenseKey(userId: string, description: string, category: string) {
  return `${userId}::${category}::${description.trim().toLowerCase()}`;
}

function incomeKey(userId: string, source: string, type: string) {
  return `${userId}::${type}::${source.trim().toLowerCase()}`;
}

async function main() {
  const fixedExpenses = await prisma.expense.findMany({
    where: { kind: "FIXED" },
    orderBy: { date: "desc" },
  });

  const expenseGroups = new Map<string, (typeof fixedExpenses)[number]>();
  for (const row of fixedExpenses) {
    const key = expenseKey(row.userId, row.description, row.category);
    if (!expenseGroups.has(key)) expenseGroups.set(key, row);
  }

  let expenseTemplates = 0;
  for (const row of expenseGroups.values()) {
    await prisma.recurringExpense.create({
      data: {
        userId: row.userId,
        description: row.description,
        category: row.category,
        amount: row.amount,
        currency: row.currency,
        recurrenceFrequency: row.recurrenceFrequency ?? "MONTHLY",
      },
    });
    expenseTemplates += 1;
  }

  const deletedExpenses = await prisma.expense.deleteMany({
    where: { kind: "FIXED" },
  });

  const recurringIncomes = await prisma.income.findMany({
    where: { isRecurring: true },
    orderBy: { date: "desc" },
  });

  const incomeGroups = new Map<string, (typeof recurringIncomes)[number]>();
  for (const row of recurringIncomes) {
    const key = incomeKey(row.userId, row.source, row.type);
    if (!incomeGroups.has(key)) incomeGroups.set(key, row);
  }

  let incomeTemplates = 0;
  for (const row of incomeGroups.values()) {
    const type = row.type === "SALARY" || row.type === "PASSIVE" ? row.type : "SALARY";
    await prisma.recurringIncome.create({
      data: {
        userId: row.userId,
        source: row.source,
        type,
        amount: row.amount,
        currency: row.currency,
        recurrenceFrequency: row.recurrenceFrequency ?? "MONTHLY",
      },
    });
    incomeTemplates += 1;
  }

  const deletedIncomes = await prisma.income.deleteMany({
    where: { isRecurring: true },
  });

  console.log(
    `Created ${expenseTemplates} recurring expenses (deleted ${deletedExpenses.count} FIXED rows)`,
  );
  console.log(
    `Created ${incomeTemplates} recurring incomes (deleted ${deletedIncomes.count} recurring rows)`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
