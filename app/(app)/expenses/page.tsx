import { Suspense } from "react";
import type { Metadata } from "next";
import { resolveAppPeriod } from "@/lib/period-storage.server";
import { ExpenseSkeleton } from "./_components/expense-skeleton";
import { ExpensesPageContent } from "./expenses-content";

export const metadata: Metadata = {
  title: "Expenses",
};

type PageProps = {
  searchParams: Promise<{ month?: string; period?: string; from?: string; to?: string }>;
};

export default async function ExpensesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const period = await resolveAppPeriod(sp);

  return (
    <Suspense fallback={<ExpenseSkeleton />}>
      <ExpensesPageContent period={period} />
    </Suspense>
  );
}
