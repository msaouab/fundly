import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { fetchLifetimeSurplusHint, fetchSimulationsPageData } from "@/lib/simulations/page-data";
import { SimulationsLoadError } from "./_components/simulations-load-error";
import { SimulationsView } from "./_components/simulations-view";

function errorDetail(err: unknown): string | null {
  if (!(err instanceof Error)) return null;
  const m = err.message.trim();
  if (!m) return null;
  return m.slice(0, 400);
}

export async function SimulationsPageContent() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  let data;
  let netWorthHint = 0;
  try {
    const now = new Date();
    [data, netWorthHint] = await Promise.all([
      fetchSimulationsPageData(userId, now.getFullYear(), now.getMonth() + 1),
      fetchLifetimeSurplusHint(userId),
    ]);
  } catch (err) {
    console.error("[simulations] load failed:", err);
    return <SimulationsLoadError detail={errorDetail(err)} />;
  }

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
