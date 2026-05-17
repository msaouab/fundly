"use client";

import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addMonths, buildMonthNavYearGroups, formatMonthKey } from "@/lib/month";
import { cn } from "@/lib/utils";

type CalendarMonthNavProps = {
  year: number;
  month: number;
  monthKey: string;
  onMonthKeyChange: (monthKey: string) => void;
  className?: string;
  disabled?: boolean;
};

function currentMonthKey(): string {
  const now = new Date();
  return formatMonthKey(now.getFullYear(), now.getMonth() + 1);
}

export function CalendarMonthNav({
  year,
  month,
  monthKey,
  onMonthKeyChange,
  className,
  disabled,
}: CalendarMonthNavProps) {
  const groups = useMemo(
    () =>
      buildMonthNavYearGroups(year, month, {
        pastMonths: 36,
        futureMonths: 36,
      }),
    [year, month],
  );

  const monthLabel = useMemo(
    () => format(new Date(year, month - 1, 1), "MMMM yyyy"),
    [year, month],
  );

  const isCurrentMonth = monthKey === currentMonthKey();

  function shiftMonths(delta: number) {
    const next = addMonths(year, month, delta);
    onMonthKeyChange(formatMonthKey(next.year, next.month));
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        className,
      )}
      role="group"
      aria-label="Calendar month navigation"
    >
      <div className="flex items-center rounded-lg border border-border bg-background dark:border-zinc-800">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 rounded-l-lg rounded-r-none"
          disabled={disabled}
          onClick={() => shiftMonths(-12)}
          aria-label="Previous year"
          title="Previous year"
        >
          <span className="text-xs font-semibold tabular-nums">«</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 rounded-none"
          disabled={disabled}
          onClick={() => shiftMonths(-1)}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <Select
          value={monthKey}
          onValueChange={onMonthKeyChange}
          disabled={disabled}
        >
          <SelectTrigger
            className="h-9 min-w-38 max-w-44 rounded-none border-0 border-x border-border bg-transparent px-2 shadow-none focus:ring-0 dark:border-zinc-800 sm:min-w-42 sm:max-w-none"
            aria-label="Jump to month"
          >
            <SelectValue>{monthLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[min(24rem,70vh)]">
            {groups.map(({ year: y, months: ms }) => (
              <SelectGroup key={y}>
                <SelectLabel className="text-muted-foreground">{y}</SelectLabel>
                {ms.map((m) => (
                  <SelectItem key={m.key} value={m.key}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 rounded-none"
          disabled={disabled}
          onClick={() => shiftMonths(1)}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 rounded-r-lg rounded-l-none"
          disabled={disabled}
          onClick={() => shiftMonths(12)}
          aria-label="Next year"
          title="Next year"
        >
          <span className="text-xs font-semibold tabular-nums">»</span>
        </Button>
      </div>

      {!isCurrentMonth ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0"
          disabled={disabled}
          onClick={() => onMonthKeyChange(currentMonthKey())}
        >
          Today
        </Button>
      ) : null}
    </div>
  );
}
