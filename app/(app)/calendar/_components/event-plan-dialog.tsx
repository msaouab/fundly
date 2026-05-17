"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createPlannedEvent,
  deletePlannedEvent,
  updateEventStatus,
  updatePlannedEvent,
} from "@/app/(app)/calendar/actions";
import { OUTCOME_LABELS } from "@/lib/calendar/analytics";
import type { SerializedHoliday, SerializedPlannedEvent } from "@/lib/calendar/types";
import { formatMoney, formatPercent } from "@/lib/money";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type EventPlanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formKey: number;
  currency: string;
  holiday?: SerializedHoliday | null;
  event?: SerializedPlannedEvent | null;
  defaultStartDate?: string;
  onSaved?: () => void;
};

const CATEGORIES = [
  "HOLIDAY",
  "TRAVEL",
  "FAMILY",
  "WEDDING",
  "EDUCATION",
  "SHOPPING",
  "OTHER",
] as const;

type FormCategory = (typeof CATEGORIES)[number];

type EventFormState = {
  title: string;
  description: string;
  category: FormCategory;
  startDate: string;
  endDate: string;
  budgetAmount: string;
  reservedAmount: string;
};

function buildInitialFormState(
  event: SerializedPlannedEvent | null | undefined,
  holiday: SerializedHoliday | null | undefined,
  defaultStartDate: string | undefined,
): EventFormState {
  if (event) {
    return {
      title: event.title,
      description: event.description ?? "",
      category: event.category,
      startDate: event.startDate.slice(0, 10),
      endDate: event.endDate?.slice(0, 10) ?? "",
      budgetAmount: String(event.budgetAmount),
      reservedAmount: String(event.reservedAmount),
    };
  }

  const start = holiday?.date.slice(0, 10) ?? defaultStartDate?.slice(0, 10) ?? "";
  return {
    title: holiday?.name ?? "",
    description: "",
    category: holiday ? "HOLIDAY" : "OTHER",
    startDate: start,
    endDate: start,
    budgetAmount: "",
    reservedAmount: "0",
  };
}

type EventPlanFormProps = {
  currency: string;
  holiday?: SerializedHoliday | null;
  event?: SerializedPlannedEvent | null;
  defaultStartDate?: string;
  onSaved?: () => void;
  onClose: () => void;
};

function EventPlanForm({
  currency,
  holiday,
  event,
  defaultStartDate,
  onSaved,
  onClose,
}: EventPlanFormProps) {
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(event?.id);

  const [form, setForm] = useState(() =>
    buildInitialFormState(event, holiday, defaultStartDate),
  );

  const { title, description, category, startDate, endDate, budgetAmount, reservedAmount } = form;

  function patchForm(patch: Partial<EventFormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title,
      description: description || null,
      category,
      startDate: new Date(`${startDate}T12:00:00`),
      endDate: endDate ? new Date(`${endDate}T12:00:00`) : null,
      budgetAmount: Number(budgetAmount),
      reservedAmount: Number(reservedAmount) || 0,
      currency,
      sourceHolidayId: holiday?.id ?? event?.sourceHolidayId ?? null,
      goalId: event?.goalId ?? null,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updatePlannedEvent(event!.id, payload)
        : await createPlannedEvent(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "Event updated." : "Event planned.");
      onClose();
      onSaved?.();
    });
  }

  function setStatus(status: "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED") {
    if (!event?.id) return;
    startTransition(async () => {
      const result = await updateEventStatus(event.id, status);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(status === "COMPLETED" ? "Marked complete." : "Status updated.");
      onClose();
      onSaved?.();
    });
  }

  function handleDelete() {
    if (!event?.id) return;
    if (!confirm("Delete this planned event?")) return;
    startTransition(async () => {
      const result = await deletePlannedEvent(event.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Event deleted.");
      onClose();
      onSaved?.();
    });
  }

  return (
    <>
      {event ? (
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm dark:border-zinc-800">
          <p className="font-medium">{OUTCOME_LABELS[event.outcome]}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Spent {formatMoney(event.actualSpend, event.currency)} of{" "}
            {formatMoney(event.budgetAmount, event.currency)} (
            {event.variance > 0 ? "+" : ""}
            {formatMoney(event.variance, event.currency)})
            · {formatPercent(event.fundingProgress, 0)} funded
          </p>
        </div>
      ) : null}

      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label htmlFor="event-title" className="text-xs text-muted-foreground">
            Title
          </label>
          <input
            id="event-title"
            required
            value={title}
            onChange={(e) => patchForm({ title: e.target.value })}
            className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="event-category" className="text-xs text-muted-foreground">
            Category
          </label>
          <select
            id="event-category"
            value={category}
            onChange={(e) => patchForm({ category: e.target.value as FormCategory })}
            className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="event-start" className="text-xs text-muted-foreground">
              Start
            </label>
            <input
              id="event-start"
              type="date"
              required
              value={startDate}
              onChange={(e) => patchForm({ startDate: e.target.value })}
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="event-end" className="text-xs text-muted-foreground">
              End
            </label>
            <input
              id="event-end"
              type="date"
              value={endDate}
              onChange={(e) => patchForm({ endDate: e.target.value })}
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="event-budget" className="text-xs text-muted-foreground">
              Budget ({currency})
            </label>
            <input
              id="event-budget"
              type="number"
              min="0"
              step="0.01"
              required
              value={budgetAmount}
              onChange={(e) => patchForm({ budgetAmount: e.target.value })}
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="event-reserved" className="text-xs text-muted-foreground">
              Reserved
            </label>
            <input
              id="event-reserved"
              type="number"
              min="0"
              step="0.01"
              value={reservedAmount}
              onChange={(e) => patchForm({ reservedAmount: e.target.value })}
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </div>
        </div>

        <textarea
          id="event-description"
          placeholder="Notes (optional)"
          value={description}
          onChange={(e) => patchForm({ description: e.target.value })}
          rows={2}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
        />

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch">
          <button
            type="submit"
            disabled={pending}
            className="h-10 rounded-lg bg-teal-700 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60 dark:bg-teal-600"
          >
            {pending ? "Saving…" : isEdit ? "Save changes" : "Create plan"}
          </button>
          {isEdit ? (
            <div className="flex flex-wrap gap-2">
              {event?.status !== "COMPLETED" ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setStatus("COMPLETED")}
                  className="h-9 flex-1 rounded-lg border border-border text-sm hover:bg-muted dark:border-zinc-700"
                >
                  Mark complete
                </button>
              ) : null}
              {event?.status !== "ACTIVE" && event?.status !== "COMPLETED" ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setStatus("ACTIVE")}
                  className="h-9 flex-1 rounded-lg border border-border text-sm hover:bg-muted dark:border-zinc-700"
                >
                  Set active
                </button>
              ) : null}
              <button
                type="button"
                disabled={pending}
                onClick={handleDelete}
                className={cn(
                  "h-9 flex-1 rounded-lg border border-destructive/40 text-sm text-destructive hover:bg-destructive/10",
                )}
              >
                Delete
              </button>
            </div>
          ) : null}
        </DialogFooter>
      </form>
    </>
  );
}

export function EventPlanDialog({
  open,
  onOpenChange,
  formKey,
  currency,
  holiday,
  event,
  defaultStartDate,
  onSaved,
}: EventPlanDialogProps) {
  const isEdit = Boolean(event?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit planned event" : "Plan an event"}</DialogTitle>
          <DialogDescription>
            Set a budget and track spend vs plan. Link expenses to this event from Expenses when
            available.
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <EventPlanForm
            key={formKey}
            currency={currency}
            holiday={holiday}
            event={event}
            defaultStartDate={defaultStartDate}
            onSaved={onSaved}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
