import type { Metadata } from "next";
import { Suspense } from "react";
import { safeAuth } from "@/auth";

/** Session + auth() use request headers — must not be statically prerendered. */
export const dynamic = "force-dynamic";
import { AppShell } from "@/components/app-shell";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { DashboardAuthenticatedContent } from "@/app/dashboard-auth-content";
import { MarketingLanding } from "@/components/marketing-landing";
import { resolveAppPeriod } from "@/lib/period-storage.server";
import {
  readPeriodNavQueryFromCookies,
  readSerializedPeriodFromCookies,
} from "@/lib/period-server";

export async function generateMetadata(): Promise<Metadata> {
  const session = await safeAuth();
  if (session?.user) {
    return { title: "Dashboard" };
  }
  return {
    title: "Personal finance clarity",
    description:
      "Track income and spending, set savings goals, and plan events on a calendar in one calm Fundly workspace.",
  };
}

type PageProps = {
  searchParams: Promise<{ month?: string; period?: string; from?: string; to?: string }>;
};

export default async function Home({ searchParams }: PageProps) {
  const session = await safeAuth();

  if (session?.user) {
    const sp = await searchParams;
    const [period, initialPeriodQuery, initialPeriod] = await Promise.all([
      resolveAppPeriod(sp),
      readPeriodNavQueryFromCookies(),
      readSerializedPeriodFromCookies(),
    ]);

    return (
      <AppShell
        user={{ email: session.user.email, name: session.user.name }}
        initialPeriodQuery={initialPeriodQuery}
        initialPeriod={initialPeriod}
      >
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardAuthenticatedContent
            userId={session.user.id}
            period={period}
            email={session.user.email ?? null}
          />
        </Suspense>
      </AppShell>
    );
  }

  return <MarketingLanding />;
}
