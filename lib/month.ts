import { format } from "date-fns";

/** Parse `YYYY-MM` or return current calendar month. */
export function parseMonthParam(month: string | undefined | null): {
  year: number;
  month: number;
  key: string;
} {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return { year: y, month: m, key: `${y}-${String(m).padStart(2, "0")}` };
  }
  const [ys, ms] = month.split("-");
  const year = Number(ys);
  const monthNum = Number(ms);
  if (!Number.isFinite(year) || !Number.isFinite(monthNum) || monthNum < 1 || monthNum > 12) {
    return { year: y, month: m, key: `${y}-${String(m).padStart(2, "0")}` };
  }
  return { year, month: monthNum, key: `${year}-${String(monthNum).padStart(2, "0")}` };
}

/** Inclusive local month range for DB filters. */
export function monthRangeLocal(year: number, month: number): {
  start: Date;
  end: Date;
} {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

export function formatMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export type MonthNavYearGroup = {
  year: number;
  months: { key: string; label: string }[];
};

export type BuildMonthNavOptions = {
  /** Months before anchor (default 24). */
  pastMonths?: number;
  /** Months after anchor (default 24). */
  futureMonths?: number;
};

/** Inclusive past/future months from anchor, grouped by calendar year. */
export function buildMonthNavYearGroups(
  anchorYear: number,
  anchorMonth: number,
  options?: BuildMonthNavOptions,
): MonthNavYearGroup[] {
  const past = options?.pastMonths ?? 24;
  const future = options?.futureMonths ?? 24;
  const byYear = new Map<number, { key: string; monthNum: number; label: string }[]>();

  for (let delta = -past; delta <= future; delta++) {
    const { year: y, month: m } = addMonths(anchorYear, anchorMonth, delta);
    const key = formatMonthKey(y, m);
    const label = format(new Date(y, m - 1, 1), "MMMM");
    const bucket = byYear.get(y);
    const entry = { key, monthNum: m, label };
    if (bucket) bucket.push(entry);
    else byYear.set(y, [entry]);
  }

  return [...byYear.entries()]
    .sort(([a], [b]) => a - b)
    .map(([yr, ms]) => ({
      year: yr,
      months: ms.sort((x, z) => x.monthNum - z.monthNum).map(({ key: k, label: lbl }) => ({ key: k, label: lbl })),
    }));
}
