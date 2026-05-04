"use client";

import { useEffect, useRef, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addExpense } from "../actions";
import { expenseFormSchema, type ExpenseFormValues } from "../schema";
import type { ExpenseKind } from "@/generated/prisma/enums";
import type { ExpenseWithMeta } from "../types";
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
import { Textarea } from "@/components/ui/textarea";
import { EXPENSE_CATEGORY_ORDER, CATEGORY_CONFIG } from "@/lib/expense-categories";
import { cn } from "@/lib/utils";
import { ExpenseTypeToggle } from "./expense-type-toggle";

const defaultValues: ExpenseFormValues = {
  amount: 0,
  date: new Date(),
  description: "",
  kind: "FIXED",
  category: "HOUSING",
  currency: "MAD",
  isRecurring: false,
  recurrenceFrequency: null,
  payee: null,
  note: null,
};

function buildOptimisticExpense(
  userId: string,
  values: ExpenseFormValues,
  codeCurrency: string,
  monthTotalIncome: number,
): ExpenseWithMeta {
  const id = `optimistic-${crypto.randomUUID()}`;
  const amount = values.amount;
  const now = new Date().toISOString();
  return {
    id,
    userId,
    description: values.description || "",
    kind: values.kind,
    category: values.category,
    amount,
    date: values.date.toISOString(),
    currency: values.currency || codeCurrency,
    isRecurring: values.kind === "FIXED" ? values.isRecurring : false,
    recurrenceFrequency:
      values.kind === "FIXED" && values.isRecurring
        ? values.recurrenceFrequency ?? null
        : null,
    payee: values.payee?.trim() ? values.payee.trim() : null,
    note: values.note?.trim() ? values.note.trim() : null,
    createdAt: now,
    updatedAt: now,
    sharePercent:
      monthTotalIncome > 0 ? (amount / monthTotalIncome) * 100 : 0,
  };
}

type ExpenseFormProps = {
  currency?: string;
  userId?: string;
  monthExpenseTotal?: number;
  /** Monthly income for the viewed month (share % = amount / income). */
  monthTotalIncome?: number;
  amountFocusRef?: React.MutableRefObject<HTMLInputElement | null>;
  onOptimisticAdd?: (row: ExpenseWithMeta) => void;
  onOptimisticEnd?: (tempId: string) => void;
};

export function ExpenseForm({
  currency = "MAD",
  userId,
  monthExpenseTotal = 0,
  monthTotalIncome = 0,
  amountFocusRef,
  onOptimisticAdd,
  onOptimisticEnd,
}: ExpenseFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const internalAmountRef = useRef<HTMLInputElement>(null);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema) as Resolver<ExpenseFormValues>,
    defaultValues: { ...defaultValues, currency },
  });

  const kind = form.watch("kind");
  const isRecurring = form.watch("isRecurring");
  const noteLen = (form.watch("note") ?? "").length;

  const {
    ref: amountFieldRef,
    ...amountFieldRest
  } = form.register("amount", { valueAsNumber: true });

  useEffect(() => {
    if (kind === "FIXED") {
      form.setValue("category", "HOUSING", { shouldValidate: true });
    } else {
      form.setValue("category", "FOOD_GROCERIES", { shouldValidate: true });
      form.setValue("isRecurring", false);
      form.setValue("recurrenceFrequency", null);
    }
  }, [kind, form]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        (amountFocusRef?.current ?? internalAmountRef.current)?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [amountFocusRef]);

  function onSubmit(values: ExpenseFormValues) {
    startTransition(async () => {
      const canOptimistic =
        typeof userId === "string" && onOptimisticAdd && onOptimisticEnd;
      const optimisticRow = canOptimistic
        ? buildOptimisticExpense(userId, values, currency, monthTotalIncome)
        : null;
      if (optimisticRow && onOptimisticAdd) {
        onOptimisticAdd(optimisticRow);
      }
      const res = await addExpense({
        ...values,
        currency,
        payee: values.payee || null,
        note: values.note || null,
        isRecurring: values.kind === "FIXED" ? values.isRecurring : false,
        recurrenceFrequency:
          values.kind === "FIXED" && values.isRecurring
            ? values.recurrenceFrequency ?? null
            : null,
      });
      if (optimisticRow && onOptimisticEnd) {
        onOptimisticEnd(optimisticRow.id);
      }
      if (res.ok) {
        toast.success("Expense added");
        form.reset({
          ...defaultValues,
          currency,
          date: new Date(),
          kind: values.kind,
          category: values.kind === "FIXED" ? "HOUSING" : "FOOD_GROCERIES",
        });
        router.refresh();
      } else {
        toast.error(res.error);
        if (res.fieldErrors) {
          Object.entries(res.fieldErrors).forEach(([k, v]) => {
            form.setError(k as keyof ExpenseFormValues, { message: v });
          });
        }
      }
    });
  }

  const accent =
    kind === "FIXED"
      ? "border-primary/35 ring-primary/20 dark:border-primary/40 dark:ring-primary/25"
      : "border-border ring-ring/15 dark:border-zinc-700 dark:ring-ring/20";

  return (
    <Card
      className={cn(
        "border-border bg-background ring-1 ring-transparent transition-colors dark:border-zinc-800 dark:bg-zinc-900",
        accent,
      )}
    >
      <CardHeader>
        <CardTitle className="text-lg">Add expense</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Kind</Label>
            <Controller
              control={form.control}
              name="kind"
              render={({ field }) => (
                <ExpenseTypeToggle
                  value={field.value as ExpenseKind}
                  onChange={field.onChange}
                  disabled={pending}
                />
              )}
            />
          </div>

          <div className="space-y-2 sm:col-span-1">
            <Label htmlFor="exp-amount">Amount ({currency})</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {currency}
              </span>
              <Input
                id="exp-amount"
                type="number"
                step="0.01"
                className="pl-14"
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
            <Label>Date</Label>
            <Controller
              control={form.control}
              name="date"
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal dark:border-zinc-700",
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

          <div className="space-y-2">
            <Label htmlFor="exp-desc">Description (optional)</Label>
            <Input id="exp-desc" {...form.register("description")} />
            {form.formState.errors.description ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.description.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="dark:border-zinc-700">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORY_ORDER.map((cat) => {
                      const cfg = CATEGORY_CONFIG[cat];
                      return (
                        <SelectItem key={cat} value={cat}>
                          <span className="flex items-center gap-2">
                            <span aria-hidden>{cfg.icon}</span>
                            <span>{cfg.label}</span>
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {kind === "FIXED" ? (
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 dark:border-zinc-700">
              <Label htmlFor="exp-recurring" className="cursor-pointer">
                Recurring
              </Label>
              <Controller
                control={form.control}
                name="isRecurring"
                render={({ field }) => (
                  <Switch
                    id="exp-recurring"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
          ) : null}

          {kind === "FIXED" && isRecurring ? (
            <div className="space-y-2">
              <Label>Recurrence</Label>
              <Controller
                control={form.control}
                name="recurrenceFrequency"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <SelectTrigger className="dark:border-zinc-700">
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
              {form.formState.errors.recurrenceFrequency ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.recurrenceFrequency.message}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="exp-payee">Payee (optional)</Label>
            <Input id="exp-payee" {...form.register("payee")} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="exp-note">Note (optional)</Label>
              <span className="text-xs text-muted-foreground">{noteLen}/200</span>
            </div>
            <Textarea id="exp-note" maxLength={200} rows={3} {...form.register("note")} />
          </div>

          <div>
            <Button type="submit" disabled={pending} className="min-w-[140px]">
              {pending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save expense"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
