import { Suspense } from "react";
import type { Metadata } from "next";
import { parseMonthParam } from "@/lib/month";
import { SavingsSkeleton } from "./_components";
import { SavingsPageContent } from "./savings-content";

export const metadata: Metadata = {
  title: "Savings",
};

type PageProps = {
  searchParams: Promise<{ month?: string }>;
};

export default async function SavingsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const { year, month } = parseMonthParam(sp.month);

  return (
    <Suspense fallback={<SavingsSkeleton />}>
      <SavingsPageContent year={year} month={month} />
    </Suspense>
  );
}
