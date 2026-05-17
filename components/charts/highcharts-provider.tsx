"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";
import type { ChartColorScheme } from "@/lib/charts/theme";

export function HighchartsProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const scheme: ChartColorScheme = resolvedTheme === "light" ? "light" : "dark";
    void import("@/lib/charts/theme").then(({ applyFundlyChartTheme }) => {
      applyFundlyChartTheme(scheme);
    });
  }, [resolvedTheme]);

  return children;
}
