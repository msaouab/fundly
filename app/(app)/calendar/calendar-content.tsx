import { auth } from "@/auth";
import { fetchCalendarPageData } from "@/lib/calendar/queries";
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

  const { year, month } = parseMonthParam(monthParam);
  const data = await fetchCalendarPageData(userId, year, month);

  return <CalendarView {...data} />;
}
