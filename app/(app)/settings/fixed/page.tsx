import type { Metadata } from "next";
import { auth } from "@/auth";
import {
  FixedExpenseForm,
  FixedExpenseTable,
} from "./_components/fixed-expense-form";
import {
  FixedIncomeForm,
  FixedIncomeTable,
} from "./_components/fixed-income-form";
import { FixedSettingsPanels } from "./_components/fixed-settings-panels";
import { AppPage, AppPageHeader } from "@/components/ledger-page-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import type { ExpenseCategory, IncomeType, RecurrenceFrequency } from "@/generated/prisma/enums";

export const metadata: Metadata = {
  title: "Recurring",
};

export default async function FixedSettingsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currency: true },
  });
  const currency = user?.currency ?? "MAD";

  const [incomeTemplates, expenseTemplates] = await Promise.all([
    prisma.recurringIncome.findMany({
      where: { userId },
      orderBy: { source: "asc" },
    }),
    prisma.recurringExpense.findMany({
      where: { userId },
      orderBy: { description: "asc" },
    }),
  ]);

  const incomeRows = incomeTemplates.map((row) => ({
    id: row.id,
    source: row.source,
    type: row.type as IncomeType,
    amount: Number(row.amount),
    currency: row.currency,
    recurrenceFrequency: row.recurrenceFrequency as RecurrenceFrequency,
  }));

  const expenseRows = expenseTemplates.map((row) => ({
    id: row.id,
    description: row.description,
    category: row.category as ExpenseCategory,
    amount: Number(row.amount),
    currency: row.currency,
    recurrenceFrequency: row.recurrenceFrequency as RecurrenceFrequency,
  }));

  const incomeTotal = incomeRows.reduce((s, r) => s + r.amount, 0);
  const expenseTotal = expenseRows.reduce((s, r) => s + r.amount, 0);

  const incomesPanel = (
    <div className="flex flex-col gap-6">
      <Card className="border-primary/35 bg-primary/5 dark:border-primary/40 dark:bg-primary/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total recurring income
          </CardTitle>
          <CardDescription className="text-xs">
            {incomeRows.length} template{incomeRows.length === 1 ? "" : "s"} · shown every month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {formatMoney(incomeTotal, currency)}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">Add recurring income</CardTitle>
          <CardDescription>
            Define once — it appears automatically in every month&apos;s income table.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FixedIncomeForm currency={currency} />
        </CardContent>
      </Card>

      <Card className="border-border dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">Recurring incomes</CardTitle>
          <CardDescription>Edit or delete templates anytime.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <FixedIncomeTable rows={incomeRows} currency={currency} />
        </CardContent>
      </Card>
    </div>
  );

  const expensesPanel = (
    <div className="flex flex-col gap-6">
      <Card className="border-border bg-background dark:border-zinc-800 dark:bg-zinc-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total recurring expenses
          </CardTitle>
          <CardDescription className="text-xs">
            {expenseRows.length} template{expenseRows.length === 1 ? "" : "s"} · shown every month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {formatMoney(expenseTotal, currency)}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">Add recurring expense</CardTitle>
          <CardDescription>
            Rent, subscriptions, and other fixed costs — define once for every month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FixedExpenseForm currency={currency} />
        </CardContent>
      </Card>

      <Card className="border-border dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">Recurring expenses</CardTitle>
          <CardDescription>Edit or delete templates anytime.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <FixedExpenseTable rows={expenseRows} currency={currency} />
        </CardContent>
      </Card>
    </div>
  );

  return (
    <AppPage size="3xl">
      <AppPageHeader
        title="Recurring"
        description="Define fixed incomes and expenses once. They always appear in your monthly tables; mark Paid separately each month."
      />
      <FixedSettingsPanels incomes={incomesPanel} expenses={expensesPanel} />
    </AppPage>
  );
}
