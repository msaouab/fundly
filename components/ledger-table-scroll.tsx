import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type LedgerTableScrollProps = {
  children: ReactNode;
  className?: string;
  /** Shown below the scroll area on small screens only. */
  hint?: string;
};

/** Keeps wide tables scrollable on small viewports without breaking page layout. */
export function LedgerTableScroll({
  children,
  className,
  hint = "Swipe sideways to see all columns",
}: LedgerTableScrollProps) {
  return (
    <div className={cn("relative min-w-0 max-w-full", className)}>
      <div
        className="-mx-1 min-w-0 overflow-x-auto overscroll-x-contain px-1 pb-0.5 sm:mx-0 sm:px-0"
        tabIndex={0}
        role="region"
        aria-label="Scrollable table"
      >
        {children}
      </div>
      {hint ? (
        <p className="mt-1.5 text-center text-xs text-muted-foreground lg:hidden">{hint}</p>
      ) : null}
    </div>
  );
}
