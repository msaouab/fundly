import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SimulationsLoadErrorProps = {
  /** Short excerpt for admins; avoids dumping server internals into the DOM. */
  detail?: string | null;
};

export function SimulationsLoadError({ detail }: SimulationsLoadErrorProps) {
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Card className="border-destructive/30 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">Simulations could not load</CardTitle>
          <CardDescription>
            Something went wrong while fetching goals or saved runs from the database on the server.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Common after a deploy when the database has not picked up newer tables (<code className="text-foreground">goals</code>
            , <code className="text-foreground">simulations</code>). Apply the current Prisma schema to your production DB
            (for example{' '}
            <code className="rounded-md bg-muted px-1 py-0.5 text-xs text-foreground">npx prisma db push</code> or{' '}
            <code className="rounded-md bg-muted px-1 py-0.5 text-xs text-foreground">prisma migrate deploy</code>), then redeploy if needed.
          </p>
          {detail ?
            <p className="rounded-md border border-border bg-muted/40 p-3 font-mono text-xs text-foreground dark:border-zinc-800">
              {detail}
            </p>
          : null}
          <p className="text-xs">
            Check your host logs with the digest from the error overlay for full stack traces.
          </p>
          <Link href="/dashboard" className="inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline">
            Back to dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
