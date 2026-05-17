import type { ReadonlyURLSearchParams } from "next/navigation";
import { periodToQueryString, deserializeSerializedPeriod, type SerializedPeriod } from "@/lib/period";
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

export function hrefWithPeriod(href: string, periodQuery: string | null): string {
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
