import type { CategoryBreakdown } from "@/app/(app)/expenses/types";
import { CATEGORY_CONFIG } from "@/lib/expense-categories";
import type { CategorySlice } from "@/lib/charts/types";
import { CATEGORY_PALETTE } from "@/lib/charts/theme";

export function categoryBreakdownToSlices(
  breakdown: CategoryBreakdown[],
): { slices: CategorySlice[]; colors: string[] } {
  const rows = breakdown.filter((b) => b.total > 0);
  const slices = rows.map((b) => ({
    id: b.category,
    name: CATEGORY_CONFIG[b.category].label,
    value: b.total,
  }));
  const colors = rows.map((_, i) => CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]!);
  return { slices, colors };
}
