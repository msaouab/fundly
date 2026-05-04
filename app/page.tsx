import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { DashboardHome } from "@/components/dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const session = await auth();
  if (session?.user) {
    return { title: "Dashboard" };
  }
  return { title: "Fundly" };
}

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    return (
      <AppShell
        user={{ email: session.user.email, name: session.user.name }}
      >
        <DashboardHome email={session.user.email ?? null} />
      </AppShell>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-zinc-950">
      <nav className="absolute right-0 top-0 flex items-center gap-3 p-4 text-sm">
        <Link
          href="/login"
          className="font-medium text-zinc-700 hover:underline dark:text-zinc-300"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="rounded-full bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Register
        </Link>
      </nav>
      <main className="flex flex-1 w-full max-w-lg flex-col items-center justify-center gap-10 px-6 py-16 text-center">
        <Image
          src="/fundly.webp"
          alt="Fundly"
          width={200}
          height={200}
          priority
          className="h-auto w-48 max-w-full rounded-2xl shadow-lg ring-1 ring-black/5 dark:ring-white/10"
        />
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Fundly
          </h1>
          <p className="text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            Personal finance: income and expenses, budget health, and loan
            simulations—so you can decide with confidence.
          </p>
        </div>
      </main>
    </div>
  );
}
