import type Highcharts from "highcharts";
import { exportDataChartEvents } from "@/lib/charts/export-data-menu";

/** Series colors aligned with Fundly teal / expense rose palette. */
export const CHART_COLORS = {
  income: "#0d9488",
  expense: "#e11d48",
  savings: "#059669",
  savingsRate: "#6366f1",
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

/** Menu items are applied in `applyFundlyExportMenu` after export-data loads. */
export const CHART_EXPORTING: Highcharts.ExportingOptions = {
  enabled: true,
  sourceWidth: 1100,
  showTable: false,
  buttons: {
    contextButton: {
      align: "right",
      verticalAlign: "top",
      x: 0,
      y: 4,
    },
  },
};

const CHART_THEME_BASE: Highcharts.Options = {
  chart: {
    backgroundColor: "transparent",
    style: { fontFamily: "inherit" },
    events: exportDataChartEvents,
  },
  credits: { enabled: false },
  lang: {
    viewData: "View data table",
    hideData: "Hide data table",
  },
  exporting: CHART_EXPORTING,
  navigation: {
    menuStyle: {
      zIndex: 60,
    },
  },
  legend: {
    itemStyle: { fontWeight: "500", fontSize: "12px" },
  },
  tooltip: {
    borderRadius: 8,
    style: { fontSize: "12px" },
  },
  responsive: {
    rules: [
      {
        condition: { maxWidth: 480 },
        chartOptions: {
          xAxis: {
            labels: { rotation: -35, style: { fontSize: "10px" } },
          },
          legend: {
            layout: "horizontal",
            align: "center",
            verticalAlign: "bottom",
          },
        },
      },
    ],
  },
};

const FUNDLY_CHART_THEME_DARK: Highcharts.Options = {
  ...CHART_THEME_BASE,
  title: {
    style: { color: "#fafafa" },
  },
  subtitle: {
    style: { color: "#a1a1aa" },
  },
  legend: {
    ...CHART_THEME_BASE.legend,
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
    ...CHART_THEME_BASE.tooltip,
    backgroundColor: "#18181b",
    borderColor: "#3f3f46",
    style: { color: "#fafafa", fontSize: "12px" },
  },
};

const FUNDLY_CHART_THEME_LIGHT: Highcharts.Options = {
  ...CHART_THEME_BASE,
  title: {
    style: { color: "#18181b" },
  },
  subtitle: {
    style: { color: "#52525b" },
  },
  legend: {
    ...CHART_THEME_BASE.legend,
    itemStyle: { color: "#52525b", fontWeight: "500", fontSize: "12px" },
    itemHoverStyle: { color: "#18181b" },
  },
  xAxis: {
    lineColor: "#e4e4e7",
    tickColor: "#e4e4e7",
    labels: { style: { color: "#52525b", fontSize: "12px" } },
  },
  yAxis: {
    gridLineColor: "#f4f4f5",
    gridLineDashStyle: "Dash",
    title: { text: undefined },
    labels: { style: { color: "#52525b", fontSize: "11px" } },
  },
  tooltip: {
    ...CHART_THEME_BASE.tooltip,
    backgroundColor: "#ffffff",
    borderColor: "#e4e4e7",
    style: { color: "#18181b", fontSize: "12px" },
  },
};

export type ChartColorScheme = "light" | "dark";

let themeApplied: ChartColorScheme | null = null;

export function applyFundlyChartTheme(scheme: ChartColorScheme = "dark"): void {
  if (typeof window === "undefined") return;
  if (themeApplied === scheme) return;

  void import("./highcharts-init").then(async ({ ensureChartModules }) => {
    if (themeApplied === scheme) return;
    const hc = await ensureChartModules();
    const theme = scheme === "light" ? FUNDLY_CHART_THEME_LIGHT : FUNDLY_CHART_THEME_DARK;
    hc.setOptions(theme);
    themeApplied = scheme;
  });
}
