"use client";

import { format } from "date-fns";
import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildMonthNavYearGroups } from "@/lib/month";
import { cn } from "@/lib/utils";

type MonthNavPickerProps = {
  monthKey: string;
  year: number;
  month: number;
  onMonthChange: (monthKey: string) => void;
  triggerClassName?: string;
  monthSelectName?: string;
  ariaLabel?: string;
};

export function MonthNavPicker({
  monthKey,
  year,
  month,
  onMonthChange,
  triggerClassName,
  monthSelectName,
  ariaLabel = "Select month",
}: MonthNavPickerProps) {
  const groups = useMemo(() => buildMonthNavYearGroups(year, month), [year, month]);

  const triggerLabel = useMemo(() => {
    const parts = monthKey.split("-");
    if (parts.length !== 2) return monthKey;
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return monthKey;
    return format(new Date(y, m - 1, 1), "MMMM yyyy");
  }, [monthKey]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground whitespace-nowrap">Month</span>
      <Select name={monthSelectName} value={monthKey} onValueChange={onMonthChange}>
        <SelectTrigger className={cn("w-[220px]", triggerClassName)} aria-label={ariaLabel}>
          <SelectValue>{triggerLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
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
    </div>
  );
}
