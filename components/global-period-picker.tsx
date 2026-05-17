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
import {
  periodQueryFromCookieDocument,
  periodQueryFromSearchParams,
} from "@/lib/period-url";

function resolveClientPeriod(searchParams: URLSearchParams) {
  const sp = {
    period: searchParams.get("period") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    month: searchParams.get("month") ?? undefined,
  };
  if (hasPeriodInSearchParams(sp)) {
    return serializePeriod(parsePeriodFromSearchParams(sp));
  }
  const fromCookie = readPeriodCookieClient();
  if (fromCookie) return fromCookie;
  return serializePeriod(parsePeriodFromSearchParams(null));
}

export function GlobalPeriodPicker() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const period = useMemo(
    () => resolveClientPeriod(searchParams),
    [searchParams],
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

/** For nav links: period query from URL or cookie. */
export function usePeriodNavQuery(): string | null {
  const searchParams = useSearchParams();
  return useMemo(() => {
    const fromUrl = periodQueryFromSearchParams(searchParams);
    if (fromUrl) return fromUrl;
    return periodQueryFromCookieDocument();
  }, [searchParams]);
}
