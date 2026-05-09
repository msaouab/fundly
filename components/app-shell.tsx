"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { startTransition, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SidebarUserProfile } from "@/components/sidebar-user-profile";
import { appNavItems } from "@/lib/nav";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_KEY = "fundly-sidebar-collapsed";

type AppShellProps = {
  children: React.ReactNode;
  user: { email?: string | null; name?: string | null };
};

function navItemClass(active: boolean, collapsed: boolean) {
  return cn(
    "flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors",
    collapsed ? "justify-center px-2" : "px-3",
    active
      ? "bg-teal-50 text-teal-900 dark:bg-teal-950/60 dark:text-teal-100"
      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
  );
}

const mobileItemClass = (active: boolean) =>
  [
    "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors",
    active
      ? "text-teal-700 dark:text-teal-400"
      : "text-zinc-600 dark:text-zinc-400",
  ].join(" ");

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1") {
        startTransition(() => {
          setSidebarCollapsed(true);
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <TooltipProvider>
      <div className="flex min-h-full bg-zinc-50 dark:bg-zinc-950">
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-dvh flex-col border-r border-zinc-200 bg-white transition-[width] duration-200 ease-out md:flex dark:border-zinc-800 dark:bg-zinc-900",
          sidebarCollapsed ? "w-16" : "w-56",
        )}
        aria-label="Main navigation"
      >
        <div
          className={cn(
            "flex shrink-0 items-center border-b border-zinc-200 dark:border-zinc-800",
            sidebarCollapsed
              ? "flex-col gap-2 px-2 py-3"
              : "h-14 justify-between gap-2 px-3",
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/"
                className={cn(
                  "flex min-w-0 items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50",
                  sidebarCollapsed && "justify-center",
                )}
                title="Fundly home"
              >
                <Image
                  src="/fundly.webp"
                  alt=""
                  width={32}
                  height={32}
                  className="size-8 shrink-0 rounded-lg object-cover"
                />
                {!sidebarCollapsed ? (
                  <span className="truncate">Fundly</span>
                ) : (
                  <span className="sr-only">Fundly home</span>
                )}
              </Link>
            </TooltipTrigger>
            <TooltipContent>Fundly home</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 text-zinc-600 dark:text-zinc-400"
                onClick={toggleSidebar}
                aria-expanded={!sidebarCollapsed}
                aria-controls="app-sidebar-nav"
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="size-5" aria-hidden />
                ) : (
                  <ChevronLeft className="size-5" aria-hidden />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            </TooltipContent>
          </Tooltip>
        </div>
        <nav
          id="app-sidebar-nav"
          className="flex flex-1 overflow-visible p-3"
          aria-label="Main"
        >
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-visible">
            {appNavItems.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href ||
                (href !== "/" && pathname.startsWith(`${href}/`));
              return (
                <Tooltip key={href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={href}
                      className={navItemClass(active, sidebarCollapsed)}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="size-5 shrink-0 opacity-80" aria-hidden />
                      <span className={sidebarCollapsed ? "sr-only" : ""}>{label}</span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>{label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </nav>
        <div className="mt-auto shrink-0 border-t border-zinc-200 p-3 dark:border-zinc-800">
          <SidebarUserProfile
            name={user.name}
            email={user.email}
            collapsed={sidebarCollapsed}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className={cn(
                  "mt-3 flex w-full items-center gap-3 rounded-lg py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
                  sidebarCollapsed ? "justify-center px-2" : "px-3",
                )}
              >
                <LogOut className="size-5 shrink-0 opacity-80" aria-hidden />
                <span className={sidebarCollapsed ? "sr-only" : ""}>Sign out</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>Sign out</TooltipContent>
          </Tooltip>
        </div>
      </aside>

      <div
        className={cn(
          "flex min-h-full flex-1 flex-col transition-[padding] duration-200 ease-out",
          sidebarCollapsed ? "md:pl-16" : "md:pl-56",
        )}
      >
        <div className="flex items-center justify-end px-4 pt-3 md:hidden">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            aria-label="Sign out"
            title="Sign out"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <LogOut className="size-4 shrink-0" aria-hidden />
          </button>
        </div>
        <main className="flex-1 px-4 py-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0))] md:px-8 md:py-8 md:pb-8">
          {children}
        </main>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom,0px)] pt-1 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.08)] backdrop-blur-md md:hidden dark:border-zinc-800 dark:bg-zinc-900/95"
        aria-label="Mobile main"
      >
        {appNavItems.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/" && pathname.startsWith(`${href}/`));
          return (
            <Link
              key={href}
              href={href}
              className={mobileItemClass(active)}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="size-6 shrink-0" aria-hidden />
              <span className="max-w-18 truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
      </div>
    </TooltipProvider>
  );
}
