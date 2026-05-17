"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { DateRangePicker } from "@/components/date-range-picker";
import { isPeriodAwareRoute } from "@/lib/period-routes";
import { parsePeriodFromSearchParams, serializePeriod } from "@/lib/period";
import {
  hasPeriodInSearchParams,
  readPeriodCookieClient,
  writePeriodCookie,
} from "@/lib/period-storage";
import { periodQueryFromSearchParams } from "@/lib/period-url";
import { usePeriodNavState } from "@/components/period-nav-provider";
import type { SerializedPeriod } from "@/lib/period";

function resolvePeriod(
  searchParams: URLSearchParams,
  initialPeriod: SerializedPeriod | null,
) {
  const sp = {
    period: searchParams.get("period") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    month: searchParams.get("month") ?? undefined,
  };
  if (hasPeriodInSearchParams(sp)) {
    return serializePeriod(parsePeriodFromSearchParams(sp));
  }
  if (initialPeriod) return initialPeriod;
  const fromCookie = readPeriodCookieClient();
  if (fromCookie) return fromCookie;
  return serializePeriod(parsePeriodFromSearchParams(null));
}

export function GlobalPeriodPicker() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { initialPeriod } = usePeriodNavState();

  const period = useMemo(
    () => resolvePeriod(searchParams, initialPeriod),
    [searchParams, initialPeriod],
  );

  if (!isPeriodAwareRoute(pathname)) {
    return null;
  }

  return (
    <DateRangePicker
      period={period}
      ariaLabel="Select date range for the app"
      triggerClassName="w-full sm:w-[min(100%,280px)]"
      onPeriodChange={(qs) => {
        const next = serializePeriod(
          parsePeriodFromSearchParams(Object.fromEntries(new URLSearchParams(qs))),
        );
        writePeriodCookie(next);
        const base = pathname === "/" ? "/" : pathname;
        router.push(`${base}?${qs}`, { scroll: false });
      }}
    />
  );
}

/** For nav links: period query from URL or server-provided cookie snapshot. */
export function usePeriodNavQuery(): string | null {
  const searchParams = useSearchParams();
  const { initialPeriodQuery } = usePeriodNavState();
  return useMemo(() => {
    const fromUrl = periodQueryFromSearchParams(searchParams);
    if (fromUrl) return fromUrl;
    return initialPeriodQuery;
  }, [searchParams, initialPeriodQuery]);
}
