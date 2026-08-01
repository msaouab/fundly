import type { Metadata } from "next";
import { auth } from "@/auth";
import { ForecastView } from "./_components/forecast-view";
import { fetchForecastBaseline } from "@/lib/forecast/queries";

export const metadata: Metadata = {
  title: "Forecast",
};

export default async function ForecastPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const baseline = await fetchForecastBaseline(userId, 6);

  return <ForecastView baseline={baseline} />;
}
