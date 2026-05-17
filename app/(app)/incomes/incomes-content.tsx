import { auth } from "@/auth";
import { fetchIncomesPageData } from "@/lib/incomes/queries";
import { deserializeSerializedPeriod, type SerializedPeriod } from "@/lib/period";
import { IncomesView } from "@/app/(app)/incomes/_components/incomes-view";

export async function IncomesPageContent({ period: serialized }: { period: SerializedPeriod }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  const period = deserializeSerializedPeriod(serialized);
  const data = await fetchIncomesPageData(userId, {
    start: period.start,
    end: period.end,
  });

  return (
    <IncomesView
      userId={userId}
      period={serialized}
      incomes={data.incomes}
      summary={data.summary}
      currency={data.currency}
    />
  );
}
