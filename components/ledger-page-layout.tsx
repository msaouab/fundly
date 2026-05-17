import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Full-width shell for data-heavy ledger pages (incomes, expenses). */
export function LedgerPage({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("flex w-full min-w-0 max-w-full flex-col gap-6 pb-10", className)}>
      {children}
    </div>
  );
}

export function LedgerPageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="min-w-0">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
    </header>
  );
}

/** KPIs, net bars, category breakdown — full width. */
export function LedgerPageOverview({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("flex w-full min-w-0 flex-col gap-6", className)}>{children}</div>;
}

/**
 * Add-entry form and compact side panels (sources, duplicate banners).
 * The main table should be a sibling `LedgerPageTable`, not inside this grid.
 */
export function LedgerPageActions({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "grid w-full min-w-0 max-w-full gap-6 *:min-w-0 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Primary data table — always full width of the content area. */
export function LedgerPageTable({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn("w-full min-w-0 max-w-full", className)} aria-label="Ledger entries">
      {children}
    </section>
  );
}
