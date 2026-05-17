"use client";

import { createContext, useContext } from "react";
import type { SerializedPeriod } from "@/lib/period";

type PeriodNavState = {
  initialPeriodQuery: string | null;
  initialPeriod: SerializedPeriod | null;
};

const PeriodNavContext = createContext<PeriodNavState>({
  initialPeriodQuery: null,
  initialPeriod: null,
});

export function PeriodNavProvider({
  initialPeriodQuery,
  initialPeriod,
  children,
}: {
  initialPeriodQuery: string | null;
  initialPeriod: SerializedPeriod | null;
  children: React.ReactNode;
}) {
  return (
    <PeriodNavContext.Provider value={{ initialPeriodQuery, initialPeriod }}>
      {children}
    </PeriodNavContext.Provider>
  );
}

export function usePeriodNavState() {
  return useContext(PeriodNavContext);
}
