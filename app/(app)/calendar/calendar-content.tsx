import { cookies } from "next/headers";
import { auth } from "@/auth";
import { fetchCalendarPageData } from "@/lib/calendar/queries";
import {
  CALENDAR_MONTH_COOKIE_NAME,
  parseCalendarMonthCookieValue,
} from "@/lib/calendar-month-storage";
import { parseMonthParam } from "@/lib/month";
import { CalendarView } from "./_components";

export async function CalendarPageContent({
  monthParam,
}: {
  monthParam: string | undefined;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const cookieMonth = parseCalendarMonthCookieValue(
    (await cookies()).get(CALENDAR_MONTH_COOKIE_NAME)?.value,
  );
  const { year, month } = parseMonthParam(monthParam ?? cookieMonth);
  const data = await fetchCalendarPageData(userId, year, month);

  return <CalendarView {...data} />;
}
