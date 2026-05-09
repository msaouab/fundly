"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegister } from "@/components/pwa-register";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        forcedTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <PwaRegister />
        {children}
        <Toaster position="top-center" richColors closeButton />
      </ThemeProvider>
    </SessionProvider>
  );
}
