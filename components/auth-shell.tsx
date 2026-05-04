import Image from "next/image";
import Link from "next/link";

type AuthShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
};

export function AuthShell({ children, title, subtitle }: AuthShellProps) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 flex flex-col items-center gap-3 text-center outline-offset-4"
        >
          <Image
            src="/fundly.webp"
            alt="Fundly"
            width={72}
            height={72}
            className="rounded-xl shadow-md ring-1 ring-black/5 dark:ring-white/10"
            priority
          />
          <span className="text-sm font-medium text-teal-700 dark:text-teal-400">
            Fundly
          </span>
        </Link>
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {subtitle}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}
