"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createYearlyEvent,
  deleteYearlyEvent,
  updateYearlyEvent,
} from "@/app/(app)/calendar/actions";
import {
  YEARLY_KIND_LABELS,
  YEARLY_RELATION_LABELS,
} from "@/lib/calendar/yearly";
import type { SerializedYearlyEvent } from "@/lib/calendar/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const KINDS = ["BIRTHDAY", "ANNIVERSARY", "OTHER"] as const;
const RELATIONS = ["SELF", "SPOUSE", "CHILD", "PARENT", "SIBLING", "FRIEND", "OTHER"] as const;

type YearlyFormState = {
  title: string;
  kind: (typeof KINDS)[number];
  relation: (typeof RELATIONS)[number];
  month: string;
  day: string;
  birthYear: string;
  giftBudget: string;
  notes: string;
};

function buildInitialYearlyForm(
  event: SerializedYearlyEvent | null | undefined,
  defaultMonth?: number,
  defaultDay?: number,
): YearlyFormState {
  if (event) {
    return {
      title: event.title,
      kind: event.kind,
      relation: event.relation,
      month: String(event.month),
      day: String(event.day),
      birthYear: event.birthYear != null ? String(event.birthYear) : "",
      giftBudget: event.giftBudget != null ? String(event.giftBudget) : "",
      notes: event.notes ?? "",
    };
  }
  return {
    title: "",
    kind: "BIRTHDAY",
    relation: "OTHER",
    month: defaultMonth != null ? String(defaultMonth) : "",
    day: defaultDay != null ? String(defaultDay) : "",
    birthYear: "",
    giftBudget: "",
    notes: "",
  };
}

type YearlyEventFormProps = {
  currency: string;
  event?: SerializedYearlyEvent | null;
  defaultMonth?: number;
  defaultDay?: number;
  onClose: () => void;
  onSaved?: () => void;
};

function YearlyEventForm({
  currency,
  event,
  defaultMonth,
  defaultDay,
  onClose,
  onSaved,
}: YearlyEventFormProps) {
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(event?.id);
  const [form, setForm] = useState(() =>
    buildInitialYearlyForm(event, defaultMonth, defaultDay),
  );

  function patch(patch: Partial<YearlyFormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: form.title,
      kind: form.kind,
      relation: form.relation,
      month: Number(form.month),
      day: Number(form.day),
      birthYear: form.birthYear ? Number(form.birthYear) : null,
      giftBudget: form.giftBudget ? Number(form.giftBudget) : null,
      currency,
      notes: form.notes || null,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateYearlyEvent(event!.id, payload)
        : await createYearlyEvent(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "Updated." : "Yearly event added.");
      onClose();
      onSaved?.();
    });
  }

  function handleDelete() {
    if (!event?.id) return;
    if (!confirm("Remove this yearly event?")) return;
    startTransition(async () => {
      const result = await deleteYearlyEvent(event.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Removed.");
      onClose();
      onSaved?.();
    });
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <label htmlFor="yearly-title" className="text-xs text-muted-foreground">
          Name
        </label>
        <input
          id="yearly-title"
          required
          placeholder="e.g. Wife — Sarah"
          value={form.title}
          onChange={(e) => patch({ title: e.target.value })}
          className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-600 dark:bg-zinc-950"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="yearly-kind" className="text-xs text-muted-foreground">
            Type
          </label>
          <select
            id="yearly-kind"
            value={form.kind}
            onChange={(e) => patch({ kind: e.target.value as YearlyFormState["kind"] })}
            className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {YEARLY_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="yearly-relation" className="text-xs text-muted-foreground">
            Who
          </label>
          <select
            id="yearly-relation"
            value={form.relation}
            onChange={(e) => patch({ relation: e.target.value as YearlyFormState["relation"] })}
            className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          >
            {RELATIONS.map((r) => (
              <option key={r} value={r}>
                {YEARLY_RELATION_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="yearly-month" className="text-xs text-muted-foreground">
            Month
          </label>
          <select
            id="yearly-month"
            required
            value={form.month}
            onChange={(e) => patch({ month: e.target.value })}
            className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          >
            <option value="">—</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2000, m - 1, 1).toLocaleString(undefined, { month: "long" })}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="yearly-day" className="text-xs text-muted-foreground">
            Day
          </label>
          <input
            id="yearly-day"
            type="number"
            min={1}
            max={31}
            required
            value={form.day}
            onChange={(e) => patch({ day: e.target.value })}
            className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          />
        </div>
      </div>

      {form.kind === "BIRTHDAY" ? (
        <div className="space-y-1">
          <label htmlFor="yearly-birth-year" className="text-xs text-muted-foreground">
            Birth year (optional, for age)
          </label>
          <input
            id="yearly-birth-year"
            type="number"
            min={1900}
            max={2100}
            placeholder="1990"
            value={form.birthYear}
            onChange={(e) => patch({ birthYear: e.target.value })}
            className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          />
        </div>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="yearly-gift" className="text-xs text-muted-foreground">
          Typical gift budget ({currency}, optional)
        </label>
        <input
          id="yearly-gift"
          type="number"
          min={0}
          step="0.01"
          value={form.giftBudget}
          onChange={(e) => patch({ giftBudget: e.target.value })}
          className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-600 dark:bg-zinc-950"
        />
      </div>

      <textarea
        placeholder="Notes (optional)"
        value={form.notes}
        onChange={(e) => patch({ notes: e.target.value })}
        rows={2}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
      />

      <DialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-lg bg-rose-600 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : isEdit ? "Save" : "Add yearly event"}
        </button>
        {isEdit ? (
          <button
            type="button"
            disabled={pending}
            onClick={handleDelete}
            className="h-9 rounded-lg border border-destructive/40 text-sm text-destructive hover:bg-destructive/10"
          >
            Remove
          </button>
        ) : null}
      </DialogFooter>
    </form>
  );
}

type YearlyEventDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formKey: number;
  currency: string;
  event?: SerializedYearlyEvent | null;
  defaultMonth?: number;
  defaultDay?: number;
  onSaved?: () => void;
};

export function YearlyEventDialog({
  open,
  onOpenChange,
  formKey,
  currency,
  event,
  defaultMonth,
  defaultDay,
  onSaved,
}: YearlyEventDialogProps) {
  const isEdit = Boolean(event?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit yearly event" : "Add birthday or anniversary"}</DialogTitle>
          <DialogDescription>
            Repeats every year on the same date — for you, family, and friends.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <YearlyEventForm
            key={formKey}
            currency={currency}
            event={event}
            defaultMonth={defaultMonth}
            defaultDay={defaultDay}
            onClose={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
