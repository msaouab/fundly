"use client";

import { useEffect } from "react";

export function HighchartsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void import("@/lib/charts/theme").then(({ applyFundlyChartTheme }) => {
      applyFundlyChartTheme();
    });
  }, []);

  return children;
}
