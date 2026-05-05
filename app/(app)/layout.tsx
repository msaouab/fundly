import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";

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

  return (
    <AppShell
      user={{
        email: profile?.email ?? session.user.email,
        name: profile?.name ?? session.user.name,
      }}
    >
      {children}
    </AppShell>
  );
}
