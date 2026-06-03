import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type EmptyStateVariant =
  | "chart-bar"
  | "chart-pie"
  | "ledger"
  | "ledger-filtered"
  | "breakdown";

const DEFAULT_DESCRIPTION: Record<EmptyStateVariant, string> = {
  "chart-bar":
    "Income, expenses, or savings will show here once you have entries in this period.",
  "chart-pie": "Category shares appear after you log expenses for the selected period.",
  ledger: "Add your first entry with the form above to start tracking.",
  "ledger-filtered": "Try clearing search or filters to see more entries.",
  breakdown: "Breakdowns fill in as you add entries for this period.",
};

type EmptyStateProps = {
  variant: EmptyStateVariant;
  title: string;
  description?: string;
  size?: "sm" | "md";
  className?: string;
  children?: ReactNode;
};

function ChartBarIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <line x1="28" y1="112" x2="172" y2="112" className="stroke-muted-foreground/25" strokeWidth="2" strokeLinecap="round" />
      <line x1="28" y1="112" x2="28" y2="32" className="stroke-muted-foreground/25" strokeWidth="2" strokeLinecap="round" />
      <rect x="48" y="78" width="22" height="34" rx="5" className="fill-primary/15 stroke-primary/35" strokeWidth="1.5" />
      <rect x="82" y="58" width="22" height="54" rx="5" className="fill-primary/10 stroke-primary/25" strokeWidth="1.5" />
      <rect x="116" y="68" width="22" height="44" rx="5" className="fill-muted-foreground/10 stroke-muted-foreground/20" strokeWidth="1.5" strokeDasharray="4 3" />
      <rect x="150" y="88" width="22" height="24" rx="5" className="fill-muted-foreground/8 stroke-muted-foreground/18" strokeWidth="1.5" strokeDasharray="4 3" />
      <path
        d="M44 48h112"
        className="stroke-muted-foreground/15"
        strokeWidth="1.5"
        strokeDasharray="6 5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChartPieIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <circle cx="100" cy="72" r="46" className="stroke-muted-foreground/18" strokeWidth="10" />
      <path
        d="M100 26 A46 46 0 0 1 139 98"
        className="stroke-primary/40"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M139 98 A46 46 0 0 1 61 98"
        className="stroke-primary/20"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray="8 6"
      />
      <path
        d="M61 98 A46 46 0 0 1 100 26"
        className="stroke-muted-foreground/12"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray="6 5"
      />
      <circle cx="100" cy="72" r="18" className="fill-background stroke-muted-foreground/15" strokeWidth="1.5" />
    </svg>
  );
}

function LedgerIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect x="44" y="24" width="112" height="92" rx="10" className="fill-muted/40 stroke-border dark:stroke-zinc-700" strokeWidth="1.5" />
      <rect x="58" y="40" width="52" height="8" rx="4" className="fill-primary/25" />
      <rect x="58" y="58" width="84" height="6" rx="3" className="fill-muted-foreground/15" />
      <rect x="58" y="72" width="72" height="6" rx="3" className="fill-muted-foreground/12" />
      <rect x="58" y="86" width="80" height="6" rx="3" className="fill-muted-foreground/10" />
      <rect x="58" y="100" width="64" height="6" rx="3" className="fill-muted-foreground/8" strokeDasharray="4 3" />
      <circle cx="152" cy="44" r="16" className="fill-primary/12 stroke-primary/35" strokeWidth="1.5" />
      <path d="M146 44h12M152 38v12" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LedgerFilteredIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect x="48" y="36" width="104" height="76" rx="10" className="fill-muted/35 stroke-border dark:stroke-zinc-700" strokeWidth="1.5" />
      <rect x="62" y="50" width="76" height="6" rx="3" className="fill-muted-foreground/12" />
      <rect x="62" y="64" width="56" height="6" rx="3" className="fill-muted-foreground/10" />
      <rect x="62" y="78" width="68" height="6" rx="3" className="fill-muted-foreground/8" />
      <rect x="62" y="92" width="48" height="6" rx="3" className="fill-muted-foreground/8" strokeDasharray="4 3" />
      <circle cx="100" cy="104" r="26" className="fill-background stroke-primary/30" strokeWidth="2" />
      <circle cx="88" cy="96" r="10" className="stroke-primary/50" strokeWidth="2.5" />
      <line x1="95" y1="103" x2="112" y2="120" className="stroke-primary/50" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M132 52h14M139 45v14" className="stroke-muted-foreground/25" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function BreakdownIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect x="24" y="36" width="152" height="14" rx="7" className="fill-muted dark:fill-zinc-800" />
      <rect x="24" y="36" width="48" height="14" rx="7" className="fill-primary/20" />
      <rect x="72" y="36" width="36" height="14" className="fill-primary/12" />
      <rect x="108" y="36" width="68" height="14" rx="7" className="fill-muted-foreground/8" strokeDasharray="5 4" />
      <rect x="24" y="58" width="40" height="5" rx="2.5" className="fill-muted-foreground/12" />
      <rect x="72" y="58" width="32" height="5" rx="2.5" className="fill-muted-foreground/10" />
      <rect x="112" y="58" width="36" height="5" rx="2.5" className="fill-muted-foreground/8" />
    </svg>
  );
}

function EmptyIllustration({
  variant,
  size,
}: {
  variant: EmptyStateVariant;
  size: "sm" | "md";
}) {
  const className = size === "sm" ? "h-14 w-auto max-w-[200px]" : "h-24 w-auto max-w-[220px]";
  switch (variant) {
    case "chart-bar":
      return <ChartBarIllustration className={className} />;
    case "chart-pie":
      return <ChartPieIllustration className={className} />;
    case "ledger":
      return <LedgerIllustration className={className} />;
    case "ledger-filtered":
      return <LedgerFilteredIllustration className={className} />;
    case "breakdown":
      return <BreakdownIllustration className={className} />;
  }
}

export function EmptyState({
  variant,
  title,
  description,
  size = "md",
  className,
  children,
}: EmptyStateProps) {
  const resolvedDescription = description ?? DEFAULT_DESCRIPTION[variant];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "sm" ? "gap-2 py-4" : "gap-3 py-8",
        className,
      )}
      role="status"
    >
      <EmptyIllustration variant={variant} size={size} />
      <div className={cn("max-w-sm space-y-1", size === "sm" ? "px-2" : "px-4")}>
        <p
          className={cn(
            "font-medium text-foreground",
            size === "sm" ? "text-sm" : "text-base",
          )}
        >
          {title}
        </p>
        <p className={cn("text-muted-foreground", size === "sm" ? "text-xs" : "text-sm")}>
          {resolvedDescription}
        </p>
      </div>
      {children ? <div className="flex flex-col items-center gap-2">{children}</div> : null}
    </div>
  );
}
