import type { ReactNode } from "react";
import { EmptyState, type EmptyStateVariant } from "@/components/empty-state";
import { cn } from "@/lib/utils";

type ChartShellProps = {
  height: number;
  empty?: boolean;
  emptyVariant?: EmptyStateVariant;
  emptyMessage?: string;
  emptyDescription?: string;
  children: ReactNode;
  className?: string;
};

export function ChartShell({
  height,
  empty = false,
  emptyVariant = "chart-bar",
  emptyMessage = "No data for this period",
  emptyDescription,
  children,
  className,
}: ChartShellProps) {
  if (empty) {
    return (
      <div
        className={cn("flex w-full min-w-0 items-center justify-center", className)}
        style={{ height }}
      >
        <EmptyState
          variant={emptyVariant}
          title={emptyMessage}
          description={emptyDescription}
          className="h-full w-full"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "fundly-chart-host relative isolate w-full min-w-0 overflow-visible",
        className,
      )}
      style={{ minHeight: height }}
    >
      {children}
    </div>
  );
}
