"use client";

import { Plus } from "lucide-react";
import type { SerializedGoal } from "@/lib/simulations/page-data";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyGoalsState } from "./empty-goals-state";
import { GoalCard } from "./goal-card";

type GoalsGridProps = {
  goals: SerializedGoal[];
  selectedId: string | null;
  currency: string;
  onSelect: (goal: SerializedGoal) => void;
  onAddGoal: () => void;
};

export function GoalsGrid({ goals, selectedId, currency, onSelect, onAddGoal }: GoalsGridProps) {
  if (goals.length === 0) {
    return (
      <section id="sim-goals-section" aria-labelledby="sim-goals-heading" className="min-w-0 space-y-3">
        <h2 id="sim-goals-heading" className="text-sm font-medium text-muted-foreground">
          Active goals
        </h2>
        <EmptyGoalsState onAdd={onAddGoal} />
      </section>
    );
  }

  return (
    <section id="sim-goals-section" aria-labelledby="sim-goals-heading" className="min-w-0 space-y-3">
      <h2 id="sim-goals-heading" className="text-sm font-medium text-muted-foreground">
        Active goals
      </h2>
      <div className="grid min-w-0 grid-cols-1 gap-2 min-[380px]:grid-cols-2 min-[380px]:gap-3 lg:grid-cols-4">
        {goals.map((g) => (
          <GoalCard key={g.id} goal={g} currency={currency} selected={g.id === selectedId} onSelect={() => onSelect(g)} />
        ))}
        <Card
          role="button"
          tabIndex={0}
          className="touch-manipulation cursor-pointer border-dashed border-border bg-muted/30 transition-colors hover:bg-muted/50 dark:border-zinc-700"
          onClick={onAddGoal}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onAddGoal();
            }
          }}
        >
          <CardContent className="flex min-h-[108px] flex-col items-center justify-center gap-2 p-3 text-center text-sm text-muted-foreground min-[380px]:min-h-[120px] min-[380px]:p-4">
            <Plus className="size-8 text-primary" aria-hidden />
            <span className="font-medium text-foreground">New goal</span>
            <span className="text-xs">Plan a purchase or fund</span>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
