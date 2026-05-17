import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarPageContent } from "./calendar-content";

export const metadata: Metadata = {
  title: "Calendar",
};

type PageProps = {
  searchParams: Promise<{ month?: string }>;
};

function CalendarSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-6 pb-10">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-96 rounded-xl bg-muted" />
    </div>
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
