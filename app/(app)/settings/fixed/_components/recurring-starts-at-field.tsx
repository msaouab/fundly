"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type StartsAtFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  id: string;
};

export function RecurringStartsAtField<T extends FieldValues>({
  control,
  name,
  id,
}: StartsAtFieldProps<T>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Start date</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id={id}
                type="button"
                variant="outline"
                className={cn(
                  "h-10 w-full justify-start text-left font-normal dark:border-zinc-700",
                  !field.value && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {field.value ? format(field.value as Date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value as Date | undefined}
                onSelect={field.onChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )}
      />
    </div>
  );
}
