"use client";

import { format, parseISO } from "date-fns";
import type {
  CalendarDayCell,
  SerializedHoliday,
  SerializedPlannedEvent,
  SerializedYearlyEvent,
} from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type CalendarMonthGridProps = {
  days: CalendarDayCell[];
  onDayClick?: (
    date: string,
    holidays: SerializedHoliday[],
    events: SerializedPlannedEvent[],
    yearlyEvents: SerializedYearlyEvent[],
  ) => void;
  onHolidayClick?: (holiday: SerializedHoliday, date: string) => void;
  onYearlyClick?: (event: SerializedYearlyEvent) => void;
};

export function CalendarMonthGrid({
  days,
  onDayClick,
  onHolidayClick,
  onYearlyClick,
}: CalendarMonthGridProps) {
  return (
    <div className="rounded-xl border border-border bg-card dark:border-zinc-800">
      <div className="mb-2 flex flex-wrap gap-3 px-3 pt-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="size-2 rounded bg-amber-500/40" /> Holiday
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded bg-teal-500/40" /> Planned
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded bg-rose-500/40" /> Birthday / yearly
        </span>
      </div>
      <div className="grid grid-cols-7 border-b border-t border-border dark:border-zinc-800">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="px-1 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((cell) => {
          const itemCount =
            cell.holidays.length + cell.events.length + cell.yearlyEvents.length;
          return (
            <button
              key={cell.date}
              type="button"
              onClick={() =>
                onDayClick?.(cell.date, cell.holidays, cell.events, cell.yearlyEvents)
              }
              className={cn(
                "min-h-[88px] border-b border-r border-border p-1.5 text-left transition hover:bg-muted/50 dark:border-zinc-800",
                !cell.inMonth && "bg-muted/30 text-muted-foreground",
                cell.isToday && cell.inMonth && "ring-1 ring-inset ring-teal-600/50",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
                  cell.isToday && cell.inMonth && "bg-teal-700 text-white dark:bg-teal-600",
                )}
              >
                {cell.day}
              </span>
              <div className="mt-1 space-y-0.5">
                {cell.yearlyEvents.slice(0, 2).map((y) => (
                  <span
                    key={`${y.id}-${y.occurrenceDate}`}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onYearlyClick?.(y);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        onYearlyClick?.(y);
                      }
                    }}
                    className="block truncate rounded bg-rose-500/15 px-1 py-0.5 text-[10px] leading-tight text-rose-900 dark:text-rose-200"
                    title={
                      y.ageTurning != null
                        ? `${y.title} (turning ${y.ageTurning})`
                        : y.title
                    }
                  >
                    🎂 {y.title}
                    {y.ageTurning != null ? ` (${y.ageTurning})` : ""}
                  </span>
                ))}
                {cell.holidays.slice(0, 2).map((h) => (
                  <span
                    key={h.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onHolidayClick?.(h, cell.date);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        onHolidayClick?.(h, cell.date);
                      }
                    }}
                    className={cn(
                      "block truncate rounded px-1 py-0.5 text-[10px] leading-tight",
                      h.type === "RELIGIOUS"
                        ? "bg-violet-500/15 text-violet-800 dark:text-violet-300"
                        : h.type === "OBSERVANCE"
                          ? "bg-sky-500/15 text-sky-800 dark:text-sky-300"
                          : "bg-amber-500/15 text-amber-900 dark:text-amber-300",
                    )}
                    title={h.name}
                  >
                    {h.name}
                  </span>
                ))}
                {cell.events.slice(0, 1).map((ev) => (
                  <span
                    key={ev.id}
                    className="block truncate rounded bg-teal-500/15 px-1 py-0.5 text-[10px] leading-tight text-teal-900 dark:text-teal-200"
                    title={ev.title}
                  >
                    {ev.title}
                  </span>
                ))}
                {itemCount > 4 ? (
                  <span className="text-[10px] text-muted-foreground">+{itemCount - 4} more</span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function formatMonthTitle(year: number, month: number): string {
  return format(new Date(year, month - 1, 1), "MMMM yyyy");
}

export function formatDayLabel(isoDate: string): string {
  return format(parseISO(isoDate.slice(0, 10)), "MMM d, yyyy");
}
