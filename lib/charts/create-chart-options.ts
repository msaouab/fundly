import type Highcharts from "highcharts";
import type { FlowBarSeriesName } from "@/lib/charts/chart-navigation";
import type {
  CategoryPieChartCallbacks,
  MonthlyFlowChartCallbacks,
} from "@/lib/charts/chart-interaction";
import { compactAxisAmount, formatMonthKeyLabel } from "@/lib/charts/formatters";
import type { ChartCopy } from "@/lib/charts/chart-copy";
import { fundlyChartSubtitle, fundlyChartTitle } from "@/lib/charts/chart-copy";
import { exportDataChartEvents } from "@/lib/charts/export-data-menu";
import { CHART_COLORS } from "@/lib/charts/theme";
import type { CategorySlice, MonthlyCashFlowPoint } from "@/lib/charts/types";
import { formatMoney, formatPercent } from "@/lib/money";

const SERIES_ORDER = ["Income", "Expenses", "Saved", "Savings rate"] as const;

function flowSeriesName(name: string): FlowBarSeriesName | null {
  if (name === "Income" || name === "Expenses" || name === "Saved") return name;
  return null;
}

function pointClickOptions(
  callbacks: MonthlyFlowChartCallbacks | CategoryPieChartCallbacks | undefined,
  data: MonthlyCashFlowPoint[] | CategorySlice[],
  mode: "flow" | "pie",
): Highcharts.PlotSeriesOptions {
  if (!callbacks) return {};

  return {
    cursor: "pointer",
    point: {
      events: {
        click() {
          if (mode === "flow" && "onPointClick" in (callbacks as MonthlyFlowChartCallbacks)) {
            const row = (data as MonthlyCashFlowPoint[])[this.index];
            const series = flowSeriesName(this.series.name);
            if (row?.monthKey && series) {
              (callbacks as MonthlyFlowChartCallbacks).onPointClick?.({
                monthKey: row.monthKey,
                series,
              });
            }
          }
          if (mode === "pie" && "onSliceClick" in (callbacks as CategoryPieChartCallbacks)) {
            const slice = (data as CategorySlice[])[this.index];
            if (slice?.id) {
              (callbacks as CategoryPieChartCallbacks).onSliceClick?.(slice.id);
            }
          }
        },
      },
    },
  };
}

export function createMonthlyFlowBarOptions(
  data: MonthlyCashFlowPoint[],
  currency: string,
  height: number,
  copy: ChartCopy,
  callbacks?: MonthlyFlowChartCallbacks,
): Highcharts.Options {
  const categories = data.map((d) => d.label);

  return {
    chart: {
      type: "column",
      height,
      spacingTop: 4,
      spacingBottom: 6,
      events: exportDataChartEvents,
    },
    title: fundlyChartTitle(copy.title),
    subtitle: copy.subtitle ? fundlyChartSubtitle(copy.subtitle) : undefined,
    exporting: {
      chartOptions: {
        title: fundlyChartTitle(copy.title),
        subtitle: copy.subtitle ? fundlyChartSubtitle(copy.subtitle) : undefined,
      },
    },
    accessibility: {
      description:
        "Grouped column chart of monthly income, expenses, and savings. Click a bar to open that month in Incomes, Expenses, or Savings.",
    },
    legend: {
      enabled: true,
      align: "center",
      verticalAlign: "bottom",
    },
    xAxis: { categories, crosshair: true },
    yAxis: [
      {
        labels: {
          formatter() {
            return compactAxisAmount(Number(this.value), currency);
          },
        },
      },
      {
        title: { text: undefined },
        opposite: true,
        max: 100,
        min: 0,
        labels: {
          format: "{value}%",
          style: { color: "#a1a1aa", fontSize: "10px" },
        },
        gridLineWidth: 0,
      },
    ],
    plotOptions: {
      series: pointClickOptions(callbacks, data, "flow"),
      column: {
        borderRadius: 4,
        maxPointWidth: 32,
        groupPadding: 0.12,
      },
      line: {
        marker: { enabled: true, radius: 3 },
        lineWidth: 2,
      },
    },
    tooltip: {
      shared: true,
      useHTML: true,
      formatter() {
        const index = this.points?.[0]?.index ?? 0;
        const row = data[index];
        const title = row?.monthKey ? formatMonthKeyLabel(row.monthKey) : String(this.x ?? "");
        const savingsRate =
          row && row.income > 0 ? (row.savings / row.income) * 100 : null;

        const lines = [...(this.points ?? [])]
          .filter((p) => p.series.name !== "Savings rate")
          .sort(
            (a, b) =>
              SERIES_ORDER.indexOf(a.series.name as (typeof SERIES_ORDER)[number]) -
              SERIES_ORDER.indexOf(b.series.name as (typeof SERIES_ORDER)[number]),
          )
          .map((p) => {
            const y = Number(p.y);
            return `<span style="color:${p.color}">●</span> ${p.series.name}: <b>${formatMoney(y, currency)}</b>`;
          });

        if (savingsRate !== null) {
          lines.push(
            `<span style="color:${CHART_COLORS.savingsRate}">●</span> Savings rate: <b>${formatPercent(savingsRate, 1)}</b>`,
          );
        }

        const prev = index > 0 ? data[index - 1] : null;
        if (row && prev) {
          const delta = row.savings - prev.savings;
          const sign = delta >= 0 ? "+" : "";
          lines.push(
            `<span class="text-muted-foreground" style="opacity:0.85">Saved vs prior month: ${sign}${formatMoney(delta, currency)}</span>`,
          );
        }

        return `<span style="font-size:12px;font-weight:600">${title}</span><br/>${lines.join("<br/>")}<br/><span style="opacity:0.75;font-size:11px">Click a bar to open details</span>`;
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
        negativeColor: CHART_COLORS.expense,
      },
      {
        type: "line",
        name: "Savings rate",
        yAxis: 1,
        zIndex: 5,
        color: CHART_COLORS.savingsRate,
        connectNulls: false,
        enableMouseTracking: true,
        data: data.map((d) => (d.income > 0 ? Math.round((d.savings / d.income) * 1000) / 10 : null)),
        tooltip: {
          valueSuffix: "%",
          valueDecimals: 1,
        },
      },
    ],
  };
}

export function createCategoryPieOptions(
  slices: CategorySlice[],
  colors: string[],
  currency: string,
  height: number,
  total: number,
  copy: ChartCopy,
  callbacks?: CategoryPieChartCallbacks,
): Highcharts.Options {
  const piePointEvents = pointClickOptions(callbacks, slices, "pie");

  return {
    chart: {
      type: "pie",
      height,
      spacingTop: 4,
      spacingBottom: 4,
      events: exportDataChartEvents,
    },
    title: fundlyChartTitle(copy.title),
    subtitle: copy.subtitle ? fundlyChartSubtitle(copy.subtitle) : undefined,
    exporting: {
      chartOptions: {
        title: fundlyChartTitle(copy.title),
        subtitle: copy.subtitle ? fundlyChartSubtitle(copy.subtitle) : undefined,
      },
    },
    accessibility: {
      description:
        "Donut chart of spending by expense category. Click a slice or legend item to filter expenses.",
    },
    legend: {
      enabled: true,
      layout: "horizontal",
      align: "center",
      verticalAlign: "bottom",
      margin: 0,
      padding: 2,
      itemDistance: 10,
      itemMarginTop: 0,
      itemMarginBottom: 0,
      symbolHeight: 8,
      symbolWidth: 8,
      symbolRadius: 4,
      navigation: {
        enabled: slices.length > 4,
        arrowSize: 10,
      },
      itemStyle: { fontSize: "10px", fontWeight: "500" },
      labelFormatter() {
        const point = this as unknown as Highcharts.Point;
        const y = Number(point.y ?? 0);
        const pct = total > 0 ? (y / total) * 100 : 0;
        return `${point.name} · ${formatPercent(pct, 0)}`;
      },
    },
    plotOptions: {
      series: piePointEvents,
      pie: {
        center: ["50%", "46%"],
        size: "68%",
        innerSize: "54%",
        borderWidth: 0,
        dataLabels: { enabled: false },
        showInLegend: true,
        states: { hover: { halo: { size: 6 } } },
        point: piePointEvents.point,
        events: {
          legendItemClick() {
            const point = this as unknown as Highcharts.Point;
            const slice = slices[point.index];
            if (slice?.id) {
              callbacks?.onSliceClick?.(slice.id);
            }
            return false;
          },
        },
      },
    },
    tooltip: {
      useHTML: true,
      pointFormatter() {
        const y = Number(this.y);
        const pct = total > 0 ? (y / total) * 100 : 0;
        return `<span style="color:${this.color}">●</span> ${this.name}: <b>${formatMoney(y, currency)}</b> (${formatPercent(pct, 1)})`;
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
          id: slice.id,
        })),
      },
    ],
  };
}
