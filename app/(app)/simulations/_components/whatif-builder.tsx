"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SerializedGoal } from "@/lib/simulations/page-data";
import { scenarioComparison, type WhatIfScenario } from "../utils/projections";
import { RangeSlider } from "./range-slider";

const HORIZONS = [12, 24, 36] as const;

type WhatIfBuilderProps = {
  currency: string;
  baselineMonthlySurplus: number;
  monthlyIncomeHint: number;
  monthlyExpenseHint: number | null;
  hintsMonthLabel: string;
  selectedGoal: SerializedGoal | null;
  onModelChange: (config: Record<string, unknown>, result: Record<string, unknown>) => void;
  onRefreshBaselineHints: () => void;
};

type Row = {
  id: string;
  name: string;
  kind: "INCOME_PCT" | "EXPENSE_CUT" | "NEW_RECURRING" | "ONE_TIME";
  delta: number;
};

export function WhatIfBuilder({
  currency,
  baselineMonthlySurplus,
  monthlyIncomeHint,
  monthlyExpenseHint,
  hintsMonthLabel,
  selectedGoal,
  onModelChange,
  onRefreshBaselineHints,
}: WhatIfBuilderProps) {
  const [horizon, setHorizon] = useState<(typeof HORIZONS)[number]>(24);
  const [rows, setRows] = useState<Row[]>([
    { id: "a", name: "Scenario A", kind: "INCOME_PCT", delta: 5 },
    { id: "b", name: "Scenario B", kind: "EXPENSE_CUT", delta: 15 },
  ]);

  const startingBalance = selectedGoal?.savedAmount ?? 0;

  const scenarios: WhatIfScenario[] = useMemo(() => {
    return rows.slice(0, 3).map((r) => {
      let surplusDelta = 0;
      const base = Math.max(0, baselineMonthlySurplus);
      switch (r.kind) {
        case "INCOME_PCT":
          surplusDelta = (base * Math.abs(r.delta)) / 100;
          break;
        case "EXPENSE_CUT":
          surplusDelta = (base * Math.abs(r.delta)) / 100;
          break;
        case "NEW_RECURRING":
          surplusDelta = -Math.abs(r.delta);
          break;
        case "ONE_TIME":
          surplusDelta = horizon > 0 ? -Math.abs(r.delta) / horizon : 0;
          break;
        default:
          break;
      }
      return { id: r.id, name: r.name, surplusDeltaMonthly: surplusDelta };
    });
  }, [baselineMonthlySurplus, horizon, rows]);

  const mergedData = useMemo(() => {
    const raw = scenarioComparison(startingBalance, baselineMonthlySurplus, scenarios, horizon);
    return raw.map((pt) => {
      const row: Record<string, number> = { month: pt.month, baseline: pt.baseline };
      for (const s of scenarios) {
        row[`s_${s.id}`] = pt.scenarios[s.id] ?? pt.baseline;
      }
      return row;
    });
  }, [baselineMonthlySurplus, horizon, scenarios, startingBalance]);

  useEffect(() => {
    const end = mergedData[mergedData.length - 1];
    const baselineEnd = end?.baseline ?? startingBalance;
    let bestDelta = Number.NEGATIVE_INFINITY;
    let bestName = "";
    if (end && scenarios.length) {
      for (const s of scenarios) {
        const v = end[`s_${s.id}`] ?? baselineEnd;
        const diff = v - baselineEnd;
        if (diff > bestDelta) {
          bestDelta = diff;
          bestName = s.name;
        }
      }
    }

    onModelChange(
      {
        horizon,
        rows,
        baselineMonthlySurplus,
        startingBalance,
      },
      {
        endBalances: end,
        bestScenarioDelta: Number.isFinite(bestDelta) ? bestDelta : 0,
        bestScenarioName: bestName,
      },
    );
  }, [
    baselineMonthlySurplus,
    mergedData,
    onModelChange,
    rows,
    scenarios,
    startingBalance,
    horizon,
  ]);

  const end = mergedData[mergedData.length - 1];
  const diffLine =
    scenarios[0] && end ? (end[`s_${scenarios[0]!.id}`] ?? end.baseline) - end.baseline : 0;

  return (
    <Card className="min-w-0 border-border dark:border-zinc-800">
      <CardHeader className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <CardTitle className="text-base">What-if scenarios</CardTitle>
          <CardDescription>Contrast tweaks to surplus vs baseline trajectory.</CardDescription>
        </div>
        <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:gap-2">
          {HORIZONS.map((h) => (
            <Button
              key={h}
              variant={horizon === h ? "default" : "outline"}
              size="sm"
              type="button"
              className="min-h-11 touch-manipulation sm:min-h-9"
              onClick={() => setHorizon(h)}
            >
              {h} mo
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4 pt-0 sm:space-y-6 sm:px-6 sm:pb-6">
        {monthlyIncomeHint > 0 && monthlyExpenseHint != null ?
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/25 px-3 py-2 text-xs text-muted-foreground dark:border-zinc-800">
            <p className="leading-relaxed">
              Baseline: {formatMoney(monthlyIncomeHint, currency)} income −{" "}
              {formatMoney(monthlyExpenseHint, currency)} expenses (excl. savings contributions) ≈{" "}
              {formatMoney(baselineMonthlySurplus, currency)} surplus/mo for calendar window {hintsMonthLabel}.
            </p>
            <Button type="button" variant="outline" size="sm" className="self-start" onClick={onRefreshBaselineHints}>
              Recalculate from latest data
            </Button>
          </div>
        : null}
        {rows.slice(0, 3).map((r, idx) => (
          <div
            key={r.id}
            className="grid gap-3 rounded-lg border p-3 dark:border-zinc-800 sm:grid-cols-12 sm:p-4"
          >
            <div className="space-y-1 sm:col-span-4">
              <Label htmlFor={`scn-${r.id}-name`}>Scenario label</Label>
              <Input
                id={`scn-${r.id}-name`}
                name={`scn-${r.id}-name`}
                value={r.name}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x)),
                  )
                }
              />
            </div>
            <div className="space-y-1 sm:col-span-4">
              <Label htmlFor={`scn-${r.id}-driver`}>Driver</Label>
              <Select
                value={r.kind}
                onValueChange={(v) =>
                  setRows((prev) =>
                    prev.map((x) => (x.id === r.id ? { ...x, kind: v as Row["kind"] } : x)),
                  )
                }
              >
                <SelectTrigger id={`scn-${r.id}-driver`} aria-label={`Scenario ${idx + 1} driver`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME_PCT">Income +%</SelectItem>
                  <SelectItem value="EXPENSE_CUT">Expense cut %</SelectItem>
                  <SelectItem value="NEW_RECURRING">New recurring expense ({currency}/mo)</SelectItem>
                  <SelectItem value="ONE_TIME">One-time expense ({currency})</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-4">
              <RangeSlider
                id={`scn-${r.id}-delta`}
                name={`scn-${r.id}-delta`}
                label={
                  r.kind === "INCOME_PCT" || r.kind === "EXPENSE_CUT" ? "%" : `${currency}/period`
                }
                min={
                  r.kind === "INCOME_PCT" || r.kind === "EXPENSE_CUT" ? 0 : 50
                }
                max={
                  r.kind === "INCOME_PCT" || r.kind === "EXPENSE_CUT" ? 30 : r.kind === "ONE_TIME" ? 50_000 : 5_000
                }
                step={r.kind === "INCOME_PCT" || r.kind === "EXPENSE_CUT" ? 1 : 50}
                value={
                  r.kind === "INCOME_PCT" || r.kind === "EXPENSE_CUT"
                    ? Math.abs(r.delta)
                    : Math.abs(r.delta)
                }
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setRows((prev) =>
                    prev.map((x) => {
                      if (x.id !== r.id) return x;
                      if (x.kind === "INCOME_PCT" || x.kind === "EXPENSE_CUT") return { ...x, delta: v };
                      return { ...x, delta: Math.abs(v) };
                    }),
                  );
                }}
                displayValue={
                  r.kind === "INCOME_PCT" || r.kind === "EXPENSE_CUT" ? `${r.delta}%` : formatMoney(Math.abs(r.delta), currency)
                }
              />
            </div>
          </div>
        ))}

        {rows.length < 3 ?
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setRows((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  name: `Scenario ${String.fromCharCode(65 + prev.length)}`,
                  kind: "INCOME_PCT",
                  delta: 3,
                },
              ])
            }
          >
            Add scenario ({rows.length}/3)
          </Button>
        : null}

        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          Starting balance:{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {formatMoney(startingBalance, currency)}
          </span>
          . Baseline monthly surplus (hint):{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {formatMoney(baselineMonthlySurplus, currency)}
          </span>
          .
        </p>

        <div className="h-[260px] w-full min-w-0">
          <ResponsiveContainer width="100%" height={260} minWidth={0} minHeight={0} debounce={50}>
            <LineChart data={mergedData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                formatter={(v) => formatMoney(Number(v ?? 0), currency)}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="baseline"
                name="Baseline"
                stroke="#94a3b8"
                strokeDasharray="5 5"
                dot={false}
                isAnimationActive={false}
              />
              {scenarios.map((s, i) => (
                <Line
                  key={s.id}
                  type="monotone"
                  dataKey={`s_${s.id}`}
                  name={s.name}
                  stroke={i === 0 ? "#0d9488" : i === 1 ? "#6366f1" : "#f97316"}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {end && scenarios.length ?
          <p className="text-sm text-muted-foreground">
            End of horizon (first scenario vs baseline):{" "}
            <span className={diffLine >= 0 ? "font-medium text-emerald-600" : "font-medium text-destructive"}>
              {diffLine >= 0 ? "+" : ""}
              {formatMoney(diffLine, currency)}
            </span>
          </p>
        : null}
      </CardContent>
    </Card>
  );
}
