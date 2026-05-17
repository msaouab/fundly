import Highcharts from "highcharts";
import accessibilityModule from "highcharts/modules/accessibility";

type HighchartsModule = (hc: typeof Highcharts) => void;

let initialized = false;

function initModules(): typeof Highcharts {
  if (!initialized) {
    const loadModule = accessibilityModule as unknown as HighchartsModule;
    if (typeof loadModule === "function") {
      loadModule(Highcharts);
    }
    initialized = true;
  }
  return Highcharts;
}

/** Singleton Highcharts instance with Fundly modules loaded. */
export function getHighcharts(): typeof Highcharts {
  return initModules();
}
