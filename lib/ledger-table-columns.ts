/** Columns that must stay on a single line (date, category, actions, etc.). */
export const ledgerColNowrap = "whitespace-nowrap";

/** Main label column — at least ~4 words wide, then truncate if longer. */
export const ledgerColPrimaryText = "min-w-[32ch] max-w-2xl truncate";

/** Body row hover affordance for ledger / settings tables. */
export const ledgerRowHover =
  "transition-colors hover:bg-muted/50 dark:hover:bg-zinc-800/50";
