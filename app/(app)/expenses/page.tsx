import { Suspense } from "react";
import type { Metadata } from "next";
import { parseMonthParam } from "@/lib/month";
import { ExpenseSkeleton } from "./_components/expense-skeleton";
import { ExpensesPageContent } from "./expenses-content";

export const metadata: Metadata = {
  title: "Expenses",
};

type PageProps = {
  searchParams: Promise<{ month?: string }>;
};

export default async function ExpensesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const { year, month } = parseMonthParam(sp.month);

  return (
    <Suspense fallback={<ExpenseSkeleton />}>
      <ExpensesPageContent year={year} month={month} />
    </Suspense>
  );
}
