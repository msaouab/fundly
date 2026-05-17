"use client";

import { useMemo } from "react";
import HighchartsReact from "highcharts-react-official";
import { ChartShell } from "@/components/charts/chart-shell";
import { createCategoryPieOptions } from "@/lib/charts/create-chart-options";
import { getHighcharts } from "@/lib/charts/highcharts-init";
import type { CategorySlice } from "@/lib/charts/types";

type CategoryPieChartProps = {
  slices: CategorySlice[];
  colors: string[];
  currency: string;
  height: number;
  emptyMessage?: string;
};

export function CategoryPieChart({
  slices,
  colors,
  currency,
  height,
  emptyMessage = "No expenses in this period.",
}: CategoryPieChartProps) {
  const options = useMemo(
    () => createCategoryPieOptions(slices, colors, currency, height),
    [slices, colors, currency, height],
  );

  return (
    <ChartShell height={height} empty={slices.length === 0} emptyMessage={emptyMessage}>
      <HighchartsReact
        highcharts={getHighcharts()}
        options={options}
        immutable
        containerProps={{ className: "h-full w-full" }}
      />
    </ChartShell>
  );
}
