import { auth } from "@/auth";
import { SavingsView } from "./_components";
import { fetchSavingsPageData } from "@/lib/savings/queries";
import { formatMonthKey } from "@/lib/month";

export async function SavingsPageContent({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const data = await fetchSavingsPageData(userId, year, month);
  return (
    <SavingsView
      year={year}
      month={month}
      monthKey={formatMonthKey(year, month)}
      currency={data.currency}
      monthly={data.monthly}
      previousMonthSaved={data.previousMonthSaved}
      global={data.global}
      trend={data.trend}
    />
  );
}
