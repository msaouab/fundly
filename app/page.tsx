import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { DashboardAuthenticatedContent } from "@/app/dashboard-auth-content";
import { MarketingLanding } from "@/components/marketing-landing";
import { parseMonthParam } from "@/lib/month";

export async function generateMetadata(): Promise<Metadata> {
  const session = await auth();
  if (session?.user) {
    return { title: "Dashboard" };
  }
  return {
    title: "Personal finance clarity",
    description:
      "Track income and spending, set savings goals, and run loan and what-if simulations in one calm Fundly workspace.",
  };
}

type PageProps = {
  searchParams: Promise<{ month?: string }>;
};

export default async function Home({ searchParams }: PageProps) {
  const session = await auth();

  if (session?.user) {
    const sp = await searchParams;
    const { year, month } = parseMonthParam(sp.month);

    return (
      <AppShell
        user={{ email: session.user.email, name: session.user.name }}
      >
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardAuthenticatedContent
            userId={session.user.id}
            year={year}
            month={month}
            email={session.user.email ?? null}
          />
        </Suspense>
      </AppShell>
    );
  }

  return <MarketingLanding />;
}
