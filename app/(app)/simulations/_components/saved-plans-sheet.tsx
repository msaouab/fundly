"use client";

import { format } from "date-fns";
import type { SerializedSimulation } from "@/lib/simulations/page-data";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatSimulationResultPreview } from "@/lib/simulations/sim-preview";

type SavedPlansSheetProps = {
  simulations: SerializedSimulation[];
  currency: string;
  trigger?: React.ReactNode;
};

export function SavedPlansSheet({ simulations, currency, trigger }: SavedPlansSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" size="sm">
            Saved plans
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Saved plans</SheetTitle>
          <SheetDescription>
            Snapshots persist on the server. Re-run live simulators for up-to-date projections.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {!simulations.length ?
            <p className="text-sm text-muted-foreground">No snapshots yet — save from the header.</p>
          : simulations.map((s) => {
              const preview = formatSimulationResultPreview(s.type, s.resultJson, currency);
              return (
                <article key={s.id} className="rounded-lg border border-border p-3 dark:border-zinc-800">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium leading-tight">{s.name}</p>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {s.type.split("_").join(" ")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{format(new Date(s.createdAt), "PPp")}</p>
                  {preview ?
                    <p className="mt-2 text-xs font-medium tabular-nums text-foreground">{preview}</p>
                  : null}
                </article>
              );
            })
          }
        </div>
      </SheetContent>
    </Sheet>
  );
}
