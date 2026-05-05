"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, addMonths, differenceInMonths } from "date-fns";
import { AlertTriangle, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import type { SerializedGoal } from "@/lib/simulations/page-data";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { monthsToGoal, requiredMonthly } from "../utils/savings";
import { updateGoalSavings } from "../actions";

type GoalCardProps = {
  goal: SerializedGoal;
  currency: string;
  selected: boolean;
  onSelect: () => void;
};

export function GoalCard({ goal, currency, selected, onSelect }: GoalCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [savingsOpen, setSavingsOpen] = useState(false);
  const [addAmount, setAddAmount] = useState("");

  const target = goal.targetAmount;
  const saved = goal.savedAmount;
  const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
  const remaining = Math.max(0, target - saved);

  const monthsLeftComputed = monthsToGoal(target, saved, goal.monthlyContrib, goal.interestRate);
  const finiteMonths = Number.isFinite(monthsLeftComputed) ? monthsLeftComputed : null;

  let deadlineBehind: { monthsToDeadline: number; catchUp: number } | null = null;
  if (goal.deadline) {
    const deadline = new Date(goal.deadline);
    const monthsToDeadline = Math.max(0, differenceInMonths(deadline, new Date()));
    if (
      finiteMonths !== null &&
      monthsToDeadline > 0 &&
      finiteMonths > monthsToDeadline &&
      finiteMonths !== Number.POSITIVE_INFINITY
    ) {
      const catchUp = requiredMonthly(target, saved, monthsToDeadline, goal.interestRate);
      deadlineBehind =
        Number.isFinite(catchUp) && catchUp >= 0 ? { monthsToDeadline, catchUp } : null;
    }
  }

  const eta =
    finiteMonths !== null ?
      format(addMonths(new Date(), finiteMonths), "MMMM yyyy")
    : null;

  let barClass = "bg-blue-500 dark:bg-blue-600";
  if (pct >= 75) barClass = "bg-emerald-500 dark:bg-emerald-400";
  else if (pct >= 50) barClass = "bg-amber-500 dark:bg-amber-400";

  const etaLabel =
    finiteMonths !== null ?
      finiteMonths === 0 ?
        "Goal reached"
      : `${finiteMonths} month${finiteMonths === 1 ? "" : "s"} — ${eta}`
    : goal.monthlyContrib <= 0 ?
      "Add a monthly contribution"
    : "Increase contribution to reach target";

  const behind =
    finiteMonths !== null && finiteMonths > 120 ?
      "Long horizon — consider raising monthly savings."
    : null;

  function handleConfirmAdd(e: React.MouseEvent) {
    e.stopPropagation();
    const amount = Number.parseFloat(addAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a positive amount.");
      return;
    }
    const newSaved = saved + amount;
    startTransition(async () => {
      const res = await updateGoalSavings(goal.id, newSaved);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Added ${formatMoney(amount, currency)} to savings.`);
      setAddAmount("");
      setSavingsOpen(false);
      router.refresh();
    });
  }

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group/card touch-manipulation cursor-pointer border-border transition hover:shadow-md dark:border-zinc-800",
        selected ?
          "border-2 border-teal-500 bg-teal-500/6 ring-2 ring-teal-500/25 dark:border-teal-500 dark:bg-teal-400/10"
        : "hover:border-muted-foreground/25",
      )}
    >
      <CardContent className="space-y-2 p-3 pt-3 sm:space-y-3 sm:p-4 sm:pt-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xl leading-none sm:text-2xl" aria-hidden>
            {goal.emoji}
          </p>
          <p className="line-clamp-2 min-w-0 flex-1 text-left text-sm font-semibold text-foreground sm:line-clamp-3">
            {goal.name}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <span className="text-xs text-muted-foreground tabular-nums">{pct.toFixed(0)}%</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 opacity-70 hover:opacity-100"
              aria-label="Update savings"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setSavingsOpen((o) => !o);
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <PlusCircle className="size-4 text-primary" />
            </Button>
          </div>
        </div>

        {savingsOpen ?
          <div
            className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/25 p-2 dark:border-zinc-800"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="min-w-30 flex-1 space-y-1">
              <label htmlFor={`add-save-${goal.id}`} className="text-[10px] text-muted-foreground">
                Add {currency}
              </label>
              <Input
                id={`add-save-${goal.id}`}
                name={`goal-add-save-${goal.id}`}
                type="number"
                inputMode="decimal"
                min={0}
                step="100"
                className="h-9 text-sm"
                value={addAmount}
                placeholder="500"
                onChange={(e) => setAddAmount(e.target.value)}
              />
            </div>
            <Button type="button" size="sm" disabled={pending} onClick={handleConfirmAdd}>
              Confirm
            </Button>
          </div>
        : null}

        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full transition-all", barClass)} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex flex-wrap justify-between gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>
            {formatMoney(saved, goal.currency)} / {formatMoney(target, goal.currency)}
          </span>
          <span className="tabular-nums">Need {formatMoney(remaining, goal.currency)}</span>
        </div>
        <p className="text-xs leading-snug text-muted-foreground">{etaLabel}</p>
        {deadlineBehind ?
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-red-600 dark:text-red-400">
              <AlertTriangle className="size-3 shrink-0" aria-hidden />
              Behind schedule
            </div>
            <span className="text-muted-foreground">
              Need {formatMoney(deadlineBehind.catchUp, goal.currency)}
              /mo to reach target by deadline ({deadlineBehind.monthsToDeadline} mo left).
            </span>
          </div>
        : null}
        {behind ? <p className="text-xs text-amber-700 dark:text-amber-400">{behind}</p> : null}
      </CardContent>
    </Card>
  );
}
