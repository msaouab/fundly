import { format } from "date-fns";
import { formatMoney } from "@/lib/money";

export function compactAxisAmount(amount: number, currency: string): string {
  const abs = Math.abs(amount);
  if (abs >= 1000) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  }
  return formatMoney(amount, currency);
}

export function formatMonthKeyLabel(monthKey: string): string {
  return format(new Date(`${monthKey}-01T12:00:00`), "MMMM yyyy");
}
