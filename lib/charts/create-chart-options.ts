import type Highcharts from "highcharts";
import { compactAxisAmount, formatMonthKeyLabel } from "@/lib/charts/formatters";
import { CHART_COLORS } from "@/lib/charts/theme";
import type { CategorySlice, MonthlyCashFlowPoint } from "@/lib/charts/types";
import { formatMoney } from "@/lib/money";

const SERIES_ORDER = ["Income", "Expenses", "Saved"] as const;

export function createMonthlyFlowBarOptions(
  data: MonthlyCashFlowPoint[],
  currency: string,
  height: number,
): Highcharts.Options {
  const categories = data.map((d) => d.label);

  return {
    chart: { type: "column", height },
    xAxis: { categories, crosshair: true },
    yAxis: {
      labels: {
        formatter() {
          return compactAxisAmount(Number(this.value), currency);
        },
      },
    },
    plotOptions: {
      column: {
        borderRadius: 4,
        maxPointWidth: 32,
        groupPadding: 0.12,
      },
    },
    tooltip: {
      shared: true,
      useHTML: true,
      formatter() {
        const index = this.points?.[0]?.index ?? 0;
        const row = data[index];
        const title = row?.monthKey ? formatMonthKeyLabel(row.monthKey) : String(this.x ?? "");
        const lines = [...(this.points ?? [])]
          .sort(
            (a, b) =>
              SERIES_ORDER.indexOf(a.series.name as (typeof SERIES_ORDER)[number]) -
              SERIES_ORDER.indexOf(b.series.name as (typeof SERIES_ORDER)[number]),
          )
          .map(
            (p) =>
              `<span style="color:${p.color}">●</span> ${p.series.name}: <b>${formatMoney(Number(p.y), currency)}</b>`,
          );
        return `<span style="font-size:12px;font-weight:600">${title}</span><br/>${lines.join("<br/>")}`;
      },
    },
    series: [
      {
        type: "column",
        name: "Income",
        data: data.map((d) => d.income),
        color: CHART_COLORS.income,
      },
      {
        type: "column",
        name: "Expenses",
        data: data.map((d) => d.expense),
        color: CHART_COLORS.expense,
      },
      {
        type: "column",
        name: "Saved",
        data: data.map((d) => d.savings),
        color: CHART_COLORS.savings,
      },
    ],
  };
}

export function createCategoryPieOptions(
  slices: CategorySlice[],
  colors: string[],
  currency: string,
  height: number,
): Highcharts.Options {
  return {
    chart: { type: "pie", height },
    legend: { enabled: false },
    plotOptions: {
      pie: {
        innerSize: "58%",
        borderWidth: 0,
        dataLabels: { enabled: false },
        states: { hover: { halo: { size: 6 } } },
      },
    },
    tooltip: {
      useHTML: true,
      pointFormatter() {
        const y = Number(this.y);
        return `<span style="color:${this.color}">●</span> ${this.name}: <b>${formatMoney(y, currency)}</b>`;
      },
    },
    series: [
      {
        type: "pie",
        name: "Spending",
        data: slices.map((slice, i) => ({
          name: slice.name,
          y: slice.value,
          color: colors[i],
        })),
      },
    ],
  };
}
