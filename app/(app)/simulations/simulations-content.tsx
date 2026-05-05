import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { fetchLifetimeSurplusHint, fetchSimulationsPageData } from "@/lib/simulations/page-data";
import { SimulationsView } from "./_components/simulations-view";

export async function SimulationsPageContent() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const now = new Date();
  const data = await fetchSimulationsPageData(userId, now.getFullYear(), now.getMonth() + 1);
  const netWorthHint = await fetchLifetimeSurplusHint(userId);
  const currency = data.goals[0]?.currency ?? "MAD";

  return (
    <SimulationsView
      goals={data.goals}
      simulations={data.simulations}
      currency={currency}
      monthlyIncomeHint={data.hints.monthlyIncome}
      baselineMonthlySurplus={data.hints.baselineMonthlySurplus}
      hintsMonthLabel={data.hints.monthLabel}
      netWorthHint={netWorthHint}
    />
  );
}
