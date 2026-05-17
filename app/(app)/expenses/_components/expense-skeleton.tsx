import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LedgerPage, LedgerPageOverview, LedgerPageActions, LedgerPageTable } from "@/components/ledger-page-layout";

export function ExpenseSkeleton() {
  return (
    <LedgerPage>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <LedgerPageOverview>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-border dark:border-zinc-800">
              <CardHeader className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-36" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </LedgerPageOverview>
      <LedgerPageActions>
        <Card className="border-border dark:border-zinc-800">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </CardContent>
        </Card>
      </LedgerPageActions>
      <LedgerPageTable>
        <Card className="w-full border-border dark:border-zinc-800">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </CardContent>
        </Card>
      </LedgerPageTable>
    </LedgerPage>
  );
}
