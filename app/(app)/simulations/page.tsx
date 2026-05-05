import { Suspense } from "react";
import type { Metadata } from "next";
import { SimSkeleton } from "./_components/sim-skeleton";
import { SimulationsPageContent } from "./simulations-content";

export const metadata: Metadata = {
  title: "Simulations",
};

/** Uses auth-backed data fetch + Prisma; must not participate in mistaken static shells. */
export const dynamic = "force-dynamic";

export default function SimulationsPage() {
  return (
    <Suspense fallback={<SimSkeleton />}>
      <SimulationsPageContent />
    </Suspense>
  );
}
