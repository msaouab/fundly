import type { FlowBarSeriesName } from "@/lib/charts/chart-navigation";

export type MonthlyFlowChartCallbacks = {
  onPointClick?: (args: { monthKey: string; series: FlowBarSeriesName }) => void;
};

export type CategoryPieChartCallbacks = {
  onSliceClick?: (categoryId: string) => void;
};
