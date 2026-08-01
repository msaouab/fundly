import { format } from "date-fns";
import { monthRangeLocal, parseMonthParam } from "@/lib/month";

export type PeriodPreset =
  | "this_month"
  | "next_month"
  | "last_month"
  | "last_3_months"
  | "last_6_months"
  | "this_year"
  | "last_year"
  | "all_time"
  | "custom";

export type DatePeriod = {
  preset: PeriodPreset;
  start: Date;
  end: Date;
  label: string;
};

export type SerializedPeriod = {
  /** Stable key for React / URL (preset id or `custom:from:to`). */
  key: string;
  label: string;
  from: string;
  to: string;
  preset: PeriodPreset;
  /** Calendar months spanned by the range (for UI copy). */
  monthCount: number;
};

export type PeriodRange = {
  start: Date;
  end: Date;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const PERIOD_PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: "next_month", label: "Next month" },
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "last_3_months", label: "Last 3 months" },
  { id: "last_6_months", label: "Last 6 months" },
  { id: "this_year", label: "This year" },
  { id: "last_year", label: "Last year" },
  { id: "all_time", label: "All time" },
];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateKey(key: string): Date | null {
  if (!DATE_RE.test(key)) return null;
  const [ys, ms, ds] = key.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const date = new Date(y, m - 1, d, 12, 0, 0, 0);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

function formatPeriodLabel(start: Date, end: Date): string {
  const sameMonth =
    start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameMonth) return format(start, "MMMM yyyy");
  if (sameYear) return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
  return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
}

export function resolvePreset(preset: PeriodPreset, anchor = new Date()): DatePeriod {
  const y = anchor.getFullYear();
  const m = anchor.getMonth() + 1;

  switch (preset) {
    case "this_month": {
      const { start, end } = monthRangeLocal(y, m);
      return { preset, start, end, label: formatPeriodLabel(start, end) };
    }
    case "next_month": {
      const next = new Date(y, m, 1);
      const { start, end } = monthRangeLocal(next.getFullYear(), next.getMonth() + 1);
      return { preset, start, end, label: formatPeriodLabel(start, end) };
    }
    case "last_month": {
      const prev = new Date(y, m - 2, 1);
      const { start, end } = monthRangeLocal(prev.getFullYear(), prev.getMonth() + 1);
      return { preset, start, end, label: formatPeriodLabel(start, end) };
    }
    case "last_3_months": {
      const start = startOfDay(new Date(y, m - 3, 1));
      const end = endOfDay(new Date(y, m, 0));
      return { preset, start, end, label: "Last 3 months" };
    }
    case "last_6_months": {
      const start = startOfDay(new Date(y, m - 6, 1));
      const end = endOfDay(new Date(y, m, 0));
      return { preset, start, end, label: "Last 6 months" };
    }
    case "this_year": {
      const start = startOfDay(new Date(y, 0, 1));
      const end = endOfDay(new Date(y, 11, 31));
      return { preset, start, end, label: String(y) };
    }
    case "last_year": {
      const start = startOfDay(new Date(y - 1, 0, 1));
      const end = endOfDay(new Date(y - 1, 11, 31));
      return { preset, start, end, label: String(y - 1) };
    }
    case "all_time": {
      const start = startOfDay(new Date(2000, 0, 1));
      const end = endOfDay(anchor);
      return { preset, start, end, label: "All time" };
    }
    default:
      return resolvePreset("this_month", anchor);
  }
}

export function dateRangeLocal(from: Date, to: Date): PeriodRange {
  return { start: startOfDay(from), end: endOfDay(to) };
}

export function parsePeriodFromSearchParams(
  sp: { month?: string; period?: string; from?: string; to?: string } | null | undefined,
): DatePeriod {
  const fromKey = sp?.from?.trim();
  const toKey = sp?.to?.trim();
  if (fromKey && toKey && DATE_RE.test(fromKey) && DATE_RE.test(toKey)) {
    const fromDate = parseDateKey(fromKey);
    const toDate = parseDateKey(toKey);
    if (fromDate && toDate) {
      let start = startOfDay(fromDate);
      let end = endOfDay(toDate);
      if (start > end) [start, end] = [end, start];
      return {
        preset: "custom",
        start,
        end,
        label: formatPeriodLabel(start, end),
      };
    }
  }

  const preset = sp?.period as PeriodPreset | undefined;
  if (preset && preset !== "custom" && PERIOD_PRESETS.some((p) => p.id === preset)) {
    return resolvePreset(preset);
  }

  if (sp?.month) {
    const { year, month } = parseMonthParam(sp.month);
    const { start, end } = monthRangeLocal(year, month);
    return {
      preset: "custom",
      start,
      end,
      label: formatPeriodLabel(start, end),
    };
  }

  return resolvePreset("this_month");
}

/** Default global filter: current calendar month. */
export function getDefaultPeriod(): DatePeriod {
  return resolvePreset("this_month");
}

export function getDefaultSerializedPeriod(): SerializedPeriod {
  return serializePeriod(getDefaultPeriod());
}

/** Map a custom range that matches the current month to the `this_month` preset. */
export function normalizePeriodPreset(period: DatePeriod): DatePeriod {
  if (period.preset !== "custom") return period;
  const thisMonth = getDefaultPeriod();
  if (
    formatDateKey(period.start) === formatDateKey(thisMonth.start) &&
    formatDateKey(period.end) === formatDateKey(thisMonth.end)
  ) {
    return thisMonth;
  }
  return period;
}

export function deserializeSerializedPeriod(serialized: SerializedPeriod): DatePeriod {
  if (serialized.preset !== "custom") {
    return resolvePreset(serialized.preset);
  }
  const from = parseDateKey(serialized.from);
  const to = parseDateKey(serialized.to);
  if (!from || !to) return resolvePreset("this_month");
  const start = startOfDay(from);
  const end = endOfDay(to);
  return {
    preset: "custom",
    start,
    end,
    label: serialized.label || formatPeriodLabel(start, end),
  };
}

export function serializePeriod(period: DatePeriod): SerializedPeriod {
  const from = formatDateKey(period.start);
  const to = formatDateKey(period.end);
  const key =
    period.preset !== "custom"
      ? period.preset
      : `custom:${from}:${to}`;
  return {
    key,
    label: period.label,
    from,
    to,
    preset: period.preset,
    monthCount: listMonthBucketsInRange(period.start, period.end, 999).length,
  };
}

/** Query string for router.push (no leading `?`). */
export function periodToQueryString(period: DatePeriod): string {
  if (period.preset !== "custom") {
    return `period=${period.preset}`;
  }
  return `from=${formatDateKey(period.start)}&to=${formatDateKey(period.end)}`;
}

/** Previous period of equal calendar length immediately before `period`. */
export function previousPeriod(period: DatePeriod): DatePeriod {
  const startMs = period.start.getTime();
  const endMs = period.end.getTime();
  const lengthDays = Math.max(
    1,
    Math.round((endMs - startMs) / (24 * 60 * 60 * 1000)) + 1,
  );
  const prevEnd = endOfDay(new Date(period.start.getTime() - 24 * 60 * 60 * 1000));
  const prevStart = startOfDay(
    new Date(prevEnd.getTime() - (lengthDays - 1) * 24 * 60 * 60 * 1000),
  );
  return {
    preset: "custom",
    start: prevStart,
    end: prevEnd,
    label: formatPeriodLabel(prevStart, prevEnd),
  };
}

export type MonthBucket = {
  year: number;
  month: number;
  monthKey: string;
  label: string;
  start: Date;
  end: Date;
};

/** Calendar months overlapping [start, end], capped for chart performance. */
export function listMonthBucketsInRange(
  start: Date,
  end: Date,
  maxMonths = 36,
): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  let y = start.getFullYear();
  let m = start.getMonth() + 1;

  while (true) {
    const { start: ms, end: me } = monthRangeLocal(y, m);
    if (ms > end) break;
    if (me >= start) {
      buckets.push({
        year: y,
        month: m,
        monthKey: `${y}-${String(m).padStart(2, "0")}`,
        label: format(new Date(y, m - 1, 1), "MMM yy"),
        start: ms > start ? ms : start,
        end: me < end ? me : end,
      });
    }
    const next = new Date(y, m, 1);
    y = next.getFullYear();
    m = next.getMonth() + 1;
    if (buckets.length > 600) break;
  }

  if (buckets.length <= maxMonths) return buckets;
  return buckets.slice(-maxMonths);
}
