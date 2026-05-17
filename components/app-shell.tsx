"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Suspense, startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { GlobalPeriodPicker, usePeriodNavQuery } from "@/components/global-period-picker";
import { PeriodNavProvider } from "@/components/period-nav-provider";
import type { SerializedPeriod } from "@/lib/period";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserProfileMenu } from "@/components/user-profile-menu";
import { appNavItems } from "@/lib/nav";
import { isPeriodAwareRoute } from "@/lib/period-routes";
import { hrefWithPeriod } from "@/lib/period-url";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_KEY = "fundly-sidebar-collapsed";

type AppShellProps = {
  children: React.ReactNode;
  user: { email?: string | null; name?: string | null };
  initialPeriodQuery: string | null;
  initialPeriod: SerializedPeriod | null;
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

function MobileNavItem({
  href,
  label,
  icon: Icon,
  pathname,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  pathname: string;
}) {
  const periodQuery = usePeriodNavQuery();
  const active =
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
  const resolvedHref = useMemo(() => {
    if (!isPeriodAwareRoute(href)) return href;
    return hrefWithPeriod(href, periodQuery);
  }, [href, periodQuery]);

  return (
    <Link
      href={resolvedHref}
      className={mobileItemClass(active)}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="size-6 shrink-0" aria-hidden />
      <span className="max-w-18 truncate">{label}</span>
    </Link>
  );
}

function NavItemLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  active: boolean;
  collapsed: boolean;
}) {
  const periodQuery = usePeriodNavQuery();
  const resolvedHref = useMemo(() => {
    if (!isPeriodAwareRoute(href)) return href;
    return hrefWithPeriod(href, periodQuery);
  }, [href, periodQuery]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={resolvedHref}
          className={navItemClass(active, collapsed)}
          aria-current={active ? "page" : undefined}
        >
          <Icon className="size-5 shrink-0 opacity-80" aria-hidden />
          <span className={collapsed ? "sr-only" : ""}>{label}</span>
        </Link>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function AppShell({
  children,
  user,
  initialPeriodQuery,
  initialPeriod,
}: AppShellProps) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const showPeriodPicker = isPeriodAwareRoute(pathname);

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
    <PeriodNavProvider
      initialPeriodQuery={initialPeriodQuery}
      initialPeriod={initialPeriod}
    >
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
                <NavItemLink
                  key={href}
                  href={href}
                  label={label}
                  icon={Icon}
                  active={active}
                  collapsed={sidebarCollapsed}
                />
              );
            })}
          </div>
        </nav>
      </aside>

      <div
        className={cn(
          "flex min-h-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden transition-[padding] duration-200 ease-out",
          sidebarCollapsed ? "md:pl-16" : "md:pl-56",
        )}
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-zinc-200 px-4 py-3 md:px-8 dark:border-zinc-800">
          <div className="flex min-w-0 flex-1 justify-start md:justify-end">
            {showPeriodPicker ? (
              <Suspense fallback={null}>
                <GlobalPeriodPicker />
              </Suspense>
            ) : null}
          </div>
          <UserProfileMenu name={user.name} email={user.email} className="shrink-0" />
        </header>
        <main className="min-w-0 max-w-full flex-1 overflow-x-hidden px-4 py-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0))] md:px-8 md:py-8 md:pb-8">
          {children}
        </main>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom,0px)] pt-1 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.08)] backdrop-blur-md md:hidden dark:border-zinc-800 dark:bg-zinc-900/95"
        aria-label="Mobile main"
      >
        {appNavItems.map((item) => (
          <MobileNavItem key={item.href} {...item} pathname={pathname} />
        ))}
      </nav>
      </div>
    </TooltipProvider>
    </PeriodNavProvider>
  );
}
