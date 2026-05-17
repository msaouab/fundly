"use client";

import {
  AlertTriangle,
  CheckCircle2,
  PiggyBank,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OUTCOME_LABELS } from "@/lib/calendar/analytics";
import type { CalendarAnalytics, EventOutcomeKind } from "@/lib/calendar/types";
import { formatMoney, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";

const OUTCOME_STYLES: Record<EventOutcomeKind, string> = {
  on_track: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  funded: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  overspent: "bg-destructive/15 text-destructive",
  underfunded: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
  at_risk: "bg-orange-500/15 text-orange-800 dark:text-orange-400",
  upcoming: "bg-muted text-muted-foreground",
};

export function CalendarAnalyticsPanel({ analytics }: { analytics: CalendarAnalytics }) {
  const { currency } = analytics;
  const atRiskCount = analytics.events.filter((e) => e.outcome === "at_risk").length;

  return (
    <section className="space-y-4" aria-labelledby="calendar-analytics-heading">
      <h2 id="calendar-analytics-heading" className="sr-only">
        Event planning analytics
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="size-4" aria-hidden />
              Success rate
            </CardTitle>
            <CardDescription>Completed events on or under budget.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {analytics.completedEvents > 0
                ? formatPercent(analytics.successRate, 0)
                : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {analytics.successCount} succeeded · {analytics.overspentCount} over budget ·{" "}
              {analytics.underfundedCount} under-funded
            </p>
          </CardContent>
        </Card>

        <Card className="border-border dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingDown className="size-4 text-destructive" aria-hidden />
              Overspend
            </CardTitle>
            <CardDescription>Spend above planned budgets.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-destructive">
              {formatMoney(analytics.totalOverspend, currency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {analytics.overspentCount} event{analytics.overspentCount === 1 ? "" : "s"} over budget
            </p>
          </CardContent>
        </Card>

        <Card className="border-border dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <PiggyBank className="size-4" aria-hidden />
              Reserved vs budget
            </CardTitle>
            <CardDescription>Money set aside for planned events.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {formatMoney(analytics.totalReserved, currency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              of {formatMoney(analytics.totalPlannedBudget, currency)} planned
            </p>
          </CardContent>
        </Card>

        <Card className="border-border dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <AlertTriangle className="size-4 text-orange-600" aria-hidden />
              At risk
            </CardTitle>
            <CardDescription>Needs more savings than your recent average.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{atRiskCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Avg savings {formatMoney(analytics.avgMonthlySavings, currency)}/mo
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border dark:border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Target className="size-4 text-muted-foreground" aria-hidden />
            Planned events
          </CardTitle>
          <CardDescription>
            {analytics.activeEvents} active · {analytics.completedEvents} completed · net variance{" "}
            <span
              className={cn(
                "font-medium tabular-nums",
                analytics.netVariance > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400",
              )}
            >
              {analytics.netVariance > 0 ? "+" : ""}
              {formatMoney(analytics.netVariance, currency)}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No events yet. Tap a holiday on the calendar or use Plan event to set a budget.
            </p>
          ) : (
            <ul className="divide-y divide-border dark:divide-zinc-800">
              {analytics.events.map((e) => (
                <li key={e.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Budget {formatMoney(e.budgetAmount, e.currency)} · spent{" "}
                      {formatMoney(e.actualSpend, e.currency)}
                      {e.variance > 0 ? (
                        <span className="text-destructive">
                          {" "}
                          (+{formatMoney(e.variance, e.currency)})
                        </span>
                      ) : e.variance < 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {" "}
                          ({formatMoney(e.variance, e.currency)})
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      OUTCOME_STYLES[e.outcome],
                    )}
                  >
                    {OUTCOME_LABELS[e.outcome]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {analytics.totalUnderspend > 0 ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="size-3.5 text-emerald-600" aria-hidden />
          {formatMoney(analytics.totalUnderspend, currency)} saved vs budget on completed events.
        </p>
      ) : null}
    </section>
  );
}
