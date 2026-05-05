"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/money";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { financialHealthScore, netWorthSeries } from "../utils/projections";
import { RangeSlider } from "./range-slider";

type NetWorthProjectionProps = {
  currency: string;
  netWorthHint: number;
  baselineMonthlySurplus: number;
  monthlyIncomeHint: number;
  onModelChange: (config: Record<string, unknown>, result: Record<string, unknown>) => void;
};

const HORIZONS = [12, 36, 60] as const;

export function NetWorthProjection({
  currency,
  netWorthHint,
  baselineMonthlySurplus,
  monthlyIncomeHint,
  onModelChange,
}: NetWorthProjectionProps) {
  const [prevNetWorthHint, setPrevNetWorthHint] = useState(netWorthHint);
  const [current, setCurrent] = useState(netWorthHint);
  const [incomeGrowth, setIncomeGrowth] = useState(3);
  const [inflation, setInflation] = useState(2.5);
  const [horizon, setHorizon] = useState<(typeof HORIZONS)[number]>(36);

  /** Reset edited net worth when the server hint updates (avoid sync-in-effect cascading renders). */
  if (netWorthHint !== prevNetWorthHint) {
    setPrevNetWorthHint(netWorthHint);
    setCurrent(netWorthHint);
  }

  const series = useMemo(
    () => netWorthSeries(current, baselineMonthlySurplus, incomeGrowth, horizon, inflation),
    [baselineMonthlySurplus, current, horizon, incomeGrowth, inflation],
  );

  const pointsAt = useMemo(() => {
    const pick = (m: number) => series.find((p) => p.month === m) ?? series[series.length - 1];
    return {
      one: pick(12),
      three: pick(36),
      five: pick(60),
    };
  }, [series]);

  const health = useMemo(() => {
    const savingsRate = monthlyIncomeHint > 0 ? (baselineMonthlySurplus / monthlyIncomeHint) * 100 : 0;
    const dtiGuess = monthlyIncomeHint > 0 ? Math.min(85, Math.max(0, 85 - savingsRate)) : 40;
    const emergencyGuess = baselineMonthlySurplus > 500 ? baselineMonthlySurplus / 900 : 0;
    return financialHealthScore({
      savingsRatePercent: savingsRate,
      debtToIncomePercent: dtiGuess,
      emergencyMonths: emergencyGuess,
    });
  }, [baselineMonthlySurplus, monthlyIncomeHint]);

  useEffect(() => {
    const endNominal = series[series.length - 1]?.nominal ?? current;
    onModelChange(
      {
        current,
        horizon,
        monthlyIncomeGrowthPercent: incomeGrowth,
        inflationAnnualPercent: inflation,
        surplusAssumptionMonthly: baselineMonthlySurplus,
      },
      {
        endNominal,
        endReal: series[series.length - 1]?.real ?? current,
        healthScore: health.score,
        healthLabel: health.label,
      },
    );
  }, [
    baselineMonthlySurplus,
    current,
    health.label,
    health.score,
    horizon,
    incomeGrowth,
    inflation,
    onModelChange,
    series,
  ]);

  const r = 42;
  const circumference = 2 * Math.PI * r;
  const scoreArc = (Math.max(0, Math.min(100, health.score)) / 100) * circumference;

  return (
    <div className="grid min-w-0 gap-4">
      <Card className="min-w-0 border-border dark:border-zinc-800">
        <CardHeader className="space-y-1 p-4 sm:p-6">
          <CardTitle className="text-base">Net worth roadmap</CardTitle>
          <CardDescription>Forward view with surplus reinvestment and inflation drag.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 px-4 pb-4 pt-0 sm:gap-6 sm:px-6 sm:pb-6 lg:grid-cols-[1fr,minmax(0,180px)]">
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="nw-current">Current net worth ({currency})</Label>
              <Input
                id="nw-current"
                name="networth-current"
                className="min-h-11"
                type="number"
                value={Math.round(current)}
                onChange={(e) => setCurrent(Number(e.target.value) || 0)}
              />
            </div>
            <RangeSlider
              id="nw-slider-income-growth"
              name="networth-income-growth"
              label="Monthly income growth (annualized, simple)"
              min={0}
              max={10}
              step={0.5}
              value={incomeGrowth}
              onChange={(e) => setIncomeGrowth(Number(e.target.value))}
              displayValue={`${incomeGrowth.toFixed(1)}%`}
            />
            <RangeSlider
              id="nw-slider-inflation"
              name="networth-inflation"
              label="Inflation (annual)"
              min={0}
              max={10}
              step={0.5}
              value={inflation}
              onChange={(e) => setInflation(Number(e.target.value))}
              displayValue={`${inflation.toFixed(1)}%`}
            />
            <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-2">
              {HORIZONS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHorizon(h)}
                  className={`min-h-11 touch-manipulation rounded-full px-3 py-2 text-sm font-medium sm:min-h-9 sm:px-4 sm:py-1.5 ${
                    horizon === h ?
                      "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {h === 12 ? "1 yr" : h === 36 ? "3 yr" : "5 yr"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-muted/20 p-3 dark:border-zinc-800 sm:p-4">
            <p className="text-xs font-medium text-muted-foreground">Financial health pulse</p>
            <svg viewBox="0 0 100 100" className="size-32 -rotate-90">
              <circle cx="50" cy="50" r="42" stroke="var(--muted)" strokeWidth="10" fill="none" />
              <circle
                cx="50"
                cy="50"
                r={r}
                stroke="currentColor"
                strokeWidth="10"
                fill="none"
                strokeDasharray={`${scoreArc} ${circumference}`}
                className={
                  health.label === "Healthy" || health.label === "Good" ?
                    "text-emerald-500"
                  : health.label === "Tight" ? "text-amber-500"
                  : "text-destructive"
                }
              />
            </svg>
            <div className="text-center rotate-0">
              <p className="text-3xl font-bold tabular-nums">{health.score}</p>
              <p className="text-sm font-medium">{health.label}</p>
              <p className="mt-2 text-[10px] text-muted-foreground leading-tight px-2">
                Heuristic from surplus vs income, rough DTI guess, and cushion — not advice.
              </p>
              <details className="mt-3 w-full max-w-xs text-left">
                <summary className="cursor-pointer text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                  How is this calculated?
                </summary>
                <div className="mt-2 space-y-1.5 text-[10px] text-muted-foreground">
                  <div className="flex justify-between gap-2">
                    <span>Starting baseline</span>
                    <span className="tabular-nums">+{health.breakdown.basePoints}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Savings-rate boost (from surplus %)</span>
                    <span className="tabular-nums">+{health.breakdown.savingsRateEffect.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Debt / DTI stress</span>
                    <span className="tabular-nums">{health.breakdown.debtStressEffect.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Emergency cushion months</span>
                    <span className="tabular-nums">+{health.breakdown.emergencyEffect.toFixed(1)}</span>
                  </div>
                  <p className="pt-1 text-[10px] opacity-80">
                    Rough orientation only — not financial advice. Inputs are placeholders, not a bank-grade
                    assessment.
                  </p>
                </div>
              </details>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-2 min-[400px]:gap-3 sm:grid-cols-3">
        <Card className="min-w-0 border-border dark:border-zinc-800">
          <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs text-muted-foreground">~1 year</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
            <p className="text-lg font-semibold tabular-nums">{formatMoney(pointsAt.one?.nominal ?? 0, currency)}</p>
            <p className="text-xs text-muted-foreground">
              Real {formatMoney(pointsAt.one?.real ?? 0, currency)}
            </p>
          </CardContent>
        </Card>
        <Card className="min-w-0 border-border dark:border-zinc-800">
          <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs text-muted-foreground">~3 years</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
            <p className="text-lg font-semibold tabular-nums">{formatMoney(pointsAt.three?.nominal ?? 0, currency)}</p>
            <p className="text-xs text-muted-foreground">
              Real {formatMoney(pointsAt.three?.real ?? 0, currency)}
            </p>
          </CardContent>
        </Card>
        <Card className="min-w-0 border-border dark:border-zinc-800">
          <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs text-muted-foreground">~5 years</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
            <p className="text-lg font-semibold tabular-nums">{formatMoney(pointsAt.five?.nominal ?? 0, currency)}</p>
            <p className="text-xs text-muted-foreground">
              Real {formatMoney(pointsAt.five?.real ?? 0, currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0 border-border dark:border-zinc-800">
        <CardHeader className="space-y-1 p-4 sm:p-6">
          <CardTitle className="text-sm font-medium text-muted-foreground">Nominal vs purchasing power</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
          <div className="h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height={280} minWidth={0} minHeight={0} debounce={50}>
              <AreaChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                  formatter={(v) => formatMoney(Number(v ?? 0), currency)}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="nominal"
                  name="Nominal"
                  stroke="#0d9488"
                  fill="#14b8a655"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="real"
                  name="Inflation-adjusted"
                  stroke="#64748b"
                  fill="#94a3b855"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
