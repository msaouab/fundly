import type Highcharts from "highcharts";

/** Series colors aligned with Fundly teal / expense rose palette. */
export const CHART_COLORS = {
  income: "#0d9488",
  expense: "#e11d48",
  savings: "#059669",
} as const;

export const CATEGORY_PALETTE = [
  "#0f766e",
  "#0d9488",
  "#14b8a6",
  "#0891b2",
  "#0369a1",
  "#4f46e5",
  "#7c3aed",
  "#a855f7",
  "#db2777",
  "#ea580c",
  "#ca8a04",
  "#52525c",
] as const;

const FUNDLY_CHART_THEME: Highcharts.Options = {
  chart: {
    backgroundColor: "transparent",
    style: { fontFamily: "inherit" },
  },
  credits: { enabled: false },
  title: { text: undefined },
  legend: {
    itemStyle: { color: "#a1a1aa", fontWeight: "500", fontSize: "12px" },
    itemHoverStyle: { color: "#fafafa" },
  },
  xAxis: {
    lineColor: "#3f3f46",
    tickColor: "#3f3f46",
    labels: { style: { color: "#a1a1aa", fontSize: "12px" } },
  },
  yAxis: {
    gridLineColor: "#27272a",
    gridLineDashStyle: "Dash",
    title: { text: undefined },
    labels: { style: { color: "#a1a1aa", fontSize: "11px" } },
  },
  tooltip: {
    backgroundColor: "#18181b",
    borderColor: "#3f3f46",
    borderRadius: 8,
    style: { color: "#fafafa", fontSize: "12px" },
  },
};

let themeApplied = false;

export function applyFundlyChartTheme(): void {
  if (themeApplied || typeof window === "undefined") return;

  void import("./highcharts-init").then(({ getHighcharts }) => {
    if (themeApplied) return;
    getHighcharts().setOptions(FUNDLY_CHART_THEME);
    themeApplied = true;
  });
}
