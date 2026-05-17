import { cookies } from "next/headers";
import type { SerializedPeriod } from "@/lib/period";
import {
  PERIOD_COOKIE_NAME,
  parsePeriodCookieValue,
} from "@/lib/period-storage";
import { periodQueryFromSerialized } from "@/lib/period-url";

/** Read persisted period from request cookies (server components only). */
export async function readSerializedPeriodFromCookies(): Promise<SerializedPeriod | null> {
  const raw = (await cookies()).get(PERIOD_COOKIE_NAME)?.value;
  return parsePeriodCookieValue(raw);
}

export async function readPeriodNavQueryFromCookies(): Promise<string | null> {
  const serialized = await readSerializedPeriodFromCookies();
  if (!serialized) return null;
  return periodQueryFromSerialized(serialized);
}
