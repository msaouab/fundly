"use client";

import { useMemo } from "react";
import HighchartsReact from "highcharts-react-official";
import { ChartShell } from "@/components/charts/chart-shell";
import { createMonthlyFlowBarOptions } from "@/lib/charts/create-chart-options";
import { getHighcharts } from "@/lib/charts/highcharts-init";
import type { MonthlyCashFlowPoint } from "@/lib/charts/types";

type MonthlyFlowBarChartProps = {
  data: MonthlyCashFlowPoint[];
  currency: string;
  height: number;
  emptyMessage?: string;
};

export function MonthlyFlowBarChart({
  data,
  currency,
  height,
  emptyMessage,
}: MonthlyFlowBarChartProps) {
  const options = useMemo(
    () => createMonthlyFlowBarOptions(data, currency, height),
    [data, currency, height],
  );

  return (
    <ChartShell height={height} empty={data.length === 0} emptyMessage={emptyMessage}>
      <HighchartsReact
        highcharts={getHighcharts()}
        options={options}
        immutable
        containerProps={{ className: "h-full w-full" }}
      />
    </ChartShell>
  );
}
