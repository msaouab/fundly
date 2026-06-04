"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { DateRangePicker } from "@/components/date-range-picker";
import { isPeriodAwareRoute } from "@/lib/period-routes";
import {
  deserializeSerializedPeriod,
  getDefaultSerializedPeriod,
  normalizePeriodPreset,
  parsePeriodFromSearchParams,
  periodToQueryString,
  serializePeriod,
} from "@/lib/period";
import { hasPeriodInSearchParams, writePeriodCookie } from "@/lib/period-storage";
import { periodQueryFromSearchParams } from "@/lib/period-url";
import { usePeriodNavState } from "@/components/period-nav-provider";
import type { SerializedPeriod } from "@/lib/period";

function searchParamsToPeriodInput(searchParams: URLSearchParams) {
  return {
    period: searchParams.get("period") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    month: searchParams.get("month") ?? undefined,
  };
}

function resolvePeriod(searchParams: URLSearchParams) {
  const sp = searchParamsToPeriodInput(searchParams);
  if (hasPeriodInSearchParams(sp)) {
    return serializePeriod(normalizePeriodPreset(parsePeriodFromSearchParams(sp)));
  }
  return getDefaultSerializedPeriod();
}

export function GlobalPeriodPicker() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const period = useMemo(() => resolvePeriod(searchParams), [searchParams]);

  const showPicker = isPeriodAwareRoute(pathname);

  useEffect(() => {
    if (!showPicker) return;
    const sp = searchParamsToPeriodInput(searchParams);
    if (hasPeriodInSearchParams(sp)) return;
    const defaultPeriod = getDefaultSerializedPeriod();
    writePeriodCookie(defaultPeriod);
    const base = pathname === "/" ? "/" : pathname;
    const qs = periodToQueryString(deserializeSerializedPeriod(defaultPeriod));
    router.replace(`${base}?${qs}`, { scroll: false });
  }, [showPicker, pathname, searchParams, router]);

  if (!showPicker) {
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
