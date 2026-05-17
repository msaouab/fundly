import { cn } from "@/lib/utils";

type ChartSkeletonProps = {
  height: number;
  className?: string;
};

export function ChartSkeleton({ height, className }: ChartSkeletonProps) {
  return (
    <div
      className={cn("w-full animate-pulse rounded-lg bg-muted/60", className)}
      style={{ height }}
      aria-hidden
    />
  );
}
