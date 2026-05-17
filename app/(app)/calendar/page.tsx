import { Suspense } from "react";
import type { Metadata } from "next";
import { AppPage } from "@/components/ledger-page-layout";
import { CalendarPageContent } from "./calendar-content";

export const metadata: Metadata = {
  title: "Calendar",
};

type PageProps = {
  searchParams: Promise<{ month?: string }>;
};

function CalendarSkeleton() {
  return (
    <AppPage size="6xl" className="animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-4 max-w-md rounded bg-muted" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-96 rounded-xl bg-muted lg:col-span-2" />
        <div className="h-64 rounded-xl bg-muted" />
      </div>
    </AppPage>
  );
}

export default async function CalendarPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <CalendarPageContent monthParam={sp.month} />
    </Suspense>
  );
}
