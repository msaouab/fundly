import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { getDefaultSerializedPeriod } from "@/lib/period";
import { periodQueryFromSerialized } from "@/lib/period-url";
import { readSerializedPeriodFromCookies } from "@/lib/period-server";

export default async function AppSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }
  const profile = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  const defaultPeriod = getDefaultSerializedPeriod();
  const cookiePeriod = await readSerializedPeriodFromCookies();
  const initialPeriod = cookiePeriod ?? defaultPeriod;
  const initialPeriodQuery = periodQueryFromSerialized(initialPeriod);

  return (
    <AppShell
      user={{
        email: profile?.email ?? session.user.email,
        name: profile?.name ?? session.user.name,
      }}
      initialPeriodQuery={initialPeriodQuery}
      initialPeriod={initialPeriod}
    >
      {children}
    </AppShell>
  );
}
