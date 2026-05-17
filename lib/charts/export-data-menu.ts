import type Highcharts from "highcharts";

function dataTableMenuLabel(chart: Highcharts.Chart, visible: boolean): string {
  const lang = chart.options.lang;
  return visible
    ? (lang?.hideData ?? "Hide data table")
    : (lang?.viewData ?? "View data table");
}

type ExportingWithDataTable = NonNullable<Highcharts.Chart["exporting"]> & {
  isDataTableVisible?: boolean;
  dataTableDiv?: HTMLElement;
  divElements?: HTMLElement[];
};

function isDataTableVisible(exporting: NonNullable<Highcharts.Chart["exporting"]>): boolean {
  const state = exporting as ExportingWithDataTable;
  if (typeof state.isDataTableVisible === "boolean") return state.isDataTableVisible;
  return state.dataTableDiv?.style.display !== "none";
}

/** Keep export menu label in sync when separators skew divElements indices. */
export function syncExportDataMenuLabel(chart: Highcharts.Chart): void {
  const exporting = chart.exporting as ExportingWithDataTable | undefined;
  if (!exporting) return;

  const label = dataTableMenuLabel(chart, isDataTableVisible(exporting));
  const menuItems = chart.options.exporting?.buttons?.contextButton?.menuItems ?? [];
  const viewIndex = menuItems.indexOf("viewData");
  const byIndex = viewIndex >= 0 ? exporting.divElements?.[viewIndex] : undefined;

  if (byIndex) {
    byIndex.textContent = label;
    return;
  }

  const match = exporting.divElements?.find((node) =>
    /view data table|hide data table/i.test(node.textContent ?? ""),
  );
  if (match) match.textContent = label;
}

export const exportDataChartEvents = {
  afterViewData(this: Highcharts.Chart) {
    syncExportDataMenuLabel(this);
  },
  afterHideData(this: Highcharts.Chart) {
    syncExportDataMenuLabel(this);
  },
} as Highcharts.ChartEventsOptions;
