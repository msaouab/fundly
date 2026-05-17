import { auth } from "@/auth";
import { fetchExpensesPageData } from "@/lib/expenses/queries";
import { parseExpenseCategoryParam } from "@/lib/charts/chart-navigation";
import { deserializeSerializedPeriod, type SerializedPeriod } from "@/lib/period";
import { ExpensesView } from "@/app/(app)/expenses/_components/expenses-view";

export async function ExpensesPageContent({
  period: serialized,
  category: categoryParam,
}: {
  period: SerializedPeriod;
  category?: string;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  const period = deserializeSerializedPeriod(serialized);
  const data = await fetchExpensesPageData(userId, {
    start: period.start,
    end: period.end,
  });

  const filterCategory = parseExpenseCategoryParam(categoryParam);

  return (
    <ExpensesView
      userId={userId}
      period={serialized}
      expenses={data.expenses}
      summary={data.summary}
      currency={data.currency}
      filterCategory={filterCategory ?? undefined}
    />
  );
}
