import { DashboardView } from "@/components/dashboard-view";
import { fetchDashboardData } from "@/lib/dashboard/queries";
import { formatMonthKey } from "@/lib/month";

export async function DashboardAuthenticatedContent({
  userId,
  year,
  month,
  email,
}: {
  userId: string;
  year: number;
  month: number;
  email: string | null;
}) {
  const monthKey = formatMonthKey(year, month);
  const data = await fetchDashboardData(userId, year, month);

  return (
    <DashboardView
      email={email}
      monthKey={monthKey}
      year={year}
      month={month}
      currency={data.currency}
      incomeSummary={data.incomeSummary}
      expenseSummary={data.expenseSummary}
      categoryBreakdown={data.categoryBreakdown}
      incomeSources={data.incomeSources}
      flowSeries={data.flowSeries}
      previousMonthNet={data.previousMonthNet}
      previousMonthRemainderAfterFixed={data.previousMonthRemainderAfterFixed}
      largestExpense={data.largestExpense}
    />
  );
}
