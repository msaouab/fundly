"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookmarkPlus, Copy, FlaskConical, Library, Loader2 } from "lucide-react";
import type { SerializedGoal, SerializedSimulation } from "@/lib/simulations/page-data";
import { saveSimulation } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddGoalModal } from "./add-goal-modal";
import { DebtPayoff } from "./debt-payoff";
import { GoalsGrid } from "./goals-grid";
import { LoanSimulator } from "./loan-simulator";
import { NetWorthProjection } from "./networth-projection";
import type { SavingsSimulatorConfigSnapshot } from "./savings-simulator";
import { SavingsSimulator } from "./savings-simulator";
import { SavedPlansSheet } from "./saved-plans-sheet";
import type { SimTabId } from "./sim-tabs";
import { SimTabs } from "./sim-tabs";
import { WhatIfBuilder } from "./whatif-builder";
import {
  monthsToGoal,
  projectionData,
  requiredMonthly,
  totalInterestEarned,
} from "../utils/savings";
import { formatMoney } from "@/lib/money";

type SimulationsViewProps = {
  goals: SerializedGoal[];
  simulations: SerializedSimulation[];
  currency: string;
  monthlyIncomeHint: number;
  baselineMonthlySurplus: number;
  hintsMonthLabel: string;
  netWorthHint: number;
};

function summarizeSavings(snapshot: SavingsSimulatorConfigSnapshot | null): Record<string, unknown> {
  if (!snapshot) return {};
  const { targetAmount, savedAmount, monthlyContrib, annualRatePercent, deadlineMode, deadlineMonths } = snapshot;
  if (deadlineMode && deadlineMonths) {
    const req = requiredMonthly(targetAmount, savedAmount, deadlineMonths, annualRatePercent);
    const rows = projectionData(targetAmount, savedAmount, req, annualRatePercent, deadlineMonths + 6);
    return {
      deadlineMonths,
      requiredMonthly: req,
      interestHint: totalInterestEarned(rows, savedAmount, req),
      targetAmount,
    };
  }
  const m = monthsToGoal(targetAmount, savedAmount, monthlyContrib, annualRatePercent);
  const rows =
    Number.isFinite(m) ?
      projectionData(targetAmount, savedAmount, monthlyContrib, annualRatePercent, (m as number) + 6)
    : projectionData(targetAmount, savedAmount, monthlyContrib, annualRatePercent, 120);
  return {
    monthsToGoal: Number.isFinite(m) ? m : null,
    interestHint: totalInterestEarned(rows, savedAmount, monthlyContrib),
    targetAmount,
  };
}

export function SimulationsView({
  goals,
  simulations,
  currency,
  monthlyIncomeHint,
  baselineMonthlySurplus,
  hintsMonthLabel,
  netWorthHint,
}: SimulationsViewProps) {
  const router = useRouter();
  const savingsSnapRef = useRef<SavingsSimulatorConfigSnapshot | null>(null);
  const loanPayloadRef = useRef<{ config: Record<string, unknown>; result: Record<string, unknown> }>({
    config: {},
    result: {},
  });
  const debtPayloadRef = useRef<{ config: Record<string, unknown>; result: Record<string, unknown> }>({
    config: {},
    result: {},
  });
  const whatIfPayloadRef = useRef<{ config: Record<string, unknown>; result: Record<string, unknown> }>({
    config: {},
    result: {},
  });
  const netWorthPayloadRef = useRef<{ config: Record<string, unknown>; result: Record<string, unknown> }>({
    config: {},
    result: {},
  });

  const scrollToGoals = useCallback(() => {
    document.getElementById("sim-goals-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const [tab, setTab] = useState<SimTabId>("SAVINGS_GOAL");
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(goals[0]?.id ?? null);
  const [addGoalOpen, setAddGoalOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [pending, startTransition] = useTransition();

  /** Falls back when the stored id is missing from `goals` (e.g. after a delete or refresh). */
  const effectiveSelectedGoalId = useMemo(() => {
    if (selectedGoalId != null && goals.some((g) => g.id === selectedGoalId)) {
      return selectedGoalId;
    }
    return goals[0]?.id ?? null;
  }, [goals, selectedGoalId]);

  const selectedGoal = useMemo(
    () => goals.find((g) => g.id === effectiveSelectedGoalId) ?? null,
    [goals, effectiveSelectedGoalId],
  );

  const setSavingsSnap = useCallback((snap: SavingsSimulatorConfigSnapshot) => {
    savingsSnapRef.current = snap;
  }, []);

  const reportLoan = useCallback((config: Record<string, unknown>, result: Record<string, unknown>) => {
    loanPayloadRef.current = { config, result };
  }, []);

  const reportDebt = useCallback((config: Record<string, unknown>, result: Record<string, unknown>) => {
    debtPayloadRef.current = { config, result };
  }, []);

  const reportWhatIf = useCallback((config: Record<string, unknown>, result: Record<string, unknown>) => {
    whatIfPayloadRef.current = { config, result };
  }, []);

  const reportNetWorth = useCallback((config: Record<string, unknown>, result: Record<string, unknown>) => {
    netWorthPayloadRef.current = { config, result };
  }, []);

  const monthlyExpenseHint =
    monthlyIncomeHint > 0 ?
      Math.max(0, monthlyIncomeHint - Math.max(0, baselineMonthlySurplus))
    : null;

  const handleCopyResults = useCallback(async () => {
    const lines: string[] = [`Fundly simulation — snapshot from ${hintsMonthLabel}`];
    lines.push("", `Tab: ${tab.split("_").join(" ")}`, `Currency: ${currency}`);

    if (tab === "SAVINGS_GOAL") {
      const snap = savingsSnapRef.current;
      const res = summarizeSavings(snap);
      if (!snap) {
        lines.push("(Adjust sliders to populate results)");
      } else {
        lines.push(
          `${snap.emoji} ${snap.goalName}`,
          `Target: ${formatMoney(snap.targetAmount, currency)}`,
          `Monthly: ${formatMoney(snap.monthlyContrib, currency)}`,
          JSON.stringify(res),
        );
      }
    }
    if (tab === "LOAN") {
      lines.push(JSON.stringify(loanPayloadRef.current.result));
    }
    if (tab === "DEBT_PAYOFF") {
      lines.push(JSON.stringify(debtPayloadRef.current.result));
    }
    if (tab === "WHAT_IF") {
      lines.push(JSON.stringify(whatIfPayloadRef.current.result));
    }
    if (tab === "NET_WORTH") {
      lines.push(JSON.stringify(netWorthPayloadRef.current.result));
    }

    const text = lines.join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("Results copied");
  }, [currency, hintsMonthLabel, tab]);

  const handleSaveSimulation = () => {
    const name = saveName.trim();
    if (!name) {
      toast.error("Name your snapshot before saving.");
      return;
    }

    const goalId =
      tab === "SAVINGS_GOAL" && effectiveSelectedGoalId ? effectiveSelectedGoalId
      : null;

    const type = tab;
    let configJson: Record<string, unknown> = {};
    let resultJson: Record<string, unknown> = {};

    switch (tab) {
      case "SAVINGS_GOAL":
        configJson = { ...(savingsSnapRef.current ?? {}) };
        resultJson = summarizeSavings(savingsSnapRef.current);
        break;
      case "LOAN":
        configJson = loanPayloadRef.current.config;
        resultJson = loanPayloadRef.current.result;
        break;
      case "DEBT_PAYOFF":
        configJson = debtPayloadRef.current.config;
        resultJson = debtPayloadRef.current.result;
        break;
      case "WHAT_IF":
        configJson = whatIfPayloadRef.current.config;
        resultJson = whatIfPayloadRef.current.result;
        break;
      case "NET_WORTH":
        configJson = netWorthPayloadRef.current.config;
        resultJson = netWorthPayloadRef.current.result;
        break;
      default:
        break;
    }

    startTransition(async () => {
      const res = await saveSimulation({
        goalId,
        type,
        name,
        configJson,
        resultJson,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Saved “${name}”.`);
      setSaveName("");
    });
  };

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-5 pb-28 sm:gap-6 sm:pb-10">
      <header className="flex flex-col gap-4 sm:gap-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:size-10">
            <FlaskConical className="size-[1.15rem] sm:size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Simulations</h1>
            <p className="mt-1 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground">
              Client-side calculators for goals, borrowing, payoff strategies, and simple stress tests — save snapshots
              to revisit assumptions later.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/35 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <BookmarkPlus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0">
                  <Label htmlFor="snapshot-name" className="text-sm font-medium leading-none text-foreground">
                    Save to your library
                  </Label>
                  <p id="snapshot-name-hint" className="mt-1 text-xs leading-snug text-muted-foreground">
                    Name this run so you can recognize it in saved plans.
                  </p>
                </div>
              </div>
              <Input
                id="snapshot-name"
                name="simulation-snapshot-name"
                autoComplete="off"
                aria-describedby="snapshot-name-hint"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Example: Car fund — 2 500 / month"
                className="h-11 w-full bg-background text-base sm:h-10 sm:text-sm"
              />
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row md:w-auto md:flex-col lg:flex-row lg:gap-2">
              <Button
                type="button"
                className="h-11 w-full touch-manipulation md:h-10 lg:min-w-38"
                onClick={handleSaveSimulation}
                disabled={pending || !saveName.trim()}
              >
                {pending ?
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                : <BookmarkPlus className="mr-2 size-4 opacity-90" aria-hidden />}
                Save snapshot
              </Button>
              <Button type="button" variant="outline" className="h-11 md:h-10" onClick={() => handleCopyResults()}>
                <Copy className="mr-2 size-4" aria-hidden />
                Copy results
              </Button>
              <SavedPlansSheet
                simulations={simulations}
                currency={currency}
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full touch-manipulation md:h-10 lg:min-w-38"
                  >
                    <Library className="mr-2 size-4 opacity-80" aria-hidden />
                    Saved plans
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      </header>

      <GoalsGrid
        goals={goals}
        selectedId={effectiveSelectedGoalId}
        currency={currency}
        onSelect={(g) => {
          setSelectedGoalId(g.id);
          setTab("SAVINGS_GOAL");
        }}
        onAddGoal={() => setAddGoalOpen(true)}
      />

      <AddGoalModal open={addGoalOpen} onOpenChange={setAddGoalOpen} defaultCurrency={currency} />

      <section aria-label="Simulator workspace" className="min-w-0 space-y-3 sm:space-y-4">
        <SimTabs value={tab} onValueChange={setTab} />
        {monthlyIncomeHint > 0 ?
          <p className="text-pretty text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Income hint (this month): {formatMoney(monthlyIncomeHint, currency)}. Update via Incomes / Expenses.
          </p>
        : null}

        <div key={tab} className="min-h-[260px] min-w-0 sm:min-h-[320px]">
          {tab === "SAVINGS_GOAL" ?
            <SavingsSimulator
              goal={selectedGoal}
              monthlyIncomeHint={monthlyIncomeHint}
              currency={currency}
              onSnapshot={setSavingsSnap}
              onSwitchGoal={scrollToGoals}
            />
          : tab === "LOAN" ?
            <LoanSimulator currency={currency} onModelChange={reportLoan} />
          : tab === "DEBT_PAYOFF" ?
            <DebtPayoff currency={currency} onModelChange={reportDebt} />
          : tab === "WHAT_IF" ?
            <WhatIfBuilder
              currency={currency}
              baselineMonthlySurplus={baselineMonthlySurplus}
              monthlyIncomeHint={monthlyIncomeHint}
              monthlyExpenseHint={monthlyExpenseHint}
              hintsMonthLabel={hintsMonthLabel}
              selectedGoal={selectedGoal}
              onModelChange={reportWhatIf}
              onRefreshBaselineHints={() => {
                router.refresh();
                toast.success("Hints refreshed.");
              }}
            />
          : <NetWorthProjection
              currency={currency}
              netWorthHint={netWorthHint}
              baselineMonthlySurplus={baselineMonthlySurplus}
              monthlyIncomeHint={monthlyIncomeHint}
              onModelChange={reportNetWorth}
            />
          }
        </div>
      </section>
    </div>
  );
}
