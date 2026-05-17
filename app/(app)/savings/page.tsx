import { Suspense } from "react";
import type { Metadata } from "next";
import { resolveAppPeriod } from "@/lib/period-storage.server";
import { SavingsSkeleton } from "./_components";
import { SavingsPageContent } from "./savings-content";

export const metadata: Metadata = {
  title: "Savings",
};

type PageProps = {
  searchParams: Promise<{ month?: string; period?: string; from?: string; to?: string }>;
};

export default async function SavingsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const period = await resolveAppPeriod(sp);

  return (
    <Suspense fallback={<SavingsSkeleton />}>
      <SavingsPageContent period={period} />
    </Suspense>
  );
}
