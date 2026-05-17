import type {
  HolidayType,
  PlannedEventCategory,
  PlannedEventStatus,
  YearlyEventKind,
  YearlyEventRelation,
} from "@/generated/prisma/enums";

export type EventOutcomeKind =
  | "on_track"
  | "funded"
  | "success"
  | "overspent"
  | "underfunded"
  | "at_risk"
  | "upcoming";

export type SerializedHoliday = {
  id: string;
  name: string;
  date: string;
  type: HolidayType;
  slug: string | null;
};

export type SerializedPlannedEvent = {
  id: string;
  title: string;
  description: string | null;
  category: PlannedEventCategory;
  status: PlannedEventStatus;
  startDate: string;
  endDate: string | null;
  budgetAmount: number;
  reservedAmount: number;
  currency: string;
  sourceHolidayId: string | null;
  goalId: string | null;
  completedAt: string | null;
  outcome: EventOutcomeKind;
  actualSpend: number;
  windowSpend: number;
  variance: number;
  fundingProgress: number;
  requiredMonthly: number;
  monthsUntil: number;
};

export type SerializedYearlyEvent = {
  id: string;
  title: string;
  kind: YearlyEventKind;
  relation: YearlyEventRelation;
  month: number;
  day: number;
  giftBudget: number | null;
  currency: string;
  notes: string | null;
  birthYear: number | null;
  /** ISO date for the occurrence in the calendar month being viewed */
  occurrenceDate: string;
  ageTurning: number | null;
};

export type CalendarDayCell = {
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  holidays: SerializedHoliday[];
  events: SerializedPlannedEvent[];
  yearlyEvents: SerializedYearlyEvent[];
};

export type CalendarAnalytics = {
  currency: string;
  totalEvents: number;
  activeEvents: number;
  completedEvents: number;
  successCount: number;
  overspentCount: number;
  underfundedCount: number;
  onTrackCount: number;
  successRate: number;
  totalPlannedBudget: number;
  totalReserved: number;
  totalActualSpend: number;
  totalOverspend: number;
  totalUnderspend: number;
  netVariance: number;
  avgMonthlySavings: number;
  events: SerializedPlannedEvent[];
};

export type CalendarPageData = {
  countryCode: string;
  countryName: string;
  currency: string;
  year: number;
  month: number;
  monthKey: string;
  days: CalendarDayCell[];
  analytics: CalendarAnalytics;
  holidays: SerializedHoliday[];
  yearlyEvents: SerializedYearlyEvent[];
  monthYearlyEvents: SerializedYearlyEvent[];
};
