"use client";

import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { recurrencePeriodUnit } from "@/lib/recurring/occurrence";
import type { RecurrenceFrequency } from "@/generated/prisma/enums";

type EndsFieldsProps<T extends FieldValues> = {
  control: Control<T>;
  endsMode: "indefinite" | "limited";
  endsModeName: FieldPath<T>;
  occurrenceCountName: FieldPath<T>;
  idPrefix: string;
  frequency: RecurrenceFrequency | string;
  error?: string;
  onEndsModeChange?: (mode: "indefinite" | "limited") => void;
};

export function RecurringEndsFields<T extends FieldValues>({
  control,
  endsMode,
  endsModeName,
  occurrenceCountName,
  idPrefix,
  frequency,
  error,
  onEndsModeChange,
}: EndsFieldsProps<T>) {
  const unit = recurrencePeriodUnit(frequency);

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-ends`}>Ends</Label>
        <Controller
          control={control}
          name={endsModeName}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(v) => {
                const mode = v as "indefinite" | "limited";
                field.onChange(mode);
                onEndsModeChange?.(mode);
              }}
            >
              <SelectTrigger id={`${idPrefix}-ends`} className="h-10 dark:border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="indefinite">Indefinite</SelectItem>
                <SelectItem value="limited">{unit.afterN}</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {endsMode === "limited" ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-count`}>Number of {unit.plural}</Label>
          <Controller
            control={control}
            name={occurrenceCountName}
            render={({ field }) => (
              <Input
                id={`${idPrefix}-count`}
                type="number"
                min={2}
                step={1}
                className="h-10"
                value={field.value ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  field.onChange(raw === "" ? null : Number(raw));
                }}
              />
            )}
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <p className="text-xs text-muted-foreground">
            Must be 2 or more {unit.plural}. The template is deleted after the last{" "}
            {unit.singular}.
          </p>
        </div>
      ) : null}
    </>
  );
}
