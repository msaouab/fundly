import type { ReadonlyURLSearchParams } from "next/navigation";
import {
  deserializeSerializedPeriod,
  parsePeriodFromSearchParams,
  periodToQueryString,
  type SerializedPeriod,
} from "@/lib/period";
import { formatMonthKey } from "@/lib/month";
import { parsePeriodCookieValue } from "@/lib/period-storage";

export function periodQueryFromSearchParams(
  searchParams: ReadonlyURLSearchParams | URLSearchParams,
): string | null {
  const period = searchParams.get("period");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const month = searchParams.get("month");

  if (period?.trim()) return `period=${encodeURIComponent(period.trim())}`;
  if (from?.trim() && to?.trim()) {
    return `from=${encodeURIComponent(from.trim())}&to=${encodeURIComponent(to.trim())}`;
  }
  if (month?.trim()) return `month=${encodeURIComponent(month.trim())}`;
  return null;
}

export function periodQueryFromSerialized(period: SerializedPeriod): string {
  return periodToQueryString(deserializeSerializedPeriod(period));
}

/** Best `month=YYYY-MM` for calendar links from a period query string. */
export function calendarMonthFromPeriodQuery(periodQuery: string | null): string | null {
  if (!periodQuery?.trim()) return null;
  const sp = Object.fromEntries(new URLSearchParams(periodQuery));
  if (sp.month?.trim() && /^\d{4}-\d{2}$/.test(sp.month.trim())) {
    return sp.month.trim();
  }
  const period = parsePeriodFromSearchParams(sp);
  if (
    period.preset === "next_month" ||
    period.preset === "this_month" ||
    period.preset === "last_month" ||
    (period.start.getFullYear() === period.end.getFullYear() &&
      period.start.getMonth() === period.end.getMonth())
  ) {
    return formatMonthKey(period.start.getFullYear(), period.start.getMonth() + 1);
  }
  return null;
}

export function hrefWithPeriod(href: string, periodQuery: string | null): string {
  if (href === "/calendar") {
    const month = calendarMonthFromPeriodQuery(periodQuery);
    return month ? `/calendar?month=${encodeURIComponent(month)}` : "/calendar";
  }
  if (!periodQuery) return href;
  if (href === "/") return `/?${periodQuery}`;
  return `${href}?${periodQuery}`;
}

export function periodQueryFromCookieDocument(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("fundly-period="));
  if (!match) return null;
  const serialized = parsePeriodCookieValue(match.slice("fundly-period=".length));
  if (!serialized) return null;
  return periodQueryFromSerialized(serialized);
}
