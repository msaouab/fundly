"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  dateRangeLocal,
  parsePeriodFromSearchParams,
  PERIOD_PRESETS,
  periodToQueryString,
  type DatePeriod,
  type PeriodPreset,
  type SerializedPeriod,
} from "@/lib/period";
import { cn } from "@/lib/utils";

type DateRangePickerProps = {
  period: SerializedPeriod;
  onPeriodChange: (queryString: string) => void;
  triggerClassName?: string;
  ariaLabel?: string;
};

type RangeEnd = "start" | "end";

function serializedToPeriod(serialized: SerializedPeriod): DatePeriod {
  const from = new Date(`${serialized.from}T12:00:00`);
  const to = new Date(`${serialized.to}T12:00:00`);
  const { start, end } = dateRangeLocal(from, to);
  return {
    preset: serialized.preset,
    start,
    end,
    label: serialized.label,
  };
}

function rangeFromSerialized(serialized: SerializedPeriod): DateRange {
  const p = serializedToPeriod(serialized);
  return { from: p.start, to: p.end };
}

function normalizeRange(range: DateRange | undefined): DateRange | undefined {
  if (!range?.from) return undefined;
  const from = range.from;
  const to = range.to ?? from;
  if (to < from) return { from: to, to: from };
  return { from, to };
}

export function DateRangePicker({
  period: serialized,
  onPeriodChange,
  triggerClassName,
  ariaLabel = "Select date range",
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [customRange, setCustomRange] = useState<DateRange | undefined>(() =>
    rangeFromSerialized(serialized),
  );
  const [activeEnd, setActiveEnd] = useState<RangeEnd>("start");

  const triggerLabel = useMemo(() => serialized.label, [serialized.label]);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setCustomRange(rangeFromSerialized(serialized));
      setActiveEnd("start");
    }
    setOpen(nextOpen);
  }

  function applyPreset(preset: PeriodPreset) {
    const next = parsePeriodFromSearchParams({ period: preset });
    onPeriodChange(periodToQueryString(next));
    setOpen(false);
  }

  function applyCustomRange() {
    const normalized = normalizeRange(customRange);
    if (!normalized?.from) return;
    const to = normalized.to ?? normalized.from;
    const { start, end } = dateRangeLocal(normalized.from, to);
    onPeriodChange(
      periodToQueryString({
        preset: "custom",
        start,
        end,
        label: "",
      }),
    );
    setOpen(false);
  }

  function clearCustomRange() {
    setCustomRange(undefined);
    setActiveEnd("start");
  }

  function selectDay(day: Date | undefined) {
    if (!day) return;
    if (activeEnd === "start") {
      setCustomRange((prev) => {
        const nextTo = prev?.to && prev.to >= day ? prev.to : day;
        return { from: day, to: nextTo };
      });
      setActiveEnd("end");
      return;
    }
    setCustomRange((prev) => {
      const nextFrom = prev?.from && prev.from <= day ? prev.from : day;
      return { from: nextFrom, to: day };
    });
  }

  const activeDate = activeEnd === "start" ? customRange?.from : (customRange?.to ?? customRange?.from);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("w-[min(100%,280px)] justify-start text-left font-normal", triggerClassName)}
          aria-label={ariaLabel}
        >
          <CalendarIcon className="mr-2 size-4 shrink-0 opacity-70" aria-hidden />
          <span className="truncate">{triggerLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex flex-col sm:flex-row">
          <div className="border-b border-border p-3 sm:border-b-0 sm:border-r dark:border-zinc-800">
            <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Quick ranges
            </p>
            <div className="flex flex-col gap-0.5">
              {PERIOD_PRESETS.map((p) => (
                <Button
                  key={p.id}
                  type="button"
                  variant={serialized.preset === p.id ? "secondary" : "ghost"}
                  size="sm"
                  className="justify-start font-normal"
                  onClick={() => applyPreset(p.id)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Custom range
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              Choose Start or End, then pick a date on the calendar.
            </p>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Start</Label>
                <Button
                  type="button"
                  variant={activeEnd === "start" ? "secondary" : "outline"}
                  size="sm"
                  className="h-9 w-full justify-start px-2 font-normal tabular-nums"
                  onClick={() => setActiveEnd("start")}
                >
                  {customRange?.from ? format(customRange.from, "MMM d, yyyy") : "Pick date"}
                </Button>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">End</Label>
                <Button
                  type="button"
                  variant={activeEnd === "end" ? "secondary" : "outline"}
                  size="sm"
                  className="h-9 w-full justify-start px-2 font-normal tabular-nums"
                  onClick={() => setActiveEnd("end")}
                >
                  {customRange?.to ? format(customRange.to, "MMM d, yyyy") : "Pick date"}
                </Button>
              </div>
            </div>

            <Calendar
              mode="single"
              selected={activeDate}
              onSelect={selectDay}
              defaultMonth={activeDate ?? customRange?.from}
              modifiers={
                customRange?.from && customRange?.to
                  ? {
                      range_start: customRange.from,
                      range_end: customRange.to,
                      range_middle: (date: Date) =>
                        date > customRange.from! && date < customRange.to!,
                    }
                  : undefined
              }
              modifiersClassNames={{
                range_start: "rounded-l-md bg-primary text-primary-foreground",
                range_end: "rounded-r-md bg-primary text-primary-foreground",
                range_middle: "rounded-none bg-primary/15",
              }}
            />

            <div className="mt-3 flex gap-2">
              <Button type="button" variant="ghost" size="sm" className="flex-1" onClick={clearCustomRange}>
                Clear
              </Button>
              <Button
                type="button"
                size="sm"
                className="flex-1"
                disabled={!customRange?.from}
                onClick={applyCustomRange}
              >
                Apply range
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
