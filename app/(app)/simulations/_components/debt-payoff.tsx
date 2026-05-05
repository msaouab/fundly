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
import { debtBalanceSeries, simulateDebtPayoff } from "../utils/debt";
import type { DebtItem } from "../utils/debt";
import { RangeSlider } from "./range-slider";

const COLORS = ["#0d9488", "#6366f1", "#eab308", "#f97316", "#ec4899", "#64748b"];

type DebtPayoffProps = {
  currency: string;
  onModelChange: (config: Record<string, unknown>, result: Record<string, unknown>) => void;
};

export function DebtPayoff({ currency, onModelChange }: DebtPayoffProps) {
  const [debts, setDebts] = useState<DebtItem[]>(() => [
    { id: "1", name: "Card", balance: 8000, annualRatePercent: 22.9, minPayment: 200 },
    { id: "2", name: "Car loan", balance: 41000, annualRatePercent: 6.5, minPayment: 520 },
    { id: "3", name: "Store line", balance: 2200, annualRatePercent: 15, minPayment: 80 },
  ]);
  const [strategy, setStrategy] = useState<"AVALANCHE" | "SNOWBALL">("AVALANCHE");
  const [extra, setExtra] = useState(150);

  const av = useMemo(() => simulateDebtPayoff(debts, "AVALANCHE", extra), [debts, extra]);
  const sn = useMemo(() => simulateDebtPayoff(debts, "SNOWBALL", extra), [debts, extra]);

  const lineData = useMemo(() => {
    const ids = debts.map((d) => d.id);
    const res = strategy === "AVALANCHE" ? av : sn;
    return debtBalanceSeries(res, ids);
  }, [strategy, av, sn, debts]);

  useEffect(() => {
    onModelChange(
      { debts, strategy, extraMonthly: extra },
      {
        avalancheInterest: av.totalInterest,
        snowballInterest: sn.totalInterest,
        avalancheMonths: av.monthsToDebtFree,
        snowballMonths: sn.monthsToDebtFree,
        interestDifference: Math.max(0, sn.totalInterest - av.totalInterest),
      },
    );
  }, [av.monthsToDebtFree, av.totalInterest, debts, extra, onModelChange, sn.monthsToDebtFree, sn.totalInterest, strategy]);

  const diffInterest = Math.max(0, sn.totalInterest - av.totalInterest);
  const strategiesIdentical =
    Math.abs(av.totalInterest - sn.totalInterest) < 1 && av.monthsToDebtFree === sn.monthsToDebtFree;

  return (
    <div className="grid min-w-0 gap-4">
      <Card className="min-w-0 border-border dark:border-zinc-800">
        <CardHeader className="space-y-1 p-4 sm:p-6">
          <CardTitle className="text-base">Debt payoff planner</CardTitle>
          <CardDescription>Compare avalanche (highest rate) vs snowball (smallest balance).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-4 pt-0 sm:space-y-6 sm:px-6 sm:pb-6">
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:gap-2">
            <Button
              type="button"
              variant={strategy === "AVALANCHE" ? "default" : "outline"}
              size="sm"
              className="min-h-11 w-full touch-manipulation sm:min-h-9 sm:w-auto"
              onClick={() => setStrategy("AVALANCHE")}
            >
              Avalanche
            </Button>
            <Button
              type="button"
              variant={strategy === "SNOWBALL" ? "default" : "outline"}
              size="sm"
              className="min-h-11 w-full touch-manipulation sm:min-h-9 sm:w-auto"
              onClick={() => setStrategy("SNOWBALL")}
            >
              Snowball
            </Button>
          </div>

          <RangeSlider
            id="debt-slider-extra"
            name="debt-extra-monthly"
            label={`Extra monthly toward debt (${currency})`}
            min={0}
            max={10_000}
            step={50}
            value={extra}
            onChange={(e) => setExtra(Number(e.target.value))}
            displayValue={formatMoney(extra, currency)}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Debts</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const id = crypto.randomUUID();
                  setDebts((d) => [
                    ...d,
                    {
                      id,
                      name: "New debt",
                      balance: 1000,
                      annualRatePercent: 12,
                      minPayment: 50,
                    },
                  ]);
                }}
              >
                Add debt
              </Button>
            </div>
            {debts.map((d) => (
              <div
                key={d.id}
                className="grid gap-2 rounded-lg border p-3 sm:grid-cols-12 dark:border-zinc-800 min-[480px]:gap-3"
              >
                <div className="sm:col-span-4">
                  <Label htmlFor={`debt-${d.id}-name`} className="text-xs text-muted-foreground">
                    Name
                  </Label>
                  <Input
                    id={`debt-${d.id}-name`}
                    name={`debt-${d.id}-name`}
                    value={d.name}
                    onChange={(e) =>
                      setDebts((rows) =>
                        rows.map((r) => (r.id === d.id ? { ...r, name: e.target.value } : r)),
                      )
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor={`debt-${d.id}-balance`} className="text-xs text-muted-foreground">
                    Balance
                  </Label>
                  <Input
                    id={`debt-${d.id}-balance`}
                    name={`debt-${d.id}-balance`}
                    type="number"
                    value={d.balance}
                    onChange={(e) =>
                      setDebts((rows) =>
                        rows.map((r) =>
                          r.id === d.id ? { ...r, balance: Number(e.target.value) || 0 } : r,
                        ),
                      )
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor={`debt-${d.id}-apr`} className="text-xs text-muted-foreground">
                    APR %
                  </Label>
                  <Input
                    id={`debt-${d.id}-apr`}
                    name={`debt-${d.id}-apr`}
                    type="number"
                    value={d.annualRatePercent}
                    onChange={(e) =>
                      setDebts((rows) =>
                        rows.map((r) =>
                          r.id === d.id ?
                            { ...r, annualRatePercent: Number(e.target.value) || 0 }
                          : r,
                        ),
                      )
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor={`debt-${d.id}-minpay`} className="text-xs text-muted-foreground">
                    Min pay
                  </Label>
                  <Input
                    id={`debt-${d.id}-minpay`}
                    name={`debt-${d.id}-minpay`}
                    type="number"
                    value={d.minPayment}
                    onChange={(e) =>
                      setDebts((rows) =>
                        rows.map((r) =>
                          r.id === d.id ?
                            { ...r, minPayment: Number(e.target.value) || 0 }
                          : r,
                        ),
                      )
                    }
                  />
                </div>
                <div className="flex items-end sm:col-span-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    disabled={debts.length < 2}
                    onClick={() => setDebts((rows) => rows.filter((r) => r.id !== d.id))}
                  >
                    Remove
                  </Button>
                </div>
                <p className="sm:col-span-12 text-xs text-muted-foreground">
                  Payoff (avalanche · extra): mo {av.payoffMonthById[d.id] ?? "—"} · snowball mo{" "}
                  {sn.payoffMonthById[d.id] ?? "—"}
                </p>
              </div>
            ))}
          </div>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/30 p-3 dark:border-zinc-800 sm:p-4">
              <p className="text-xs text-muted-foreground">Total interest — Avalanche</p>
              <p className="text-xl font-semibold tabular-nums">{formatMoney(av.totalInterest, currency)}</p>
              <p className="text-xs text-muted-foreground">{av.monthsToDebtFree} months to debt-free</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 dark:border-zinc-800 sm:p-4">
              <p className="text-xs text-muted-foreground">Total interest — Snowball</p>
              <p className="text-xl font-semibold tabular-nums">{formatMoney(sn.totalInterest, currency)}</p>
              <p className="text-xs text-muted-foreground">{sn.monthsToDebtFree} months to debt-free</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-500/10 p-3 dark:border-emerald-900 sm:p-4 sm:col-span-2">
              <p className="text-xs text-emerald-800 dark:text-emerald-200">
                Estimated extra cost of Snowball vs Avalanche (interest only)
              </p>
              <p className="text-lg font-semibold tabular-nums text-emerald-800 dark:text-emerald-300">
                {formatMoney(diffInterest, currency)}
              </p>
            </div>
          </div>

          {strategiesIdentical ?
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground dark:border-zinc-800">
              Avalanche and snowball match here because payoff order doesn&apos;t change total interest — your debts
              share compatible rates or dominance. Either approach works equally for this illustration.
            </div>
          : <div className="h-[300px] w-full min-w-0">
              <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={0} debounce={50}>
                <LineChart
                  data={lineData.slice(0, Math.max(av.monthsToDebtFree, sn.monthsToDebtFree) + 2)}
                  margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                    formatter={(v) => formatMoney(Number(v ?? 0), currency)}
                  />
                  <Legend />
                  {debts.map((d, i) => (
                    <Line
                      key={d.id}
                      type="monotone"
                      dataKey={d.id}
                      name={d.name}
                      stroke={COLORS[i % COLORS.length]}
                      dot={false}
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          }
        </CardContent>
      </Card>
    </div>
  );
}
