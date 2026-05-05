import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  Coins,
  LineChart,
  PiggyBank,
  WalletCards,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: WalletCards,
    title: "Income & expenses together",
    description:
      "Record what comes in and what goes out each month so you always know your real surplus.",
  },
  {
    icon: PiggyBank,
    title: "Goals that stay grounded",
    description:
      "Set targets with monthly contributions—and watch progress update as life changes.",
  },
  {
    icon: Calculator,
    title: "Simulations before you commit",
    description:
      "Model loans, debt strategies, savings timelines, and what-if scenarios side by side.",
  },
  {
    icon: LineChart,
    title: "Outlook, not overwhelm",
    description:
      "Simple charts and net-worth style projections help you prioritize the next steps.",
  },
] as const;

export function MarketingLanding() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_85%_60%_at_50%_-15%,rgba(20,184,166,0.18),transparent_55%),radial-gradient(ellipse_60%_45%_at_100%_45%,rgba(20,184,166,0.08),transparent_50%),radial-gradient(ellipse_50%_40%_at_0%_80%,rgba(13,148,136,0.06),transparent_45%)] dark:bg-[radial-gradient(ellipse_85%_60%_at_50%_-15%,rgba(45,212,191,0.12),transparent_55%),radial-gradient(ellipse_60%_45%_at_100%_45%,rgba(45,212,191,0.06),transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[56px_56px] opacity-[0.35] dark:opacity-25"
        aria-hidden
      />

      <header className="relative border-b border-border/80 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-md outline-offset-4 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Image
              src="/fundly.webp"
              alt=""
              width={36}
              height={36}
              className="size-9 rounded-lg shadow-md ring-1 ring-border"
              priority
            />
            <span className="text-sm font-semibold tracking-tight sm:text-base">Fundly</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3" aria-label="Account">
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-muted-foreground",
              )}
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}
            >
              Create account <ArrowRight className="opacity-90" aria-hidden />
            </Link>
            <Link href="/register" className={cn(buttonVariants({ size: "sm" }), "sm:hidden")}>
              Join
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-4 py-14 sm:gap-24 sm:px-6 sm:py-20">
        <section className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
          <div className="flex flex-col gap-8 text-center lg:text-left">
            <div className="flex flex-col gap-5">
              <p className="inline-flex justify-center lg:justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary dark:border-primary/30 dark:bg-primary/15">
                  <Coins className="size-3.5 shrink-0" aria-hidden />
                  MAD-first by default—works for any savings mindset
                </span>
              </p>
              <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.65rem] lg:leading-[1.1]">
                See your cash flow—and plan bigger moves—with confidence.
              </h1>
              <p className="mx-auto max-w-xl text-pretty text-base leading-relaxed text-muted-foreground lg:mx-0 sm:text-lg">
                Fundly brings monthly income and spending, savings goals, and interactive simulations
                into one calm workspace—so saving for a car, a home, or a buffer feels less guesswork.
              </p>
            </div>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-start">
              <Link
                href="/register"
                className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
              >
                Create your free account
                <ArrowRight className="size-4 opacity-90" aria-hidden />
              </Link>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
              >
                I already have an account
              </Link>
            </div>
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground lg:justify-start">
              <li>No credit card to try</li>
              <li className="hidden h-4 w-px bg-border sm:block" aria-hidden />
              <li>Private by default—you own your entries</li>
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
            <div className="absolute -left-8 -top-10 size-40 rounded-full bg-primary/15 blur-3xl dark:bg-primary/20" aria-hidden />
            <Card className="relative overflow-hidden border-border/90 shadow-xl dark:border-zinc-800 dark:shadow-2xl dark:shadow-teal-950/20">
              <CardContent className="relative space-y-5 p-6 sm:p-8">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Preview snapshot
                    </p>
                    <p className="mt-2 text-xl font-semibold tabular-nums">MAD +2,940</p>
                    <p className="text-sm text-muted-foreground">estimated surplus based on typical setup</p>
                  </div>
                  <span className="rounded-lg bg-muted px-2.5 py-1 text-[10px] font-medium uppercase text-muted-foreground">
                    illustrative
                  </span>
                </div>
                <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 dark:border-zinc-800 dark:bg-zinc-800/60">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Income − expenses trend</span>
                    <span className="tabular-nums text-primary">steady</span>
                  </div>
                  <div
                    className="flex h-20 items-end justify-between gap-1.5 px-1"
                    aria-hidden
                    role="presentation"
                  >
                    {[40, 55, 48, 62, 52, 70, 65, 78, 72, 88, 80, 95].map((h, i) => (
                      <span
                        key={i}
                        className="w-full rounded-t-sm bg-linear-to-t from-primary/65 to-primary/25 dark:from-primary/50 dark:to-primary/15"
                        style={{ height: `${h}%`, minHeight: "4px" }}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                  Connect your rhythm: track this month&apos;s totals, tune goals, run a loan-vs-save
                  check—same app, fewer spreadsheets.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="flex flex-col gap-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">What you&apos;ll use most</h2>
            <p className="mt-3 text-pretty text-sm text-muted-foreground sm:text-base">
              Everyday tools share one ledger mindset: income, outcomes, targets, and &ldquo;if I change
              this&hellip;&rdquo; questions—answered with numbers instead of vibes.
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <li key={title}>
                <Card className="h-full border-border/90 transition-colors hover:border-primary/25 dark:border-zinc-800 dark:hover:border-primary/35">
                  <CardContent className="flex gap-4 p-5 sm:p-6">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/15">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 space-y-2">
                      <h3 className="font-semibold leading-snug">{title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="cta-heading"
          className="rounded-2xl border border-primary/25 bg-linear-to-br from-primary/15 via-muted/80 to-muted/40 p-8 text-center shadow-sm dark:border-primary/20 dark:from-primary/10 dark:via-zinc-900/90 dark:to-zinc-950 sm:p-12"
        >
          <h2 id="cta-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Ready to sketch your next milestone?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-pretty text-sm text-muted-foreground sm:text-base">
            Open an account in a minute—then tailor goals and simulations around how you actually live.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register" className={buttonVariants({ size: "lg" })}>
              Get started
              <ArrowRight className="size-4 opacity-90" aria-hidden />
            </Link>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "bg-background/70 dark:bg-background/60",
              )}
            >
              Sign in instead
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-border py-10 text-center text-xs text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Fundly</span> — planning tools only, not financial
          advice. Double-check meaningful decisions with a qualified professional.
        </p>
      </footer>
    </div>
  );
}
