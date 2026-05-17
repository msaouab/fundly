import type Highcharts from "highcharts";

/** Visible chart title + optional subtitle (Highcharts, not the card header). */
export type ChartCopy = {
  title: string;
  subtitle?: string;
};

export function fundlyChartTitle(text: string): Highcharts.Options["title"] {
  return {
    text,
    align: "left",
    margin: 8,
    style: {
      fontSize: "16px",
      fontWeight: "600",
    },
  };
}

export function fundlyChartSubtitle(text: string): Highcharts.Options["subtitle"] {
  return {
    text,
    align: "left",
    style: {
      fontSize: "12px",
      fontWeight: "400",
    },
  };
}
