import type { MonthlyCashFlowPoint } from "@/lib/charts/types";

export function monthHasFlowActivity(point: MonthlyCashFlowPoint): boolean {
  return point.income !== 0 || point.expense !== 0;
}

/** Remove leading/trailing months with no recorded income or expenses. */
export function trimEmptyFlowMonths(points: MonthlyCashFlowPoint[]): MonthlyCashFlowPoint[] {
  if (points.length === 0) return points;

  let start = 0;
  while (start < points.length && !monthHasFlowActivity(points[start]!)) {
    start += 1;
  }

  let end = points.length - 1;
  while (end > start && !monthHasFlowActivity(points[end]!)) {
    end -= 1;
  }

  if (start > end) return [];
  return points.slice(start, end + 1);
}
