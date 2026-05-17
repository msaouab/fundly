import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AppPageSize = "full" | "6xl" | "3xl";

type AppPageProps = {
  className?: string;
  children: ReactNode;
  /** `full` = ledger width; `6xl` / `3xl` = centered analytics or settings. */
  size?: AppPageSize;
  gap?: 6 | 8;
};

/** Shared shell for authenticated app pages. */
export function AppPage({ className, children, size = "full", gap = 6 }: AppPageProps) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col pb-10",
        gap === 8 ? "gap-8" : "gap-6",
        size === "6xl" && "mx-auto max-w-6xl",
        size === "3xl" && "mx-auto max-w-3xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

type AppPageHeaderProps = {
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function AppPageHeader({ title, description, actions, className }: AppPageHeaderProps) {
  return (
    <header
      className={cn(
        "min-w-0",
        actions && "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}

/** KPIs, net bars, breakdowns — stacked sections with consistent spacing. */
export function AppPageOverview({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("flex w-full min-w-0 flex-col gap-6", className)}>{children}</div>;
}

/** Charts, calendar grid, highlight cards — optional aria-label for landmarks. */
export function AppPageSection({
  className,
  children,
  "aria-label": ariaLabel,
}: {
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  return (
    <section className={cn("w-full min-w-0 max-w-full", className)} aria-label={ariaLabel}>
      {children}
    </section>
  );
}

/**
 * Add-entry form and compact side panels (ledger pages only).
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

/** @alias AppPage — full-width ledger pages (incomes, expenses). */
export const LedgerPage = AppPage;

/** @alias AppPageHeader */
export const LedgerPageHeader = AppPageHeader;

/** @alias AppPageOverview */
export const LedgerPageOverview = AppPageOverview;
