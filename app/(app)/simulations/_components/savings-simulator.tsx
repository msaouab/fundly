"use client";

import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { format, addMonths } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/money";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { SerializedGoal } from "@/lib/simulations/page-data";
import {
  monthsToGoal,
  projectionData,
  requiredMonthly,
  totalInterestEarned,
} from "../utils/savings";
import { amortizationTable, monthlyPayment, totalInterest } from "../utils/loan";
import { RangeSlider } from "./range-slider";

const MONTHLY_SLIDER_MAX = 50_000;
const MONTHLY_SLIDER_MIN = 500;

export type SavingsSimulatorConfigSnapshot = {
  goalName: string;
  emoji: string;
  targetAmount: number;
  savedAmount: number;
  monthlyContrib: number;
  annualRatePercent: number;
  deadlineMode: boolean;
  deadlineMonths?: number;
};

type SavingsSimulatorProps = {
  goal: SerializedGoal | null;
  monthlyIncomeHint: number;
  currency: string;
  onSnapshot: (snapshot: SavingsSimulatorConfigSnapshot) => void;
  onSwitchGoal?: () => void;
};

export function SavingsSimulator({
  goal,
  monthlyIncomeHint,
  currency,
  onSnapshot,
  onSwitchGoal,
}: SavingsSimulatorProps) {
  const [name, setName] = useState(goal?.name ?? "My savings goal");
  const [emoji, setEmoji] = useState(goal?.emoji ?? "🎯");
  const [target, setTarget] = useState(goal?.targetAmount ?? 120_000);
  const [saved, setSaved] = useState(goal?.savedAmount ?? 5000);
  const [monthly, setMonthly] = useState(
    Math.max(MONTHLY_SLIDER_MIN, Math.min(goal?.monthlyContrib ?? 3000, MONTHLY_SLIDER_MAX)),
  );
  const [annualRate, setAnnualRate] = useState(goal?.interestRate ?? 2);
  const [deadlineMode, setDeadlineMode] = useState(false);
  const [deadlineMonths, setDeadlineMonths] = useState(18);
  const [compareLoan, setCompareLoan] = useState(false);
  const illustrativeLoanApr = 8.5;

  const selectedGoalId = goal?.id ?? null;
  const [prevSelectedGoalId, setPrevSelectedGoalId] = useState<string | null>(selectedGoalId);

  /** When the picked goal row changes (or disappears), mirror old useEffect semantics without syncing in effects. */
  if (!goal && prevSelectedGoalId !== null) {
    setPrevSelectedGoalId(null);
  } else if (goal && goal.id !== prevSelectedGoalId) {
    setPrevSelectedGoalId(goal.id);
    setName(goal.name);
    setEmoji(goal.emoji);
    setTarget(goal.targetAmount);
    setSaved(goal.savedAmount);
    setMonthly(
      Math.max(MONTHLY_SLIDER_MIN, Math.min(goal.monthlyContrib || MONTHLY_SLIDER_MIN, MONTHLY_SLIDER_MAX)),
    );
    setAnnualRate(goal.interestRate);
  }

  const remaining = Math.max(0, target - saved);

  const math = useMemo(() => {
    const nToGoal =
      deadlineMode === false ? monthsToGoal(target, saved, monthly, annualRate) : deadlineMonths;

    let effectiveMonthly = monthly;
    let monthsOut: number | typeof Number.POSITIVE_INFINITY = nToGoal;

    if (deadlineMode) {
      const req = requiredMonthly(target, saved, deadlineMonths, annualRate);
      effectiveMonthly = Number.isFinite(req) && req > 0 ? req : 0;
      monthsOut = deadlineMonths;
    } else {
      monthsOut = nToGoal;
    }

    const maxChartMonths =
      deadlineMode ?
        deadlineMonths + 6
      : Number.isFinite(monthsOut) ?
        Math.min(600, (monthsOut as number) + 6)
      : 120;

    const series =
      deadlineMode ?
        projectionData(target, saved, effectiveMonthly, annualRate, Math.max(deadlineMonths + 12, maxChartMonths))
      : projectionData(target, saved, monthly, annualRate, maxChartMonths);

    const crossed = series.some((r) => r.balance >= target);
    const etaDate =
      Number.isFinite(monthsOut) && (monthsOut as number) >= 0 ?
        addMonths(new Date(), monthsOut as number)
      : null;

    const interestEarned =
      deadlineMode ? totalInterestEarned(series, saved, effectiveMonthly) : (
        totalInterestEarned(series, saved, monthly)
      );

    const savingsRatePct =
      monthlyIncomeHint > 0 ?
        deadlineMode ?
          ((effectiveMonthly / monthlyIncomeHint) * 100)
        : ((monthly / monthlyIncomeHint) * 100)
      : null;

    return {
      effectiveMonthly,
      monthsOut,
      series,
      crossed,
      etaDate,
      interestEarned,
      savingsRatePct,
      displayMonthly: deadlineMode ? effectiveMonthly : monthly,
    };
  }, [annualRate, deadlineMode, deadlineMonths, monthly, monthlyIncomeHint, saved, target]);

  const snapshotPayload = useMemo(
    (): SavingsSimulatorConfigSnapshot => ({
      goalName: name,
      emoji,
      targetAmount: target,
      savedAmount: saved,
      monthlyContrib: monthly,
      annualRatePercent: annualRate,
      deadlineMode,
      deadlineMonths,
    }),
    [annualRate, deadlineMode, deadlineMonths, emoji, monthly, name, saved, target],
  );

  const debouncedSnapshot = useDebounce(snapshotPayload, 300);

  useEffect(() => {
    onSnapshot(debouncedSnapshot);
  }, [debouncedSnapshot, onSnapshot]);

  const tip = useMemo(() => {
    if (!Number.isFinite(math.monthsOut)) return null;
    const m = math.monthsOut as number;
    if (m < 0) return null;
    if (!deadlineMode && m > 60) {
      const tipMonthly = monthly + 500;
      const faster = monthsToGoal(target, saved, tipMonthly, annualRate);
      if (Number.isFinite(faster) && typeof faster === "number" && faster < m) {
        return `Tip: MAD 500/mo more would shorten roughly ${Math.max(1, Math.round((m - faster) / 12))}+ year${m - faster > 24 ? "s" : ""} equivalent (≈ ${faster} mo vs ${m} mo).`;
      }
      return "This horizon exceeds five years — try raising contributions or refining the target.";
    }
    if (deadlineMode && math.effectiveMonthly > monthlyIncomeHint && monthlyIncomeHint > 0) {
      return "Required monthly exceeds your tracked income hint — widen the horizon or shrink the goal.";
    }
    return null;
  }, [annualRate, deadlineMode, math.effectiveMonthly, math.monthsOut, monthly, monthlyIncomeHint, saved, target]);

  const crossoverPoint = useMemo(() => {
    if (!math.crossed) return null;
    const row = math.series.find((pt) => pt.balance >= target);
    return row ?? null;
  }, [math.crossed, math.series, target]);

  const actionableTipLong = useMemo(() => {
    if (deadlineMode) return null;
    if (!Number.isFinite(math.monthsOut)) return null;
    const months = math.monthsOut as number;
    if (months <= 36 || months < 0) return null;
    const reqFor24 = requiredMonthly(target, saved, 24, annualRate);
    if (!Number.isFinite(reqFor24) || (reqFor24 as number) <= monthly) return null;
    const delta = Math.ceil((reqFor24 as number) - monthly);
    return { delta, months, reqFor24: reqFor24 as number };
  }, [annualRate, deadlineMode, math.monthsOut, monthly, saved, target]);

  const nearFinishTip =
    !deadlineMode &&
    Number.isFinite(math.monthsOut) &&
    (math.monthsOut as number) > 0 &&
    (math.monthsOut as number) <= 6 &&
    math.etaDate;

  const loanVsSave = useMemo(() => {
    if (!compareLoan || !goal || deadlineMode || remaining <= 0) return null;
    const saveMonths = monthsToGoal(target, saved, monthly, annualRate);
    if (!Number.isFinite(saveMonths) || saveMonths <= 0) return null;
    const sm = Math.min(360, Math.max(1, Math.ceil(Number(saveMonths))));
    const financed = remaining;
    const payment = monthlyPayment(financed, illustrativeLoanApr, sm);
    const loanTable = amortizationTable(financed, illustrativeLoanApr, sm, 0);
    const loanInt = totalInterest(loanTable);
    const savingsPathInterest = math.interestEarned;
    const loanTotalOut = financed + loanInt;
    const savingsMonths = sm;
    return {
      saveMonths,
      savingsMonths,
      savingsInterestEarned: savingsPathInterest,
      loanPayment: payment,
      loanInterest: loanInt,
      loanTotalOut,
    };
  }, [
    annualRate,
    compareLoan,
    deadlineMode,
    goal,
    math,
    monthly,
    remaining,
    saved,
    target,
  ]);

  const headerTitle = goal ? `${goal.emoji} ${goal.name}` : (name.trim() || "Ad-hoc scenario");

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <Card className="min-w-0 border-border dark:border-zinc-800">
        <CardHeader className="space-y-1 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-base">
                Configuring: <span className="font-semibold">{headerTitle}</span>
              </CardTitle>
              <CardDescription>Interactive — tweak inputs; projections update instantly.</CardDescription>
            </div>
            {goal && onSwitchGoal ?
              <button
                type="button"
                className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                onClick={onSwitchGoal}
              >
                Switch goal
              </button>
            : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-4 pt-0 sm:space-y-4 sm:px-6 sm:pb-6">
          <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-end">
            <div className="space-y-1">
              <Label htmlFor="sim-emoji" className="sr-only">
                Emoji
              </Label>
              <Input
                id="sim-emoji"
                name="goal-emoji"
                className="w-16 text-center text-xl"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
                aria-label="Goal emoji symbol"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sim-name">Goal name</Label>
              <Input
                id="sim-name"
                name="goal-name"
                className="min-h-11"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="sim-target">Target ({currency})</Label>
              <Input
                id="sim-target"
                name="goal-target"
                className="min-h-11"
                type="number"
                min={1}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sim-saved">Already saved ({currency})</Label>
              <Input
                id="sim-saved"
                name="goal-saved"
                className="min-h-11"
                type="number"
                min={0}
                value={saved}
                onChange={(e) => setSaved(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border p-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div>
              <Label htmlFor="sim-flip-deadline" className="text-sm font-medium">
                Flip mode
              </Label>
              <p id="sim-flip-deadline-hint" className="text-xs text-muted-foreground">
                {deadlineMode ? "Fix months → required monthly" : "Fix monthly → time to goal"}
              </p>
            </div>
            <Switch
              id="sim-flip-deadline"
              checked={deadlineMode}
              onCheckedChange={setDeadlineMode}
              aria-describedby="sim-flip-deadline-hint"
              aria-label="Toggle deadline versus monthly contribution mode"
            />
          </div>

          {!deadlineMode ?
            <RangeSlider
              id="sim-slider-monthly"
              name="goal-monthly-contrib"
              label="Monthly contribution"
              min={MONTHLY_SLIDER_MIN}
              max={MONTHLY_SLIDER_MAX}
              step={100}
              value={monthly}
              onChange={(e) => setMonthly(Number(e.target.value))}
              displayValue={formatMoney(monthly, currency)}
            />
          : <RangeSlider
              id="sim-slider-deadline-months"
              name="goal-deadline-months"
              label="Months to deadline"
              min={1}
              max={240}
              step={1}
              value={deadlineMonths}
              onChange={(e) => setDeadlineMonths(Number(e.target.value))}
              displayValue={`${deadlineMonths} mo`}
            />
          }

          <RangeSlider
            id="sim-slider-annual-rate"
            name="goal-annual-rate"
            label="Annual interest %"
            min={0}
            max={15}
            step={0.5}
            value={annualRate}
            onChange={(e) => setAnnualRate(Number(e.target.value))}
            displayValue={`${annualRate.toFixed(1)}%`}
          />
        </CardContent>
      </Card>

      <Card className="min-w-0 border-border dark:border-zinc-800">
        <CardHeader className="space-y-1 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base">Projection</CardTitle>
              <CardDescription>Live totals and trajectory.</CardDescription>
            </div>
            {goal ?
              <div className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 dark:border-zinc-800">
                <Label htmlFor="sim-compare-loan" className="text-xs whitespace-nowrap text-muted-foreground">
                  Loan vs save
                </Label>
                <Switch
                  id="sim-compare-loan"
                  checked={compareLoan}
                  onCheckedChange={setCompareLoan}
                  aria-label="Compare savings path with a loan for the gap"
                />
              </div>
            : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-4 pt-0 sm:space-y-4 sm:px-6 sm:pb-6">
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Still needed</dt>
              <dd className="font-semibold tabular-nums">{formatMoney(remaining, currency)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Time to goal</dt>
              <dd className="font-semibold tabular-nums">
                {Number.isFinite(math.monthsOut) && math.etaDate ?
                  `${math.monthsOut as number} mo — ${format(math.etaDate, "MMMM yyyy")}`
                : Number.isFinite(math.monthsOut) ?
                  `${math.monthsOut as number} mo`
                : "Not reachable at this rate"}
              </dd>
            </div>
            {deadlineMode ?
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Required monthly</dt>
                <dd className="font-semibold tabular-nums text-primary">
                  {formatMoney(math.effectiveMonthly, currency)}
                </dd>
              </div>
            : null}
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Est. interest earned</dt>
              <dd className="tabular-nums">{formatMoney(math.interestEarned, currency)}</dd>
            </div>
            {math.savingsRatePct != null ?
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Of income (hint)</dt>
                <dd className="tabular-nums">{math.savingsRatePct.toFixed(1)}%</dd>
              </div>
            : null}
          </dl>

          {nearFinishTip ?
            <div className="rounded-lg border border-teal-500/25 bg-teal-500/10 px-3 py-3 text-xs text-teal-800 dark:text-teal-300">
              You&apos;re close — at this pace you&apos;ll roughly reach by{" "}
              {math.etaDate ? format(math.etaDate, "MMMM yyyy") : "soon"}.
            </div>
          : null}
          {actionableTipLong ?
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-3 text-xs text-amber-800 dark:text-amber-300">
              Tip: boosting by about {formatMoney(actionableTipLong.delta, currency)}/month could shorten the gap to ~
              {24} months instead of {actionableTipLong.months}.
            </div>
          : null}
          {tip ?
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{tip}</p>
          : null}

          <div className="h-[240px] w-full min-w-0 [&_.recharts-cartesian-grid_line]:stroke-border [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground">
            <ResponsiveContainer width="100%" height={240} minWidth={0} minHeight={0} debounce={50}>
              <AreaChart data={math.series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => String(v)}
                  width={44}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                  formatter={(v) => [formatMoney(Number(v ?? 0), currency), "Balance"]}
                />
                <ReferenceLine
                  y={target}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                  label={{ value: "Target", fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                {crossoverPoint ?
                  <ReferenceDot
                    x={crossoverPoint.month}
                    y={target}
                    r={6}
                    fill="#14b8a6"
                    stroke="#fff"
                    strokeWidth={2}
                    aria-label="Goal reached"
                    label={{ value: "Goal met", fill: "#14b8a6", fontSize: 11 }}
                  />
                : null}
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#059669"
                  fill={math.crossed ? "#22c55e" : "#86efac"}
                  fillOpacity={0.35}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {loanVsSave ?
            <>
              <p className="text-[11px] text-muted-foreground">
                Borrowing hypothetical loan for the gap ({formatMoney(remaining, currency)} @ ~
                {illustrativeLoanApr.toFixed(1)}
                % APR) over roughly the same {loanVsSave.savingsMonths}&nbsp;mo window as savings.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-3 text-sm dark:border-zinc-800">
                  <p className="text-xs font-medium text-muted-foreground">Save toward target</p>
                  <p className="mt-2 text-lg font-semibold">{loanVsSave.savingsMonths} mo</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Est. interest earned: {formatMoney(loanVsSave.savingsInterestEarned, currency)}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3 text-sm dark:border-zinc-800">
                  <p className="text-xs font-medium text-muted-foreground">Finance the gap</p>
                  <p className="mt-2 text-lg font-semibold tabular-nums">
                    {formatMoney(loanVsSave.loanPayment, currency)}
                    /mo
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Approx. financing cost: {formatMoney(loanVsSave.loanInterest, currency)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Out-of-pocket interest difference (illustration): financing costs about{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {formatMoney(Math.max(0, loanVsSave.loanInterest - loanVsSave.savingsInterestEarned), currency)}
                </span>{" "}
                more than interest you&apos;d aim to earn saving — versus waiting {loanVsSave.savingsMonths} months
                debt-free except the loan obligation.
              </p>
            </>
          : null}
        </CardContent>
      </Card>
    </div>
  );
}

