import { auth } from "@/auth";
import { fetchIncomesPageData } from "@/lib/incomes/queries";
import { formatMonthKey } from "@/lib/month";
import { IncomesView } from "@/app/(app)/incomes/_components/incomes-view";

export async function IncomesPageContent({
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
  const data = await fetchIncomesPageData(userId, year, month);

  return (
    <IncomesView
      userId={userId}
      monthKey={monthKey}
      year={year}
      month={month}
      incomes={data.incomes}
      summary={data.summary}
      currency={data.currency}
    />
  );
}
