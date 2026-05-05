"use client";

import { useEffect, useRef, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { useForm, useWatch, Controller, type Resolver } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addIncome } from "../actions";
import { incomeFormSchema, type IncomeFormValues } from "../schema";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { normalizeDateToLocalNoon } from "@/lib/date";

const defaultValues: IncomeFormValues = {
  amount: 0,
  date: normalizeDateToLocalNoon(new Date()),
  source: "",
  type: "SALARY",
  currency: "MAD",
  isRecurring: false,
  recurrenceFrequency: null,
  payee: null,
  note: null,
};

function buildOptimisticIncome(
  userId: string,
  values: IncomeFormValues,
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
    note: values.note?.trim() ? values.note.trim() : null,
    createdAt: now,
    updatedAt: now,
    sharePercent: newTotal > 0 ? (amount / newTotal) * 100 : 0,
  };
}

type IncomeFormProps = {
  currency?: string;
  userId?: string;
  monthTotal?: number;
  onOptimisticAdd?: (row: IncomeWithMeta) => void;
  onOptimisticEnd?: (tempId: string) => void;
};

export function IncomeForm({
  currency = "MAD",
  userId,
  monthTotal = 0,
  onOptimisticAdd,
  onOptimisticEnd,
}: IncomeFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const amountRef = useRef<HTMLInputElement>(null);

  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeFormSchema) as Resolver<IncomeFormValues>,
    defaultValues: { ...defaultValues, currency },
  });

  const type = useWatch({ control: form.control, name: "type" });
  const isRecurring = useWatch({ control: form.control, name: "isRecurring" });
  const note = useWatch({ control: form.control, name: "note" });
  const noteLen = (note ?? "").length;
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
        amountRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onSubmit(values: IncomeFormValues) {
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
        note: values.note || null,
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
        });
        router.refresh();
      } else {
        toast.error(res.error);
        if (res.fieldErrors) {
          Object.entries(res.fieldErrors).forEach(([k, v]) => {
            form.setError(k as keyof IncomeFormValues, { message: v });
          });
        }
      }
    });
  }

  return (
    <Card className="border-border dark:border-zinc-800 dark:bg-zinc-900">
      <CardHeader>
        <CardTitle className="text-lg">Add income</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="space-y-2 sm:col-span-1">
            <Label htmlFor="income-add-amount">Amount ({currency})</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {currency}
              </span>
              <Input
                id="income-add-amount"
                type="number"
                step="0.01"
                className="pl-14"
                {...amountFieldRest}
                ref={(el) => {
                  amountFieldRef(el);
                  amountRef.current = el;
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
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value
                        ? format(field.value, "PPP")
                        : "Pick a date"}
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

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="income-add-source">Source name</Label>
            <Input id="income-add-source" {...form.register("source")} />
            {form.formState.errors.source ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.source.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="income-type-trigger">Type</Label>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select
                  name="incomeType"
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id="income-type-trigger">
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
          </div>

          {showRecurring ? (
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 dark:border-zinc-700">
              <Label htmlFor="income-add-recurring" className="cursor-pointer">
                Recurring
              </Label>
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
          ) : null}

          {showRecurring && isRecurring ? (
            <div className="space-y-2">
              <Label htmlFor="income-recurrence-trigger">Recurrence</Label>
              <Controller
                control={form.control}
                name="recurrenceFrequency"
                render={({ field }) => (
                  <Select
                    name="incomeRecurrence"
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <SelectTrigger id="income-recurrence-trigger">
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

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="income-add-payee">Payee (optional)</Label>
            <Input id="income-add-payee" {...form.register("payee")} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="income-add-note">Note (optional)</Label>
              <span className="text-xs text-muted-foreground">{noteLen}/200</span>
            </div>
            <Textarea id="income-add-note" maxLength={200} rows={3} {...form.register("note")} />
          </div>

          <div className="sm:col-span-2">
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
