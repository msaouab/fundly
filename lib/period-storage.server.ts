import { cookies } from "next/headers";
import { parsePeriodFromSearchParams, serializePeriod, type SerializedPeriod } from "@/lib/period";
import {
  hasPeriodInSearchParams,
  parsePeriodCookieValue,
  PERIOD_COOKIE_NAME,
  type PeriodSearchParams,
} from "@/lib/period-storage";

export async function readPeriodCookie(): Promise<SerializedPeriod | null> {
  const raw = (await cookies()).get(PERIOD_COOKIE_NAME)?.value;
  return parsePeriodCookieValue(raw);
}

/** URL params override cookie; cookie applies when navigating without query params. */
export async function resolveAppPeriod(
  sp: PeriodSearchParams | null | undefined,
): Promise<SerializedPeriod> {
  if (hasPeriodInSearchParams(sp)) {
    return serializePeriod(parsePeriodFromSearchParams(sp));
  }
  const fromCookie = await readPeriodCookie();
  if (fromCookie) return fromCookie;
  return serializePeriod(parsePeriodFromSearchParams(null));
}
