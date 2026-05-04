type DashboardHomeProps = {
  email: string | null;
};

export function DashboardHome({ email }: DashboardHomeProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Signed in as {email}
        </p>
      </header>
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-700 dark:text-zinc-300">
          Budget and transaction features can live here next. For now you have a
          working account session backed by Neon and Prisma.
        </p>
      </div>
    </div>
  );
}
