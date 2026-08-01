"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ChevronDown, LogOut, Settings, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getUserDisplayName, getUserInitials } from "@/lib/user-display";
import { cn } from "@/lib/utils";

type UserProfileMenuProps = {
  name: string | null | undefined;
  email: string | null | undefined;
  className?: string;
};

function UserAvatar({
  initials,
  className,
}: {
  initials: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-teal-600 to-teal-800 text-xs font-semibold text-white shadow-inner ring-2 ring-teal-500/30 dark:from-teal-500 dark:to-teal-700 dark:ring-teal-400/20",
        className,
      )}
      aria-hidden
    >
      {initials}
    </div>
  );
}

function menuItemClass(active: boolean) {
  return cn(
    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
    active
      ? "bg-teal-50 text-teal-900 dark:bg-teal-950/60 dark:text-teal-100"
      : "text-foreground",
  );
}

export function UserProfileMenu({ name, email, className }: UserProfileMenuProps) {
  const pathname = usePathname();
  const initials = getUserInitials(name, email);
  const displayName = getUserDisplayName(name, email);
  const emailLine = email?.trim() ?? "";
  const fixedActive = pathname === "/settings/fixed" || pathname.startsWith("/settings/fixed/");
  const settingsActive =
    pathname === "/settings" ||
    (pathname.startsWith("/settings/") && !pathname.startsWith("/settings/fixed"));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "h-10 gap-2 rounded-full px-1.5 pr-2 hover:bg-zinc-100 dark:hover:bg-zinc-800",
            className,
          )}
          aria-label="Account menu"
        >
          <UserAvatar initials={initials} />
          <ChevronDown className="size-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
          {emailLine ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{emailLine}</p>
          ) : null}
        </div>
        <div className="p-1">
          <Link href="/settings/fixed" className={menuItemClass(fixedActive)}>
            <Wallet className="size-4 shrink-0 opacity-80" aria-hidden />
            Recurring
          </Link>
          <Link href="/settings" className={menuItemClass(settingsActive)}>
            <Settings className="size-4 shrink-0 opacity-80" aria-hidden />
            Settings
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <LogOut className="size-4 shrink-0 opacity-80" aria-hidden />
            Log out
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
