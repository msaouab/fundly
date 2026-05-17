import { DashboardView } from "@/components/dashboard-view";
import { fetchDashboardData } from "@/lib/dashboard/queries";
import { deserializeSerializedPeriod, type SerializedPeriod } from "@/lib/period";

export async function DashboardAuthenticatedContent({
  userId,
  period: serialized,
  email,
}: {
  userId: string;
  period: SerializedPeriod;
  email: string | null;
}) {
  const period = deserializeSerializedPeriod(serialized);
  const data = await fetchDashboardData(userId, period);

  return (
    <DashboardView
      email={email}
      period={serialized}
      currency={data.currency}
      periodLabel={data.periodLabel}
      incomeSummary={data.incomeSummary}
      expenseSummary={data.expenseSummary}
      categoryBreakdown={data.categoryBreakdown}
      incomeSources={data.incomeSources}
      flowSeries={data.flowSeries}
      previousPeriodSavings={data.previousPeriodSavings}
      largestExpense={data.largestExpense}
    />
  );
}
