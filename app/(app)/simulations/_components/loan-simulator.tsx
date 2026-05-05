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
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  amortizationTable,
  crossoverMonth,
  monthlyPayment,
  totalInterest,
  totalPaid,
} from "../utils/loan";
import { RangeSlider } from "./range-slider";

type LoanSimulatorProps = {
  currency: string;
  onModelChange: (config: Record<string, unknown>, result: Record<string, unknown>) => void;
};

export function LoanSimulator({ currency, onModelChange }: LoanSimulatorProps) {
  const [principal, setPrincipal] = useState(150_000);
  const [annualRate, setAnnualRate] = useState(8.5);
  const [months, setMonths] = useState(60);
  const [extra, setExtra] = useState(0);
  const [variableLoan, setVariableLoan] = useState(false);

  const base = useMemo(
    () => monthlyPayment(principal, annualRate, months),
    [annualRate, months, principal],
  );

  const tableBase = useMemo(
    () => amortizationTable(principal, annualRate, months, 0),
    [annualRate, months, principal],
  );
  const tableExtra = useMemo(
    () => amortizationTable(principal, annualRate, months, extra),
    [annualRate, extra, months, principal],
  );

  const chartFast = useMemo(
    () =>
      tableExtra.map((row) => ({
        month: row.month,
        principalLeft: row.balance,
        cumInterest: row.cumulativeInterest,
      })),
    [tableExtra],
  );

  const chartSlow = useMemo(
    () =>
      tableBase.map((row) => ({
        month: row.month,
        principalLeftSlow: row.balance,
      })),
    [tableBase],
  );

  const chartMerged = useMemo(() => {
    const len = Math.max(chartFast.length, chartSlow.length);
    const rows: Record<string, number>[] = [];
    for (let i = 0; i < len; i++) {
      rows.push({
        month: chartFast[i]?.month ?? chartSlow[i]?.month ?? i + 1,
        principalFast: chartFast[i]?.principalLeft ?? 0,
        principalBaseline: chartSlow[i]?.principalLeftSlow ?? 0,
        cumulativeInterest: chartFast[i]?.cumInterest ?? 0,
      });
    }
    return rows;
  }, [chartFast, chartSlow]);

  const crossover = crossoverMonth(tableBase);
  const interestSaved = Math.max(0, totalInterest(tableBase) - totalInterest(tableExtra));
  const monthsSaved = Math.max(0, tableBase.length - tableExtra.length);

  const termYears = months / 12;

  useEffect(() => {
    onModelChange(
      {
        principal,
        annualRate,
        months,
        extraMonthly: extra,
        variableLoan,
      },
      {
        monthlyPayment: base,
        totalPaid: totalPaid(tableExtra),
        totalInterest: totalInterest(tableExtra),
        totalInterestBaseline: totalInterest(tableBase),
        monthsToPayOff: tableExtra.length,
        monthsToPayOffBaseline: tableBase.length,
        interestSaved,
        monthsSaved,
      },
    );
  }, [
    annualRate,
    base,
    extra,
    interestSaved,
    months,
    monthsSaved,
    onModelChange,
    principal,
    tableBase,
    tableExtra,
    variableLoan,
  ]);

  return (
    <div className="grid min-w-0 gap-4">
      <Card className="min-w-0 border-border dark:border-zinc-800">
        <CardHeader className="space-y-1 p-4 sm:p-6">
          <CardTitle className="text-base">Loan & credit</CardTitle>
          <CardDescription>Standard amortization plus optional extra principal every month.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 px-4 pb-4 pt-0 sm:gap-6 sm:px-6 sm:pb-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="loan-principal">Loan amount ({currency})</Label>
              <Input
                id="loan-principal"
                name="loan-principal"
                className="min-h-11"
                type="number"
                min={1}
                value={principal}
                onChange={(e) => setPrincipal(Number(e.target.value) || 0)}
              />
            </div>
            <RangeSlider
              id="loan-slider-apr"
              name="loan-apr"
              label="APR %"
              min={0}
              max={25}
              step={0.25}
              value={annualRate}
              onChange={(e) => setAnnualRate(Number(e.target.value))}
              displayValue={`${annualRate.toFixed(2)}%`}
            />
            <RangeSlider
              id="loan-slider-term"
              name="loan-term-months"
              label={`Term (${months} mo)`}
              min={6}
              max={360}
              step={6}
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              displayValue={`≈ ${termYears.toFixed(1)} yr`}
            />
            <RangeSlider
              id="loan-slider-extra"
              name="loan-extra-monthly"
              label={`Extra monthly (${currency})`}
              min={0}
              max={20_000}
              step={100}
              value={extra}
              onChange={(e) => setExtra(Number(e.target.value))}
              displayValue={formatMoney(extra, currency)}
            />
            <div className="flex flex-col gap-3 rounded-lg border p-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div>
                <Label htmlFor="loan-variable-rate" className="text-sm font-medium">
                  Variable rate?
                </Label>
                <p id="loan-variable-hint" className="text-xs text-muted-foreground">
                  Illustrative ±1% corridor note only.
                </p>
              </div>
              <Switch
                id="loan-variable-rate"
                checked={variableLoan}
                onCheckedChange={setVariableLoan}
                aria-describedby="loan-variable-hint"
                aria-label="Toggle variable-rate illustration note"
              />
            </div>
            {variableLoan ?
              <p className="text-xs text-muted-foreground">
                Corridor: APR between {(annualRate - 1).toFixed(2)}% and {(annualRate + 1).toFixed(2)}%. Real
                payments would drift with index — this calculator holds the midpoint APR.
              </p>
            : null}
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 dark:border-zinc-800 sm:p-4">
              <p className="text-xs text-muted-foreground">Monthly payment</p>
              <p className="text-3xl font-semibold tabular-nums">{formatMoney(base, currency)}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Scheduled payment over {months} months (before extra principal).
              </p>
            </div>
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total paid (with extra)</dt>
                <dd className="tabular-nums">{formatMoney(totalPaid(tableExtra), currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total interest (with extra)</dt>
                <dd className="tabular-nums text-orange-600 dark:text-orange-400">
                  {formatMoney(totalInterest(tableExtra), currency)}
                </dd>
              </div>
              {extra > 0 ?
                <div className="flex justify-between text-xs">
                  <dt className="text-emerald-700 dark:text-emerald-400">Boost vs baseline</dt>
                  <dd className="tabular-nums text-emerald-700 dark:text-emerald-400">
                    Save {formatMoney(interestSaved, currency)} · {monthsSaved} fewer mo
                  </dd>
                </div>
              : null}
              {crossover ?
                <p className="text-xs text-muted-foreground">
                  Principal beats interest portion from month {crossover}.
                </p>
              : null}
              {principal > 0 && totalInterest(tableExtra) / principal > 0.3 ?
                (() => {
                  const tipExtra = Math.min(500, 20_000);
                  const tblTip = amortizationTable(principal, annualRate, months, extra + tipExtra);
                  const hiTip = Math.max(0, totalInterest(tableExtra) - totalInterest(tblTip));
                  const moTip = Math.max(0, tableExtra.length - tblTip.length);
                  return (
                    <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                      Tip: interest is chewing a large share of this loan vs principal. Roughly{" "}
                      {formatMoney(tipExtra, currency)} more per month could save about{" "}
                      {formatMoney(hiTip, currency)} in interest and finish about{" "}
                      {moTip} month{moTip === 1 ? "" : "s"} sooner vs your current slider (illustration only).
                    </p>
                  );
                })()
              : null}
            </dl>

            <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="min-w-0">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Principal remaining</p>
                <div className="h-[164px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height={164} minWidth={0} minHeight={0} debounce={50}>
                  <AreaChart
                    data={chartMerged.slice(0, Math.min(chartMerged.length, 120))}
                    margin={{ top: 4, right: 4, left: -18, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} width={36} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                      }}
                      formatter={(v) => formatMoney(Number(v ?? 0), currency)}
                    />
                    <Legend wrapperStyle={{ fontSize: "10px" }} />
                    <Area
                      type="monotone"
                      dataKey="principalBaseline"
                      name="Baseline"
                      stroke="#94a3b8"
                      fill="#94a3b840"
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="principalFast"
                      name="With extra"
                      stroke="#2563eb"
                      fill="#3b82f640"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="min-w-0">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Cumulative interest (with extra)</p>
                <div className="h-[164px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height={164} minWidth={0} minHeight={0} debounce={50}>
                  <AreaChart
                    data={chartMerged.slice(0, Math.min(chartMerged.length, 120))}
                    margin={{ top: 4, right: 4, left: -18, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} width={36} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                      }}
                      formatter={(v) => formatMoney(Number(v ?? 0), currency)}
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulativeInterest"
                      name="Interest"
                      stroke="#ea580c"
                      fill="#fb923c50"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 border-border dark:border-zinc-800">
        <CardHeader className="space-y-1 p-4 sm:p-6">
          <CardTitle className="text-sm font-medium text-muted-foreground">Amortization (first payments)</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
          <div className="-mx-1 max-h-52 overflow-auto overflow-x-auto rounded-lg border px-1 dark:border-zinc-800">
            <table className="w-full min-w-md text-left text-xs">
              <thead className="sticky top-0 bg-muted/90 backdrop-blur">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Payment</th>
                  <th className="px-3 py-2 font-medium text-primary">Principal</th>
                  <th className="px-3 py-2 font-medium text-orange-700 dark:text-orange-400">Interest</th>
                  <th className="px-3 py-2 font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {tableExtra.slice(0, 96).map((row) => (
                  <tr
                    key={row.month}
                    className={cn(
                      "border-t border-border/60",
                      row.principalPortion > row.interestPortion ? "bg-primary/5" : "",
                    )}
                  >
                    <td className="px-3 py-1.5 tabular-nums">{row.month}</td>
                    <td className="px-3 py-1.5 tabular-nums">{formatMoney(row.payment, currency)}</td>
                    <td className="px-3 py-1.5 tabular-nums">{formatMoney(row.principalPortion, currency)}</td>
                    <td className="px-3 py-1.5 tabular-nums">{formatMoney(row.interestPortion, currency)}</td>
                    <td className="px-3 py-1.5 tabular-nums">{formatMoney(row.balance, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
