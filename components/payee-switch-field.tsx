import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { PayeeYesNo } from "@/components/payee-yes-no";

const formControlShell =
  "flex h-10 w-full items-center rounded-md border border-border bg-background px-3 dark:border-zinc-700 dark:bg-zinc-950";

type PayeeSwitchFieldProps = {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
};

export function PayeeSwitchField({
  id,
  checked,
  onCheckedChange,
  disabled,
  label = "Payee",
  className,
}: PayeeSwitchFieldProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <Label htmlFor={id} className="min-h-5 text-sm leading-none">
        {label}
      </Label>
      <div className={cn(formControlShell, "justify-between")}>
        <PayeeYesNo value={checked} className="text-sm" />
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
