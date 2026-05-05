"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function getInitials(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  const trimmed = name?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const a = parts[0][0];
      const b = parts[parts.length - 1][0];
      if (a && b) return `${a}${b}`.toUpperCase();
    }
    if (parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
    if (parts[0][0]) return `${parts[0][0]}${email?.[0] ?? ""}`.toUpperCase();
  }
  const local = email?.split("@")[0] ?? "";
  if (local.length >= 2) return local.slice(0, 2).toUpperCase();
  if (local[0]) return `${local[0]}${local[1] ?? ""}`.toUpperCase();
  return "?";
}

function getDisplayName(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  const trimmed = name?.trim();
  if (trimmed) return trimmed;
  const local = email?.split("@")[0];
  if (local) return local;
  return "Account";
}

type SidebarUserProfileProps = {
  name: string | null | undefined;
  email: string | null | undefined;
  collapsed?: boolean;
};

export function SidebarUserProfile({
  name,
  email,
  collapsed = false,
}: SidebarUserProfileProps) {
  const initials = getInitials(name, email);
  const displayName = getDisplayName(name, email);
  const emailLine = email?.trim() ?? "";

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex justify-center rounded-xl py-2"
            title={`${displayName}${emailLine ? ` · ${emailLine}` : ""}`}
          >
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-teal-600 to-teal-800 text-sm font-semibold text-white shadow-inner ring-2 ring-teal-500/30 dark:from-teal-500 dark:to-teal-700 dark:ring-teal-400/20"
              aria-label={displayName}
            >
              {initials}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="whitespace-pre-line">
          {emailLine ? `${displayName}\n${emailLine}` : displayName}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex gap-3 rounded-xl px-1 py-2">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-teal-600 to-teal-800 text-sm font-semibold text-white shadow-inner ring-2 ring-teal-500/30 dark:from-teal-500 dark:to-teal-700 dark:ring-teal-400/20"
            aria-hidden
          >
            {initials}
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <p className="truncate text-sm font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
              {displayName}
            </p>
            {emailLine ? (
              <p className="mt-0.5 truncate text-xs leading-tight text-zinc-500 dark:text-zinc-400">
                {emailLine}
              </p>
            ) : null}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent className="whitespace-pre-line">
        {emailLine ? `${displayName}\n${emailLine}` : displayName}
      </TooltipContent>
    </Tooltip>
  );
}
