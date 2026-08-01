"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { HighchartsProvider } from "@/components/charts/highcharts-provider";
import { PwaRegister } from "@/components/pwa-register";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <HighchartsProvider>
        <PwaRegister />
        {children}
      </HighchartsProvider>
      <Toaster position="top-center" richColors closeButton />
    </SessionProvider>
  );
}
