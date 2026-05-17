import type HighchartsType from "highcharts";

/** Fundly export menu — set once after export-data module loads (it auto-pushes otherwise). */
export const FUNDLY_EXPORT_MENU_ITEMS = [
  "downloadPNG",
  "downloadJPEG",
  "downloadCSV",
  "viewData",
] as const;

/** Replace context menu items with a fresh array so export-data cannot append duplicates. */
export function applyFundlyExportMenu(Highcharts: typeof HighchartsType): void {
  Highcharts.setOptions({
    exporting: {
      buttons: {
        contextButton: {
          menuItems: [...FUNDLY_EXPORT_MENU_ITEMS],
        },
      },
    },
  });
}
