import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-muted text-muted-foreground hover:bg-muted/80",
        outline: "text-foreground border-border",
        salary: "border-transparent bg-emerald-600/20 text-emerald-700 dark:text-emerald-300",
        freelance: "border-transparent bg-sky-600/20 text-sky-700 dark:text-sky-300",
        passive: "border-transparent bg-violet-600/20 text-violet-700 dark:text-violet-300",
        bonus: "border-transparent bg-amber-600/20 text-amber-800 dark:text-amber-200",
        other: "border-transparent bg-zinc-500/20 text-zinc-700 dark:text-zinc-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
