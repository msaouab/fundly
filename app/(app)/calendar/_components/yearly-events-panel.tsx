"use client";

import { Cake } from "lucide-react";
import type { SerializedYearlyEvent } from "@/lib/calendar/types";
import {
  YEARLY_KIND_LABELS,
  YEARLY_RELATION_EMOJI,
  YEARLY_RELATION_LABELS,
} from "@/lib/calendar/yearly";
import { formatMoney } from "@/lib/money";

type YearlyEventsPanelProps = {
  events: SerializedYearlyEvent[];
  monthEvents: SerializedYearlyEvent[];
  onSelect: (event: SerializedYearlyEvent) => void;
  onAdd: () => void;
};

function formatOccurrence(e: SerializedYearlyEvent): string {
  const d = new Date(e.occurrenceDate.slice(0, 10) + "T12:00:00");
  const dateStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (e.ageTurning != null && e.ageTurning > 0) {
    return `${dateStr} · turning ${e.ageTurning}`;
  }
  return dateStr;
}

export function YearlyEventsPanel({
  events,
  monthEvents,
  onSelect,
  onAdd,
}: YearlyEventsPanelProps) {
  return (
    <section className="rounded-xl border border-border p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Cake className="size-4 text-rose-600" aria-hidden />
          <h2 className="text-sm font-semibold text-foreground">Birthdays & yearly events</h2>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="text-sm font-medium text-rose-700 hover:underline dark:text-rose-400"
        >
          + Add
        </button>
      </div>

      {monthEvents.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground">This month</p>
          <ul className="mt-1.5 space-y-1.5">
            {monthEvents.map((e) => (
              <li key={`${e.id}-${e.occurrenceDate}`}>
                <button
                  type="button"
                  onClick={() => onSelect(e)}
                  className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted/60"
                >
                  <span aria-hidden>{YEARLY_RELATION_EMOJI[e.relation]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-foreground">{e.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {YEARLY_KIND_LABELS[e.kind]} · {YEARLY_RELATION_LABELS[e.relation]} ·{" "}
                      {formatOccurrence(e)}
                      {e.giftBudget != null
                        ? ` · ~${formatMoney(e.giftBudget, e.currency)}`
                        : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No birthdays or anniversaries this month.</p>
      )}

      {events.length > monthEvents.length ? (
        <div className="mt-4 border-t border-border pt-3 dark:border-zinc-800">
          <p className="text-xs font-medium text-muted-foreground">All year ({events.length})</p>
          <ul className="mt-1.5 max-h-48 space-y-1 overflow-y-auto">
            {events.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => onSelect(e)}
                  className="text-sm text-foreground/80 hover:text-rose-700 hover:underline dark:hover:text-rose-400"
                >
                  {YEARLY_RELATION_EMOJI[e.relation]} {e.title}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {new Date(2000, e.month - 1, e.day).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
