import { prisma } from "@/lib/prisma";
import { isRecurringExpired } from "@/lib/recurring/occurrence";

/**
 * Deletes recurring income/expense templates whose limited occurrence window
 * has ended as of the current calendar month. Month paid rows cascade.
 */
export async function deleteExpiredRecurringTemplates(userId: string): Promise<{
  incomes: number;
  expenses: number;
}> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [incomes, expenses] = await Promise.all([
    prisma.recurringIncome.findMany({
      where: { userId, occurrenceCount: { not: null } },
      select: {
        id: true,
        startsAt: true,
        occurrenceCount: true,
        recurrenceFrequency: true,
      },
    }),
    prisma.recurringExpense.findMany({
      where: { userId, occurrenceCount: { not: null } },
      select: {
        id: true,
        startsAt: true,
        occurrenceCount: true,
        recurrenceFrequency: true,
      },
    }),
  ]);

  const expiredIncomeIds = incomes
    .filter((t) =>
      isRecurringExpired(
        t.startsAt,
        t.occurrenceCount,
        year,
        month,
        t.recurrenceFrequency,
      ),
    )
    .map((t) => t.id);
  const expiredExpenseIds = expenses
    .filter((t) =>
      isRecurringExpired(
        t.startsAt,
        t.occurrenceCount,
        year,
        month,
        t.recurrenceFrequency,
      ),
    )
    .map((t) => t.id);

  if (expiredIncomeIds.length === 0 && expiredExpenseIds.length === 0) {
    return { incomes: 0, expenses: 0 };
  }

  const [incomeResult, expenseResult] = await Promise.all([
    expiredIncomeIds.length
      ? prisma.recurringIncome.deleteMany({
          where: { userId, id: { in: expiredIncomeIds } },
        })
      : Promise.resolve({ count: 0 }),
    expiredExpenseIds.length
      ? prisma.recurringExpense.deleteMany({
          where: { userId, id: { in: expiredExpenseIds } },
        })
      : Promise.resolve({ count: 0 }),
  ]);

  return { incomes: incomeResult.count, expenses: expenseResult.count };
}
