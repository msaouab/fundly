"use client";

import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";

type EmptyGoalsStateProps = {
  onAdd: () => void;
};

export function EmptyGoalsState({ onAdd }: EmptyGoalsStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <div className="mb-4 flex size-14 shrink-0 items-center justify-center rounded-full bg-teal-500/10 dark:bg-teal-400/15">
        <Target className="size-7 text-teal-600 dark:text-teal-400" aria-hidden />
      </div>
      <h3 className="mb-1 text-sm font-medium text-foreground">Plan your first goal</h3>
      <p className="mb-4 max-w-xs text-xs text-muted-foreground">
        Add a car, house, vacation or fund — we&apos;ll show you exactly how to get there.
      </p>
      <Button size="sm" type="button" className="bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-500" onClick={onAdd}>
        New goal
      </Button>
    </div>
  );
}
