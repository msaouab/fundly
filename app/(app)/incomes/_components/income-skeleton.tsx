import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LedgerPage, LedgerPageOverview, LedgerPageActions, LedgerPageTable } from "@/components/ledger-page-layout";

export function IncomeSkeleton() {
  return (
    <LedgerPage>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <LedgerPageOverview>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-border dark:border-zinc-800">
              <CardHeader className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="rounded-xl border border-border p-4 dark:border-zinc-800">
          <Skeleton className="mb-3 h-4 w-24" />
          <div className="flex gap-3 overflow-hidden pb-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 min-w-[180px] shrink-0 rounded-xl" />
            ))}
          </div>
        </div>
      </LedgerPageOverview>
      <LedgerPageActions>
        <Card className="col-span-full border-border dark:border-zinc-800">
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
            <Skeleton className="h-6 w-40" />
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
