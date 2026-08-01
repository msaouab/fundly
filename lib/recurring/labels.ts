import type { RecurrenceFrequency } from "@/generated/prisma/enums";

const LABELS: Record<RecurrenceFrequency, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Biweekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

export function formatRecurrenceFrequency(
  frequency: RecurrenceFrequency | string | null | undefined,
): string {
  if (!frequency) return "—";
  return LABELS[frequency as RecurrenceFrequency] ?? String(frequency).toLowerCase();
}
