import type { PlannedEventStatus } from "@/generated/prisma/enums";
import { fundingProgress, monthsUntil, requiredMonthlySave } from "./event-math";
import type { CalendarAnalytics, EventOutcomeKind, SerializedPlannedEvent } from "./types";

export type EventRaw = {
  id: string;
  title: string;
  description: string | null;
  category: SerializedPlannedEvent["category"];
  status: PlannedEventStatus;
  startDate: Date;
  endDate: Date | null;
  budgetAmount: number;
  reservedAmount: number;
  currency: string;
  sourceHolidayId: string | null;
  goalId: string | null;
  completedAt: Date | null;
  linkedSpend: number;
  windowSpend: number;
};

function eventEnd(e: EventRaw): Date {
  return e.endDate ?? e.startDate;
}

export function resolveOutcome(
  e: EventRaw,
  avgMonthlySavings: number,
  now = new Date(),
): EventOutcomeKind {
  const budget = e.budgetAmount;
  const reserved = e.reservedAmount;
  const actual = e.linkedSpend > 0 ? e.linkedSpend : e.windowSpend;
  const variance = actual - budget;
  const months = monthsUntil(e.startDate, now);
  const required = requiredMonthlySave(budget, reserved, e.startDate, now);
  const end = eventEnd(e);
  const isPast = end < new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (e.status === "CANCELLED") return "upcoming";

  if (e.status === "COMPLETED" || (isPast && e.status !== "PLANNING")) {
    if (variance <= 0 && reserved >= budget * 0.95) return "success";
    if (variance > 0) return "overspent";
    if (reserved < budget * 0.9) return "underfunded";
    if (variance <= 0) return "success";
    return "overspent";
  }

  if (reserved >= budget) return "funded";
  if (months <= 0 && reserved < budget) return "at_risk";
  if (avgMonthlySavings > 0 && required > avgMonthlySavings * 1.1) return "at_risk";
  return "on_track";
}

export function toSerializedEvent(e: EventRaw, avgMonthlySavings: number, now = new Date()): SerializedPlannedEvent {
  const actualSpend = e.linkedSpend > 0 ? e.linkedSpend : e.windowSpend;
  const variance = actualSpend - e.budgetAmount;
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    category: e.category,
    status: e.status,
    startDate: e.startDate.toISOString(),
    endDate: e.endDate?.toISOString() ?? null,
    budgetAmount: e.budgetAmount,
    reservedAmount: e.reservedAmount,
    currency: e.currency,
    sourceHolidayId: e.sourceHolidayId,
    goalId: e.goalId,
    completedAt: e.completedAt?.toISOString() ?? null,
    outcome: resolveOutcome(e, avgMonthlySavings, now),
    actualSpend,
    windowSpend: e.windowSpend,
    variance,
    fundingProgress: fundingProgress(e.budgetAmount, e.reservedAmount),
    requiredMonthly: requiredMonthlySave(e.budgetAmount, e.reservedAmount, e.startDate, now),
    monthsUntil: monthsUntil(e.startDate, now),
  };
}

export function buildAnalytics(
  events: SerializedPlannedEvent[],
  currency: string,
  avgMonthlySavings: number,
): CalendarAnalytics {
  const completed = events.filter(
    (e) =>
      e.status === "COMPLETED" ||
      e.outcome === "success" ||
      e.outcome === "overspent" ||
      e.outcome === "underfunded",
  );
  const successCount = events.filter((e) => e.outcome === "success" || e.outcome === "funded").length;
  const overspentCount = events.filter((e) => e.outcome === "overspent").length;
  const underfundedCount = events.filter((e) => e.outcome === "underfunded").length;
  const onTrackCount = events.filter((e) => e.outcome === "on_track" || e.outcome === "funded").length;

  let totalOverspend = 0;
  let totalUnderspend = 0;
  for (const e of events) {
    if (e.variance > 0) totalOverspend += e.variance;
    else if (e.status === "COMPLETED" || e.outcome === "success") totalUnderspend += Math.abs(e.variance);
  }

  const totalPlannedBudget = events.reduce((s, e) => s + e.budgetAmount, 0);
  const totalReserved = events.reduce((s, e) => s + e.reservedAmount, 0);
  const totalActualSpend = events.reduce((s, e) => s + e.actualSpend, 0);
  const netVariance = totalActualSpend - totalPlannedBudget;
  const successRate = completed.length > 0 ? (successCount / completed.length) * 100 : 0;

  return {
    currency,
    totalEvents: events.length,
    activeEvents: events.filter((e) => e.status === "PLANNING" || e.status === "ACTIVE").length,
    completedEvents: completed.length,
    successCount,
    overspentCount,
    underfundedCount,
    onTrackCount,
    successRate,
    totalPlannedBudget,
    totalReserved,
    totalActualSpend,
    totalOverspend,
    totalUnderspend,
    netVariance,
    avgMonthlySavings,
    events: events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
  };
}

export const OUTCOME_LABELS: Record<EventOutcomeKind, string> = {
  on_track: "On track",
  funded: "Fully funded",
  success: "On budget",
  overspent: "Over budget",
  underfunded: "Under-funded",
  at_risk: "At risk",
  upcoming: "Upcoming",
};
