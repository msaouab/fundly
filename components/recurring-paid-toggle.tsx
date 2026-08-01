"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { PayeeYesNo } from "@/components/payee-yes-no";
import { cn } from "@/lib/utils";

type RecurringPaidToggleProps = {
  checked: boolean;
  disabled?: boolean;
  className?: string;
  onToggle: (next: boolean) => Promise<{ ok: boolean; error?: string }>;
};

export function RecurringPaidToggle({
  checked,
  disabled,
  className,
  onToggle,
}: RecurringPaidToggleProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const busy = disabled || pending;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-muted/30 py-0.5 pl-0.5 pr-1.5 dark:border-zinc-700 dark:bg-zinc-950/50",
        busy && "opacity-70",
        className,
      )}
    >
      <PayeeYesNo
        value={checked}
        trueLabel="Paid"
        falseLabel="Unpaid"
        className="border-0 bg-transparent px-1.5 py-0 shadow-none dark:bg-transparent"
      />
      <Switch
        checked={checked}
        disabled={busy}
        aria-label={checked ? "Mark as unpaid" : "Mark as paid"}
        className={cn(
          "h-5 w-9 border-0",
          "data-[state=checked]:bg-emerald-600 dark:data-[state=checked]:bg-emerald-500",
          "[&>span]:h-4 [&>span]:w-4 data-[state=checked]:[&>span]:translate-x-4",
        )}
        onCheckedChange={(next) => {
          startTransition(async () => {
            const res = await onToggle(next);
            if (res.ok) {
              router.refresh();
            } else {
              toast.error(res.error ?? "Failed to update");
            }
          });
        }}
      />
    </div>
  );
}
