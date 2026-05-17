import { Suspense } from "react";
import type { Metadata } from "next";
import { resolveAppPeriod } from "@/lib/period-storage.server";
import { IncomeSkeleton } from "./_components/income-skeleton";
import { IncomesPageContent } from "./incomes-content";

export const metadata: Metadata = {
  title: "Incomes",
};

type PageProps = {
  searchParams: Promise<{ month?: string; period?: string; from?: string; to?: string }>;
};

export default async function IncomesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const period = await resolveAppPeriod(sp);

  return (
    <Suspense fallback={<IncomeSkeleton />}>
      <IncomesPageContent period={period} />
    </Suspense>
  );
}
