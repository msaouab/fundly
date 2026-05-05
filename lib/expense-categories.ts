import type { ExpenseCategory } from "@/generated/prisma/enums";

/** Stable iteration order for legends and filters. */
export const EXPENSE_CATEGORY_ORDER: ExpenseCategory[] = [
  "HOUSING",
  "FOOD_GROCERIES",
  "TRANSPORT",
  "UTILITIES",
  "HEALTH",
  "ENTERTAINMENT",
  "SHOPPING",
  "SUBSCRIPTIONS",
  "EDUCATION",
  "TRAVEL",
  "DONATIONS",
  "SAVINGS_CONTRIBUTION",
  "OTHER",
];

export type CategoryConfigEntry = {
  label: string;
  icon: string;
  /** Stacked bar segment (theme: primary ramp + muted). */
  segmentClass: string;
};

/** One hue (primary) + neutrals so bars match app tokens, not arbitrary palette colors. */
export const CATEGORY_CONFIG: Record<ExpenseCategory, CategoryConfigEntry> = {
  HOUSING: {
    label: "Housing & rent",
    icon: "🏠",
    segmentClass: "bg-primary",
  },
  FOOD_GROCERIES: {
    label: "Food & groceries",
    icon: "🛒",
    segmentClass: "bg-primary/90",
  },
  TRANSPORT: {
    label: "Transportation",
    icon: "🚗",
    segmentClass: "bg-primary/80",
  },
  UTILITIES: {
    label: "Utilities & phone",
    icon: "⚡",
    segmentClass: "bg-primary/70",
  },
  HEALTH: {
    label: "Health & medical",
    icon: "❤️",
    segmentClass: "bg-primary/60",
  },
  ENTERTAINMENT: {
    label: "Entertainment",
    icon: "🎬",
    segmentClass: "bg-primary/50",
  },
  SHOPPING: {
    label: "Shopping",
    icon: "🛍️",
    segmentClass: "bg-primary/45",
  },
  SUBSCRIPTIONS: {
    label: "Subscriptions",
    icon: "🔁",
    segmentClass: "bg-primary/40",
  },
  EDUCATION: {
    label: "Education & books",
    icon: "📚",
    segmentClass: "bg-primary/35",
  },
  TRAVEL: {
    label: "Travel & vacations",
    icon: "✈️",
    segmentClass: "bg-primary/30",
  },
  DONATIONS: {
    label: "Donations & gifts",
    icon: "🎁",
    segmentClass: "bg-primary/25",
  },
  SAVINGS_CONTRIBUTION: {
    label: "Savings contribution",
    icon: "🏦",
    segmentClass: "bg-blue-500/80",
  },
  OTHER: {
    label: "Other",
    icon: "📦",
    segmentClass: "bg-muted-foreground/45",
  },
};
