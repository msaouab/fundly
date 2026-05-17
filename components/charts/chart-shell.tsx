import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ChartShellProps = {
  height: number;
  empty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
  className?: string;
};

export function ChartShell({
  height,
  empty = false,
  emptyMessage = "No data for this period.",
  children,
  className,
}: ChartShellProps) {
  if (empty) {
    return (
      <div
        className={cn("flex items-center justify-center text-sm text-muted-foreground", className)}
        style={{ height }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("w-full min-w-0", className)} style={{ height }}>
      {children}
    </div>
  );
}
