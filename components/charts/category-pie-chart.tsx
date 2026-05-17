"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import HighchartsReact from "highcharts-react-official";
import { ChartShell } from "@/components/charts/chart-shell";
import type { CategoryPieChartCallbacks } from "@/lib/charts/chart-interaction";
import { hrefForExpenseCategory } from "@/lib/charts/chart-navigation";
import type { ChartCopy } from "@/lib/charts/chart-copy";
import { createCategoryPieOptions } from "@/lib/charts/create-chart-options";
import { ensureChartModules } from "@/lib/charts/highcharts-init";
import type Highcharts from "highcharts";
import type { CategorySlice } from "@/lib/charts/types";

type CategoryPieChartProps = ChartCopy & {
  slices: CategorySlice[];
  colors: string[];
  currency: string;
  height: number;
  emptyMessage?: string;
  periodQuery?: string | null;
};

export function CategoryPieChart({
  title,
  subtitle,
  slices,
  colors,
  currency,
  height,
  emptyMessage = "No expenses in this period.",
  periodQuery,
}: CategoryPieChartProps) {
  const router = useRouter();
  const [highcharts, setHighcharts] = useState<typeof Highcharts | null>(null);
  const total = useMemo(() => slices.reduce((sum, s) => sum + s.value, 0), [slices]);

  useEffect(() => {
    let active = true;
    void ensureChartModules().then((hc) => {
      if (active) setHighcharts(() => hc);
    });
    return () => {
      active = false;
    };
  }, []);

  const navigateToCategory = useCallback(
    (categoryId: string) => {
      if (!periodQuery) return;
      router.push(hrefForExpenseCategory(periodQuery, categoryId));
    },
    [periodQuery, router],
  );

  const onSliceClick = useCallback<NonNullable<CategoryPieChartCallbacks["onSliceClick"]>>(
    (categoryId) => navigateToCategory(categoryId),
    [navigateToCategory],
  );

  const callbacks = useMemo(
    (): CategoryPieChartCallbacks | undefined =>
      periodQuery ? { onSliceClick } : undefined,
    [periodQuery, onSliceClick],
  );

  const copy = useMemo(() => ({ title, subtitle }), [title, subtitle]);

  const options = useMemo(
    () => createCategoryPieOptions(slices, colors, currency, height, total, copy, callbacks),
    [slices, colors, currency, height, total, copy, callbacks],
  );

  return (
    <ChartShell height={height} empty={slices.length === 0} emptyMessage={emptyMessage}>
      {highcharts ? (
        <div className="fundly-chart-mount w-full">
          <HighchartsReact
            highcharts={highcharts}
            options={options}
            immutable
            containerProps={{ className: "h-full w-full", role: "img" }}
          />
        </div>
      ) : null}
    </ChartShell>
  );
}
