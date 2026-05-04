"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import "react-day-picker/style.css";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, ...props }: CalendarProps) {
  return (
    <DayPicker
      className={cn(
        "rounded-md border border-border bg-background p-3 text-foreground dark:bg-zinc-950",
        className,
      )}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
