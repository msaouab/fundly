"use client";

import { useEffect, useRef, useTransition, type ReactNode, type RefObject } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addExpense } from "../actions";
import { expenseAddFormSchema, type ExpenseAddFormValues } from "../schema";
import type { ExpenseWithMeta } from "../types";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
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
import { EXPENSE_CATEGORY_ORDER, CATEGORY_CONFIG } from "@/lib/expense-categories";
import { cn } from "@/lib/utils";
import { PayeeSwitchField } from "@/components/payee-switch-field";
import { normalizeDateToLocalNoon } from "@/lib/date";
import {
  ADD_FORM_ACCORDION_VALUE,
  type AddFormControls,
  useAddFormAccordion,
} from "@/lib/use-add-form-accordion";

const defaultValues: ExpenseAddFormValues = {
  amount: 0,
  date: normalizeDateToLocalNoon(new Date()),
  description: "",
  kind: "VARIABLE",
  category: "FOOD_GROCERIES",
  currency: "MAD",
  isRecurring: false,
  recurrenceFrequency: null,
  payee: false,
};

function buildOptimisticExpense(
  userId: string,
  values: ExpenseAddFormValues,
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
    kind: "VARIABLE",
    category: values.category,
    amount,
    date: normalizeDateToLocalNoon(values.date).toISOString(),
    currency: values.currency || codeCurrency,
    isRecurring: false,
    recurrenceFrequency: null,
    payee: values.payee,
    note: null,
    createdAt: now,
    updatedAt: now,
    sharePercent:
      monthTotalIncome > 0 ? (amount / monthTotalIncome) * 100 : 0,
  };
}

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

type ExpenseFormProps = {
  className?: string;
  currency?: string;
  userId?: string;
  monthExpenseTotal?: number;
  /** Monthly income for the viewed month (share % = amount / income). */
  monthTotalIncome?: number;
  amountFocusRef?: RefObject<HTMLInputElement | null>;
  addFormControlsRef?: RefObject<AddFormControls | null>;
  onOptimisticAdd?: (row: ExpenseWithMeta) => void;
  onOptimisticEnd?: (tempId: string) => void;
};

export function ExpenseForm({
  className,
  currency = "MAD",
  userId,
  monthTotalIncome = 0,
  amountFocusRef,
  addFormControlsRef,
  onOptimisticAdd,
  onOptimisticEnd,
}: ExpenseFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const internalAmountRef = useRef<HTMLInputElement>(null);
  const { accordionOpen, setAccordionOpen, openAndFocusAmount } = useAddFormAccordion(
    amountFocusRef,
    internalAmountRef,
    addFormControlsRef,
  );

  const form = useForm<ExpenseAddFormValues>({
    resolver: zodResolver(expenseAddFormSchema) as Resolver<ExpenseAddFormValues>,
    defaultValues: { ...defaultValues, currency },
  });

  const {
    ref: amountFieldRef,
    ...amountFieldRest
  } = form.register("amount", { valueAsNumber: true });

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
        openAndFocusAmount();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openAndFocusAmount]);

  function onSubmit(values: ExpenseAddFormValues) {
    startTransition(async () => {
      const payload: ExpenseAddFormValues = {
        ...values,
        kind: "VARIABLE",
        isRecurring: false,
        recurrenceFrequency: null,
      };
      const canOptimistic =
        typeof userId === "string" && onOptimisticAdd && onOptimisticEnd;
      const optimisticRow = canOptimistic
        ? buildOptimisticExpense(userId, payload, currency, monthTotalIncome)
        : null;
      if (optimisticRow && onOptimisticAdd) {
        onOptimisticAdd(optimisticRow);
      }
      const res = await addExpense({
        ...payload,
        currency,
        payee: payload.payee,
      });
      if (optimisticRow && onOptimisticEnd) {
        onOptimisticEnd(optimisticRow.id);
      }
      if (res.ok) {
        toast.success("Expense added");
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
            form.setError(k as keyof ExpenseAddFormValues, { message: v });
          });
        }
      }
    });
  }

  return (
    <Card
      className={cn(
        "border-border bg-background ring-1 ring-ring/15 transition-colors dark:border-zinc-700 dark:bg-zinc-900 dark:ring-ring/20",
        className,
      )}
    >
      <Accordion
        type="single"
        collapsible
        value={accordionOpen}
        onValueChange={setAccordionOpen}
      >
        <AccordionItem value={ADD_FORM_ACCORDION_VALUE} className="border-0">
          <AccordionTrigger className="px-6 text-lg hover:no-underline">
            Add expense
          </AccordionTrigger>
          <AccordionContent className="px-6">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="space-y-2">
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
            <Label htmlFor="expense-date-trigger">Date</Label>
            <Controller
              control={form.control}
              name="date"
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="expense-date-trigger"
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-10 w-full justify-start text-left font-normal dark:border-zinc-700",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      <span suppressHydrationWarning>
                        {field.value ? format(field.value, "PPP") : "Pick a date"}
                      </span>
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
            <Label htmlFor="exp-desc">Description (optional)</Label>
            <Input id="exp-desc" className="h-10" {...form.register("description")} />
            {form.formState.errors.description ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.description.message}
              </p>
            ) : null}
          </div>

          <div className="col-span-full grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <FormField label="Category" htmlFor="expense-category-trigger">
              <Controller
                control={form.control}
                name="category"
                render={({ field }) => (
                  <Select
                    name="expenseCategory"
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="expense-category-trigger" className="h-10 dark:border-zinc-700">
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
            </FormField>

            <Controller
              control={form.control}
              name="payee"
              render={({ field }) => (
                <PayeeSwitchField
                  id="exp-payee"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={pending}
                />
              )}
            />
          </div>

          <div className="col-span-full flex justify-end pt-1 sm:col-span-2">
            <Button type="submit" disabled={pending} className="min-w-36">
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
