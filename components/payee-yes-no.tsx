import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

type PayeeYesNoProps = {
  value: boolean;
  trueLabel?: string;
  falseLabel?: string;
  className?: string;
};

export function PayeeYesNo({
  value,
  trueLabel = "Yes",
  falseLabel = "No",
  className,
}: PayeeYesNoProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums",
        value
          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-300"
          : "border-border bg-muted/60 text-muted-foreground dark:border-zinc-700 dark:bg-zinc-800/70",
        className,
      )}
    >
      {value ? (
        <Check className="size-3 shrink-0" strokeWidth={2.5} aria-hidden />
      ) : (
        <Circle className="size-3 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
      )}
      <span>{value ? trueLabel : falseLabel}</span>
    </span>
  );
}
