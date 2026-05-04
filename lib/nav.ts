import { LayoutDashboard, Receipt, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Dashboard at `/`; other app routes use the same shell via `app/(app)/layout`. */
export const appNavItems: AppNavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/incomes", label: "Incomes", icon: Wallet },
  { href: "/expenses", label: "Expenses", icon: Receipt },
];
