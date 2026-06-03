import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import type { IncomeSource } from "../types";
import type { IncomeType } from "@/generated/prisma/enums";

function typeVariant(t: IncomeType) {
  switch (t) {
    case "SALARY":
      return "salary" as const;
    case "FREELANCE":
      return "freelance" as const;
    case "PASSIVE":
      return "passive" as const;
    case "BONUS":
      return "bonus" as const;
    default:
      return "other" as const;
  }
}

type IncomeSourcesProps = {
  sources: IncomeSource[];
  currency: string;
};

export function IncomeSources({ sources, currency }: IncomeSourcesProps) {
  if (!sources.length) {
    return (
      <EmptyState
        variant="breakdown"
        size="sm"
        title="No income streams yet"
        description="Add income entries to see totals grouped by source."
      />
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">By source</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 md:flex-wrap md:overflow-visible">
        {sources.map((s) => (
          <Card
            key={s.name}
            className="min-w-[200px] shrink-0 border-border bg-background dark:border-zinc-800 dark:bg-zinc-900"
          >
            <CardHeader className="space-y-2 pb-2">
              <CardTitle className="text-base leading-tight">{s.name}</CardTitle>
              <Badge variant={typeVariant(s.type)}>{s.type}</Badge>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <p className="text-lg font-semibold tabular-nums text-foreground">
                {formatMoney(s.total, currency)}
              </p>
              <p>
                {s.count} {s.count === 1 ? "entry" : "entries"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
