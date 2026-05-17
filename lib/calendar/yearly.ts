import type { YearlyEventKind, YearlyEventRelation } from "@/generated/prisma/enums";

/** Day of month for a yearly event in a given calendar year (Feb 29 → Feb 28 in non-leap years). */
export function yearlyEventDayInYear(month: number, day: number, year: number): number {
  if (month === 2 && day === 29) {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return isLeap ? 29 : 28;
  }
  const maxDay = new Date(year, month, 0).getDate();
  return Math.min(day, maxDay);
}

export function yearlyEventDateKey(year: number, month: number, day: number): string {
  const d = yearlyEventDayInYear(month, day, year);
  return `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export const YEARLY_KIND_LABELS: Record<YearlyEventKind, string> = {
  BIRTHDAY: "Birthday",
  ANNIVERSARY: "Anniversary",
  OTHER: "Yearly",
};

export const YEARLY_RELATION_LABELS: Record<YearlyEventRelation, string> = {
  SELF: "Me",
  SPOUSE: "Spouse / partner",
  CHILD: "Child",
  PARENT: "Parent",
  SIBLING: "Sibling",
  FRIEND: "Friend",
  OTHER: "Other",
};

export const YEARLY_RELATION_EMOJI: Record<YearlyEventRelation, string> = {
  SELF: "🎂",
  SPOUSE: "💍",
  CHILD: "🧒",
  PARENT: "👨‍👩‍👧",
  SIBLING: "👫",
  FRIEND: "🤝",
  OTHER: "📅",
};
