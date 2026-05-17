"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/charts/chart-skeleton";
import { CHART_HEIGHT_DEFAULT, CHART_HEIGHT_SAVINGS } from "@/lib/charts/constants";

export { ChartSkeleton } from "@/components/charts/chart-skeleton";
export { ChartShell } from "@/components/charts/chart-shell";
export { HighchartsProvider } from "@/components/charts/highcharts-provider";

export const MonthlyFlowBarChart = dynamic(
  () =>
    import("@/components/charts/monthly-flow-bar-chart").then((m) => ({
      default: m.MonthlyFlowBarChart,
    })),
  {
    ssr: false,
    loading: () => <ChartSkeleton height={CHART_HEIGHT_DEFAULT} />,
  },
);

export const MonthlyFlowBarChartSavings = dynamic(
  () =>
    import("@/components/charts/monthly-flow-bar-chart").then((m) => ({
      default: m.MonthlyFlowBarChart,
    })),
  {
    ssr: false,
    loading: () => <ChartSkeleton height={CHART_HEIGHT_SAVINGS} />,
  },
);

export const CategoryPieChart = dynamic(
  () =>
    import("@/components/charts/category-pie-chart").then((m) => ({
      default: m.CategoryPieChart,
    })),
  {
    ssr: false,
    loading: () => <ChartSkeleton height={CHART_HEIGHT_DEFAULT} />,
  },
);
