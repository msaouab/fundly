import { Suspense } from "react";
import type { Metadata } from "next";
import { parseMonthParam } from "@/lib/month";
import { IncomeSkeleton } from "./_components/income-skeleton";
import { IncomesPageContent } from "./incomes-content";

export const metadata: Metadata = {
  title: "Incomes",
};

type PageProps = {
  searchParams: Promise<{ month?: string }>;
};

export default async function IncomesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const { year, month } = parseMonthParam(sp.month);

  return (
    <Suspense fallback={<IncomeSkeleton />}>
      <IncomesPageContent year={year} month={month} />
    </Suspense>
  );
}
