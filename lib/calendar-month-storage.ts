export const CALENDAR_MONTH_COOKIE_NAME = "fundly-calendar-month";
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 400;

const MONTH_KEY_RE = /^\d{4}-\d{2}$/;

export function isValidMonthKey(value: string | undefined | null): value is string {
  if (!value || !MONTH_KEY_RE.test(value)) return false;
  const [, ms] = value.split("-");
  const m = Number(ms);
  return m >= 1 && m <= 12;
}

export function parseCalendarMonthCookieValue(
  raw: string | undefined | null,
): string | null {
  if (!isValidMonthKey(raw ?? undefined)) return null;
  return raw!;
}

export function readCalendarMonthCookieClient(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CALENDAR_MONTH_COOKIE_NAME}=`));
  if (!match) return null;
  return parseCalendarMonthCookieValue(
    decodeURIComponent(match.slice(`${CALENDAR_MONTH_COOKIE_NAME}=`.length)),
  );
}

export function writeCalendarMonthCookie(monthKey: string) {
  if (!isValidMonthKey(monthKey) || typeof document === "undefined") return;
  document.cookie = `${CALENDAR_MONTH_COOKIE_NAME}=${encodeURIComponent(monthKey)}; path=/; max-age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
}
