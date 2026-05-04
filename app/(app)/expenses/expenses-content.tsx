import { auth } from "@/auth";
import { fetchExpensesPageData } from "@/lib/expenses/queries";
import { formatMonthKey } from "@/lib/month";
import { ExpensesView } from "@/app/(app)/expenses/_components/expenses-view";

export async function ExpensesPageContent({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  const monthKey = formatMonthKey(year, month);
  const data = await fetchExpensesPageData(userId, year, month);

  return (
    <ExpensesView
      userId={userId}
      monthKey={monthKey}
      year={year}
      month={month}
      expenses={data.expenses}
      summary={data.summary}
      currency={data.currency}
    />
  );
}
