import { auth } from "@/auth";
import { SavingsView } from "./_components";
import { fetchSavingsPageData } from "@/lib/savings/queries";
import { deserializeSerializedPeriod, type SerializedPeriod } from "@/lib/period";

export async function SavingsPageContent({ period: serialized }: { period: SerializedPeriod }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const period = deserializeSerializedPeriod(serialized);
  const data = await fetchSavingsPageData(userId, period);

  return (
    <SavingsView
      userId={data.userId}
      currency={data.currency}
      periodLabel={data.periodLabel}
      periodTotals={data.period}
      previousPeriodSavings={data.previousPeriodSavings}
      previousPeriodTransfers={data.previousPeriodTransfers}
      global={data.global}
      trend={data.trend}
      transfers={data.transfers}
      totalIncome={data.totalIncome}
      monthKey={serialized.to.slice(0, 7)}
    />
  );
}
