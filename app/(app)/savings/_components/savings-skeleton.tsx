import { AppPage, AppPageOverview } from "@/components/ledger-page-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SavingsSkeleton() {
  return (
    <AppPage size="6xl">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <AppPageOverview>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-28 md:col-span-2" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-28 md:col-span-2" />
          <Skeleton className="h-28" />
        </div>
      </AppPageOverview>
      <Card className="border-border dark:border-zinc-800">
        <CardContent className="px-4 pb-4 pt-4 sm:px-6">
          <Skeleton className="h-[320px] w-full" />
        </CardContent>
      </Card>
    </AppPage>
  );
}
