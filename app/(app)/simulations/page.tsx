import { Suspense } from "react";
import type { Metadata } from "next";
import { SimSkeleton } from "./_components/sim-skeleton";
import { SimulationsPageContent } from "./simulations-content";

export const metadata: Metadata = {
  title: "Simulations",
};

export default function SimulationsPage() {
  return (
    <Suspense fallback={<SimSkeleton />}>
      <SimulationsPageContent />
    </Suspense>
  );
}
