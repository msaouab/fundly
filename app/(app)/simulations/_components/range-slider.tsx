"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type RangeSliderProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  displayValue?: string;
};

export const RangeSlider = React.forwardRef<HTMLInputElement, RangeSliderProps>(
  ({ label, displayValue, className, id, name, ...props }, ref) => {
    const autoId = React.useId();
    const inputId = id ?? autoId;
    const inputName =
      name ?? `fundly-range-${inputId.replace(/:/g, "")}`;

    return (
      <div className={cn("touch-manipulation space-y-2 py-0.5", className)}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 text-sm">
          <label htmlFor={inputId} className="text-muted-foreground">
            {label}
          </label>
          {displayValue != null ?
            <span className="font-medium tabular-nums text-foreground" aria-live="polite">
              {displayValue}
            </span>
          : null}
        </div>
        <input
          ref={ref}
          type="range"
          id={inputId}
          name={inputName}
          className={cn(
            "h-2.5 min-h-[44px] w-full cursor-pointer appearance-none rounded-full bg-muted py-[18px] accent-primary sm:min-h-0 sm:py-0",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
          {...props}
        />
      </div>
    );
  },
);
RangeSlider.displayName = "RangeSlider";
