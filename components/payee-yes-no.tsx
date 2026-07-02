import { cn } from "@/lib/utils";

type PayeeYesNoProps = {
  value: boolean;
  className?: string;
};

export function PayeeYesNo({ value, className }: PayeeYesNoProps) {
  return (
    <span
      className={cn(
        "text-xs font-medium",
        value
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-600 dark:text-red-400",
        className,
      )}
    >
      {value ? "Yes" : "No"}
    </span>
  );
}
