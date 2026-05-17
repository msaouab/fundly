import {
  deserializeSerializedPeriod,
  serializePeriod,
  type SerializedPeriod,
} from "@/lib/period";

export const PERIOD_COOKIE_NAME = "fundly-period";
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 400;

export type PeriodSearchParams = {
  month?: string;
  period?: string;
  from?: string;
  to?: string;
};

export function hasPeriodInSearchParams(sp: PeriodSearchParams | null | undefined): boolean {
  if (!sp) return false;
  if (sp.period?.trim()) return true;
  if (sp.from?.trim() && sp.to?.trim()) return true;
  if (sp.month?.trim()) return true;
  return false;
}

export function parsePeriodCookieValue(raw: string | undefined | null): SerializedPeriod | null {
  if (!raw) return null;
  try {
    const json = JSON.parse(decodeURIComponent(raw)) as {
      preset?: SerializedPeriod["preset"];
      from?: string;
      to?: string;
    };
    if (!json.preset || !json.from || !json.to) return null;
    const key =
      json.preset !== "custom" ? json.preset : `custom:${json.from}:${json.to}`;
    return serializePeriod(
      deserializeSerializedPeriod({
        key,
        label: "",
        from: json.from,
        to: json.to,
        preset: json.preset,
        monthCount: 1,
      }),
    );
  } catch {
    return null;
  }
}

export function periodToCookieValue(period: SerializedPeriod): string {
  return encodeURIComponent(
    JSON.stringify({
      preset: period.preset,
      from: period.from,
      to: period.to,
    }),
  );
}

/** Client-side: persist period for cross-page navigation. */
export function writePeriodCookie(period: SerializedPeriod): void {
  const value = periodToCookieValue(period);
  document.cookie = `${PERIOD_COOKIE_NAME}=${value}; path=/; max-age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
}

export function readPeriodCookieClient(): SerializedPeriod | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${PERIOD_COOKIE_NAME}=`));
  if (!match) return null;
  return parsePeriodCookieValue(match.slice(PERIOD_COOKIE_NAME.length + 1));
}
