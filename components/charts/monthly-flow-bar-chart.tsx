"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import HighchartsReact from "highcharts-react-official";
import { ChartShell } from "@/components/charts/chart-shell";
import type { MonthlyFlowChartCallbacks } from "@/lib/charts/chart-interaction";
import { hrefForFlowBarPoint } from "@/lib/charts/chart-navigation";
import type { ChartCopy } from "@/lib/charts/chart-copy";
import { createMonthlyFlowBarOptions } from "@/lib/charts/create-chart-options";
import { ensureChartModules } from "@/lib/charts/highcharts-init";
import type Highcharts from "highcharts";
import type { MonthlyCashFlowPoint } from "@/lib/charts/types";

type MonthlyFlowBarChartProps = ChartCopy & {
  data: MonthlyCashFlowPoint[];
  currency: string;
  height: number;
  emptyMessage?: string;
  /** When false, bars are not clickable (e.g. savings page). */
  enableNavigation?: boolean;
};

export function MonthlyFlowBarChart({
  title,
  subtitle,
  data,
  currency,
  height,
  emptyMessage,
  enableNavigation = true,
}: MonthlyFlowBarChartProps) {
  const router = useRouter();
  const [highcharts, setHighcharts] = useState<typeof Highcharts | null>(null);

  useEffect(() => {
    let active = true;
    void ensureChartModules().then((hc) => {
      if (active) setHighcharts(() => hc);
    });
    return () => {
      active = false;
    };
  }, []);

  const onPointClick = useCallback<NonNullable<MonthlyFlowChartCallbacks["onPointClick"]>>(
    ({ monthKey, series }) => {
      router.push(hrefForFlowBarPoint(monthKey, series));
    },
    [router],
  );

  const callbacks = useMemo(
    (): MonthlyFlowChartCallbacks | undefined =>
      enableNavigation ? { onPointClick } : undefined,
    [enableNavigation, onPointClick],
  );

  const copy = useMemo(() => ({ title, subtitle }), [title, subtitle]);

  const options = useMemo(
    () => createMonthlyFlowBarOptions(data, currency, height, copy, callbacks),
    [data, currency, height, copy, callbacks],
  );

  return (
    <ChartShell height={height} empty={data.length === 0} emptyMessage={emptyMessage}>
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
