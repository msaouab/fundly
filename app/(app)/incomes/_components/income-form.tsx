"use client";

import { useEffect, useRef, useTransition, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { useForm, useWatch, Controller, type Resolver } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addIncome } from "../actions";
import { incomeAddFormSchema, type IncomeAddFormValues } from "../schema";
import type { IncomeType } from "@/generated/prisma/enums";
import type { IncomeWithMeta } from "../types";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { normalizeDateToLocalNoon } from "@/lib/date";

const defaultValues: IncomeAddFormValues = {
  amount: 0,
  date: normalizeDateToLocalNoon(new Date()),
  source: "",
  type: "SALARY",
  currency: "MAD",
  isRecurring: false,
  recurrenceFrequency: null,
  payee: null,
};

const TYPE_ACCENT: Record<IncomeType, string> = {
  SALARY: "border-primary/35 ring-primary/20 dark:border-primary/40 dark:ring-primary/25",
  FREELANCE: "border-sky-500/30 ring-sky-500/15 dark:border-sky-500/35",
  PASSIVE: "border-emerald-500/30 ring-emerald-500/15 dark:border-emerald-500/35",
  BONUS: "border-amber-500/30 ring-amber-500/15 dark:border-amber-500/35",
  OTHER: "border-border ring-ring/15 dark:border-zinc-700 dark:ring-ring/20",
};

function buildOptimisticIncome(
  userId: string,
  values: IncomeAddFormValues,
  codeCurrency: string,
  monthTotal: number,
): IncomeWithMeta {
  const id = `optimistic-${crypto.randomUUID()}`;
  const amount = values.amount;
  const newTotal = monthTotal + amount;
  const now = new Date().toISOString();
  return {
    id,
    userId,
    source: values.source,
    type: values.type,
    amount,
    date: normalizeDateToLocalNoon(values.date).toISOString(),
    currency: values.currency || codeCurrency,
    isRecurring: values.isRecurring,
    recurrenceFrequency: values.recurrenceFrequency ?? null,
    payee: values.payee?.trim() ? values.payee.trim() : null,
    note: null,
    createdAt: now,
    updatedAt: now,
    sharePercent: newTotal > 0 ? (amount / newTotal) * 100 : 0,
  };
}

const formControlShell =
  "flex h-10 w-full items-center rounded-md border border-border bg-background px-3 dark:border-zinc-700 dark:bg-zinc-950";

type FormFieldProps = {
  label: ReactNode;
  htmlFor?: string;
  className?: string;
  error?: string | null;
  children: ReactNode;
};

function FormField({ label, htmlFor, className, error, children }: FormFieldProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <Label htmlFor={htmlFor} className="min-h-5 text-sm leading-none">
        {label}
      </Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

type IncomeFormProps = {
  className?: string;
  currency?: string;
  userId?: string;
  monthTotal?: number;
  amountFocusRef?: React.MutableRefObject<HTMLInputElement | null>;
  onOptimisticAdd?: (row: IncomeWithMeta) => void;
  onOptimisticEnd?: (tempId: string) => void;
};

export function IncomeForm({
  className,
  currency = "MAD",
  userId,
  monthTotal = 0,
  amountFocusRef,
  onOptimisticAdd,
  onOptimisticEnd,
}: IncomeFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const internalAmountRef = useRef<HTMLInputElement>(null);

  const form = useForm<IncomeAddFormValues>({
    resolver: zodResolver(incomeAddFormSchema) as Resolver<IncomeAddFormValues>,
    defaultValues: { ...defaultValues, currency },
  });

  const type = useWatch({ control: form.control, name: "type" });
  const isRecurring = useWatch({ control: form.control, name: "isRecurring" });
  const showRecurring = type === "SALARY" || type === "PASSIVE";

  const {
    ref: amountFieldRef,
    ...amountFieldRest
  } = form.register("amount", { valueAsNumber: true });

  useEffect(() => {
    if (!showRecurring) {
      form.setValue("isRecurring", false);
      form.setValue("recurrenceFrequency", null);
    }
  }, [showRecurring, form]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        (amountFocusRef?.current ?? internalAmountRef.current)?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [amountFocusRef]);

  function onSubmit(values: IncomeAddFormValues) {
    startTransition(async () => {
      const canOptimistic =
        typeof userId === "string" && onOptimisticAdd && onOptimisticEnd;
      const optimisticRow = canOptimistic
        ? buildOptimisticIncome(userId, values, currency, monthTotal)
        : null;
      if (optimisticRow && onOptimisticAdd) {
        onOptimisticAdd(optimisticRow);
      }
      const res = await addIncome({
        ...values,
        currency,
        payee: values.payee || null,
        recurrenceFrequency: values.isRecurring
          ? values.recurrenceFrequency ?? null
          : null,
        isRecurring: values.isRecurring,
      });
      if (optimisticRow && onOptimisticEnd) {
        onOptimisticEnd(optimisticRow.id);
      }
      if (res.ok) {
        toast.success("Income added");
        form.reset({
          ...defaultValues,
          currency,
          date: normalizeDateToLocalNoon(new Date()),
          type: values.type,
        });
        router.refresh();
      } else {
        toast.error(res.error);
        if (res.fieldErrors) {
          Object.entries(res.fieldErrors).forEach(([k, v]) => {
            form.setError(k as keyof IncomeAddFormValues, { message: v });
          });
        }
      }
    });
  }

  return (
    <Card
      className={cn(
        "border-border bg-background ring-1 ring-transparent transition-colors dark:border-zinc-800 dark:bg-zinc-900",
        TYPE_ACCENT[type],
        className,
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Add income</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="space-y-2">
            <Label htmlFor="income-add-amount">Amount ({currency})</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {currency}
              </span>
              <Input
                id="income-add-amount"
                type="number"
                step="0.01"
                className="h-10 pl-14"
                {...amountFieldRest}
                ref={(el) => {
                  amountFieldRef(el);
                  internalAmountRef.current = el;
                  if (amountFocusRef) {
                    amountFocusRef.current = el;
                  }
                }}
              />
            </div>
            {form.formState.errors.amount ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.amount.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="income-date-trigger">Date</Label>
            <Controller
              control={form.control}
              name="date"
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="income-date-trigger"
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-10 w-full justify-start text-left font-normal dark:border-zinc-700",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
          </div>

          <FormField
            className="sm:col-span-2"
            label="Source name"
            htmlFor="income-add-source"
            error={form.formState.errors.source?.message}
          >
            <Input id="income-add-source" className="h-10" {...form.register("source")} />
          </FormField>

          <div className="col-span-full grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <FormField label="Type" htmlFor="income-type-trigger">
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Select
                    name="incomeType"
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="income-type-trigger" className="h-10 dark:border-zinc-700">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SALARY">Salary</SelectItem>
                      <SelectItem value="FREELANCE">Freelance</SelectItem>
                      <SelectItem value="PASSIVE">Passive</SelectItem>
                      <SelectItem value="BONUS">Bonus</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            {showRecurring ? (
              <FormField label="Recurring" htmlFor="income-add-recurring">
                <div className={cn(formControlShell, "justify-between")}>
                  <span className="truncate text-sm text-muted-foreground">Repeats on schedule</span>
                  <Controller
                    control={form.control}
                    name="isRecurring"
                    render={({ field }) => (
                      <Switch
                        id="income-add-recurring"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </FormField>
            ) : null}

            {showRecurring && isRecurring ? (
              <FormField
                label="Recurrence"
                htmlFor="income-recurrence-trigger"
                error={form.formState.errors.recurrenceFrequency?.message}
              >
                <Controller
                  control={form.control}
                  name="recurrenceFrequency"
                  render={({ field }) => (
                    <Select
                      name="incomeRecurrence"
                      value={field.value ?? ""}
                      onValueChange={(v) => field.onChange(v || null)}
                    >
                      <SelectTrigger id="income-recurrence-trigger" className="h-10 dark:border-zinc-700">
                        <SelectValue placeholder="Frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WEEKLY">Weekly</SelectItem>
                        <SelectItem value="BIWEEKLY">Biweekly</SelectItem>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                        <SelectItem value="YEARLY">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            ) : null}
          </div>

          <FormField className="sm:col-span-2" label="Payee (optional)" htmlFor="income-add-payee">
            <Input id="income-add-payee" className="h-10" {...form.register("payee")} />
          </FormField>

          <div className="col-span-full flex justify-end pt-1 sm:col-span-2 lg:col-span-4">
            <Button type="submit" disabled={pending} className="min-w-[140px]">
              {pending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save income"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
