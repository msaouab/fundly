import Highcharts from "highcharts";
import accessibilityModule from "highcharts/modules/accessibility";
import exportingModule from "highcharts/modules/exporting";
import { applyFundlyExportMenu } from "@/lib/charts/export-menu";

type HighchartsModule = (hc: typeof Highcharts) => void;

let coreInitialized = false;
let exportDataLoaded = false;
let exportMenuApplied = false;
let exportDataPromise: Promise<void> | null = null;

function loadModule(mod: unknown): void {
  const load = mod as HighchartsModule;
  if (typeof load === "function") {
    load(Highcharts);
  }
}

function initCoreModules(): void {
  if (coreInitialized) return;
  loadModule(exportingModule);
  loadModule(accessibilityModule);
  coreInitialized = true;
}

/**
 * export-data must load after exporting. It mutates `menuItems` on init;
 * we reset the menu immediately after with a fresh array.
 */
function loadExportDataModule(): Promise<void> {
  if (exportDataLoaded) return Promise.resolve();
  if (!exportDataPromise) {
    exportDataPromise = import("highcharts/modules/export-data").then((mod) => {
      loadModule(mod.default);
      exportDataLoaded = true;
      if (!exportMenuApplied) {
        applyFundlyExportMenu(Highcharts);
        exportMenuApplied = true;
      }
    });
  }
  return exportDataPromise;
}

/** Load all chart modules and apply the Fundly export menu (call before first chart render). */
export async function ensureChartModules(): Promise<typeof Highcharts> {
  initCoreModules();
  await loadExportDataModule();
  return Highcharts;
}
