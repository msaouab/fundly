"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Cake, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { CalendarMonthNav } from "@/components/calendar-month-nav";
import type {
  CalendarPageData,
  SerializedHoliday,
  SerializedPlannedEvent,
  SerializedYearlyEvent,
} from "@/lib/calendar/types";
import { writeCalendarMonthCookie } from "@/lib/calendar-month-storage";
import { addMonths, formatMonthKey } from "@/lib/month";
import { AppPage, AppPageHeader, AppPageSection } from "@/components/ledger-page-layout";
import { cn } from "@/lib/utils";
import { CalendarAnalyticsPanel } from "./calendar-analytics";
import { CalendarMonthGrid } from "./calendar-month-grid";
import { EventPlanDialog } from "./event-plan-dialog";
import { YearlyEventDialog } from "./yearly-event-dialog";
import { YearlyEventsPanel } from "./yearly-events-panel";

type CalendarViewProps = CalendarPageData;

export function CalendarView(props: CalendarViewProps) {
  const { year, month } = props;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [yearlyDialogOpen, setYearlyDialogOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [yearlyFormKey, setYearlyFormKey] = useState(0);
  const [selectedHoliday, setSelectedHoliday] = useState<SerializedHoliday | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<SerializedPlannedEvent | null>(null);
  const [selectedYearly, setSelectedYearly] = useState<SerializedYearlyEvent | null>(null);
  const [defaultStartDate, setDefaultStartDate] = useState<string | undefined>();
  const [defaultYearlyMonth, setDefaultYearlyMonth] = useState<number | undefined>();
  const [defaultYearlyDay, setDefaultYearlyDay] = useState<number | undefined>();

  const monthKey = useMemo(() => formatMonthKey(year, month), [year, month]);

  const goToMonth = useCallback(
    (key: string) => {
      writeCalendarMonthCookie(key);
      startTransition(() => {
        router.push(`/calendar?month=${key}`, { scroll: false });
      });
    },
    [router],
  );

  useEffect(() => {
    writeCalendarMonthCookie(monthKey);
  }, [monthKey]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === "ArrowLeft" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const prev = addMonths(year, month, -1);
        goToMonth(formatMonthKey(prev.year, prev.month));
      }
      if (e.key === "ArrowRight" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const next = addMonths(year, month, 1);
        goToMonth(formatMonthKey(next.year, next.month));
      }
      if ((e.key === "t" || e.key === "T") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const now = new Date();
        goToMonth(formatMonthKey(now.getFullYear(), now.getMonth() + 1));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goToMonth, year, month]);

  function openNewPlan(start?: string) {
    setSelectedEvent(null);
    setSelectedHoliday(null);
    setDefaultStartDate(start);
    setFormKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openFromHoliday(holiday: SerializedHoliday) {
    const existing = props.analytics.events.find((e) => e.sourceHolidayId === holiday.id);
    if (existing) {
      setSelectedEvent(existing);
      setSelectedHoliday(null);
    } else {
      setSelectedEvent(null);
      setSelectedHoliday(holiday);
    }
    setDefaultStartDate(holiday.date);
    setFormKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openFromEvent(event: SerializedPlannedEvent) {
    setSelectedEvent(event);
    setSelectedHoliday(null);
    setDefaultStartDate(event.startDate);
    setFormKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openYearly(
    event?: SerializedYearlyEvent | null,
    month?: number,
    day?: number,
  ) {
    setSelectedYearly(event ?? null);
    setDefaultYearlyMonth(month ?? event?.month);
    setDefaultYearlyDay(day ?? event?.day);
    setYearlyFormKey((k) => k + 1);
    setYearlyDialogOpen(true);
  }

  function parseDateParts(iso: string): { month: number; day: number } {
    const [, m, d] = iso.slice(0, 10).split("-").map(Number);
    return { month: m!, day: d! };
  }

  return (
    <AppPage size="6xl">
      <AppPageHeader
        title="Calendar"
        description="Public holidays, yearly birthdays & anniversaries, and budgeted trips — all in one place."
        actions={
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <CalendarMonthNav
            year={year}
            month={month}
            monthKey={monthKey}
            onMonthKeyChange={goToMonth}
            disabled={isPending}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openYearly()}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-medium text-rose-800 hover:bg-rose-100 sm:flex-none dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200 dark:hover:bg-rose-950"
            >
              <Cake className="size-4" aria-hidden />
              Birthday
            </button>
            <button
              type="button"
              onClick={() => openNewPlan()}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-3 text-sm font-medium text-white hover:bg-teal-800 sm:flex-none dark:bg-teal-600"
            >
              <Plus className="size-4" aria-hidden />
              Plan event
            </button>
          </div>
          </div>
        }
      />

      <AppPageSection
        className={cn(
          "grid gap-6 transition-opacity duration-200 lg:grid-cols-3",
          isPending && "pointer-events-none opacity-60",
        )}
      >
        <div className="space-y-6 lg:col-span-2">
          <CalendarMonthGrid
            days={props.days}
            onHolidayClick={(h) => openFromHoliday(h)}
            onYearlyClick={(y) => openYearly(y)}
            onDayClick={(date, holidays, events, yearlyEvents) => {
              if (yearlyEvents[0]) {
                openYearly(yearlyEvents[0]);
                return;
              }
              if (events[0]) {
                openFromEvent(events[0]);
                return;
              }
              if (holidays[0]) {
                openFromHoliday(holidays[0]);
                return;
              }
              const { month, day } = parseDateParts(date);
              openYearly(null, month, day);
            }}
          />
          <CalendarAnalyticsPanel analytics={props.analytics} />
        </div>

        <div className="space-y-6">
          <YearlyEventsPanel
            events={props.yearlyEvents}
            monthEvents={props.monthYearlyEvents}
            onSelect={(e) => openYearly(e)}
            onAdd={() => openYearly()}
          />

          {props.holidays.length > 0 ? (
            <section className="rounded-xl border border-border p-4 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-foreground">Holidays this month</h2>
              <ul className="mt-2 space-y-1.5">
                {props.holidays.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => openFromHoliday(h)}
                      className="text-sm text-teal-700 hover:underline dark:text-teal-400"
                    >
                      {h.name}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {h.date.slice(0, 10)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </AppPageSection>

      <EventPlanDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        formKey={formKey}
        currency={props.currency}
        holiday={selectedHoliday}
        event={selectedEvent}
        defaultStartDate={defaultStartDate}
        onSaved={() => router.refresh()}
      />

      <YearlyEventDialog
        open={yearlyDialogOpen}
        onOpenChange={setYearlyDialogOpen}
        formKey={yearlyFormKey}
        currency={props.currency}
        event={selectedYearly}
        defaultMonth={defaultYearlyMonth}
        defaultDay={defaultYearlyDay}
        onSaved={() => router.refresh()}
      />
    </AppPage>
  );
}
