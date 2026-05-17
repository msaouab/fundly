import { AppPage, AppPageOverview } from "@/components/ledger-page-layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <AppPage size="6xl" gap={8}>
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <AppPageOverview>
        <div className="grid gap-4 md:grid-cols-12">
          <Card className="border-border md:col-span-7 lg:col-span-8 dark:border-zinc-800">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-11 w-48" />
              <Skeleton className="h-4 w-56" />
            </CardContent>
          </Card>
          <Card className="border-border md:col-span-5 lg:col-span-4 dark:border-zinc-800">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-3 w-full max-w-[200px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-24" />
              <Skeleton className="mt-3 h-3 w-full max-w-[220px]" />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-12">
          <Skeleton className="h-28 md:col-span-3" />
          <Skeleton className="h-28 md:col-span-3" />
          <Skeleton className="h-28 md:col-span-6" />
        </div>
      </AppPageOverview>

      <div className="grid gap-6 lg:grid-cols-[1fr,minmax(0,320px)]">
        <Card className="border-border dark:border-zinc-800">
          <CardHeader>
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-4 w-full max-w-sm" />
          </CardHeader>
          <CardContent className="pb-4">
            <Skeleton className="h-[280px] w-full" />
          </CardContent>
        </Card>
        <Card className="border-border dark:border-zinc-800">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full max-w-[200px]" />
          </CardHeader>
          <CardContent className="pb-4">
            <Skeleton className="h-[260px] w-full md:h-[280px]" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border dark:border-zinc-800">
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
        <Card className="border-border dark:border-zinc-800">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-52" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </CardContent>
        </Card>
      </div>
    </AppPage>
  );
}
