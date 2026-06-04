import { cookies } from "next/headers";
import {
  getDefaultSerializedPeriod,
  normalizePeriodPreset,
  parsePeriodFromSearchParams,
  serializePeriod,
  type SerializedPeriod,
} from "@/lib/period";
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

/** URL params when present; otherwise defaults to this month (not the period cookie). */
export async function resolveAppPeriod(
  sp: PeriodSearchParams | null | undefined,
): Promise<SerializedPeriod> {
  if (hasPeriodInSearchParams(sp)) {
    return serializePeriod(normalizePeriodPreset(parsePeriodFromSearchParams(sp)));
  }
  return getDefaultSerializedPeriod();
}
