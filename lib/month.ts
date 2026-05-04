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
