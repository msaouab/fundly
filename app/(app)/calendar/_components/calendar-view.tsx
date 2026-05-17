"use client";

import { useMemo, useState } from "react";
import { Cake, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import type {
  CalendarPageData,
  SerializedHoliday,
  SerializedPlannedEvent,
  SerializedYearlyEvent,
} from "@/lib/calendar/types";
import { addMonths, formatMonthKey } from "@/lib/month";
import { CalendarAnalyticsPanel } from "./calendar-analytics";
import { CalendarMonthGrid, formatMonthTitle } from "./calendar-month-grid";
import { EventPlanDialog } from "./event-plan-dialog";
import { YearlyEventDialog } from "./yearly-event-dialog";
import { YearlyEventsPanel } from "./yearly-events-panel";

type CalendarViewProps = CalendarPageData;

export function CalendarView(props: CalendarViewProps) {
  const router = useRouter();
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

  const monthTitle = useMemo(
    () => formatMonthTitle(props.year, props.month),
    [props.year, props.month],
  );

  function goMonth(delta: number) {
    const next = addMonths(props.year, props.month, delta);
    router.push(`/calendar?month=${formatMonthKey(next.year, next.month)}`, { scroll: false });
  }

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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Public holidays, yearly birthdays & anniversaries, and budgeted trips — all in one
            place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-border dark:border-zinc-800">
            <button
              type="button"
              onClick={() => goMonth(-1)}
              className="inline-flex size-9 items-center justify-center rounded-l-lg hover:bg-muted"
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-36 px-2 text-center text-sm font-medium">{monthTitle}</span>
            <button
              type="button"
              onClick={() => goMonth(1)}
              className="inline-flex size-9 items-center justify-center rounded-r-lg hover:bg-muted"
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => openYearly()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-medium text-rose-800 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200 dark:hover:bg-rose-950"
          >
            <Cake className="size-4" aria-hidden />
            Birthday
          </button>
          <button
            type="button"
            onClick={() => openNewPlan()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-teal-700 px-3 text-sm font-medium text-white hover:bg-teal-800 dark:bg-teal-600"
          >
            <Plus className="size-4" aria-hidden />
            Plan event
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
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
      </div>

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
    </div>
  );
}
