"use client";

import { useEffect, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useForm, Controller, useWatch, type Resolver } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createRecurringExpense,
  deleteRecurringExpense,
  updateRecurringExpense,
} from "../actions";
import {
  fromOccurrenceCount,
  recurringExpenseFormSchema,
  type RecurringExpenseFormValues,
} from "../schema";
import { RecurringEndsFields } from "./recurring-ends-fields";
import { RecurringStartsAtField } from "./recurring-starts-at-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EXPENSE_CATEGORY_ORDER, CATEGORY_CONFIG } from "@/lib/expense-categories";
import { formatMoney } from "@/lib/money";
import { normalizeDateToLocalNoon } from "@/lib/date";
import { ledgerRowHover } from "@/lib/ledger-table-columns";
import { formatOccurrenceEnds } from "@/lib/recurring/occurrence";
import type { ExpenseCategory, RecurrenceFrequency } from "@/generated/prisma/enums";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export type RecurringExpenseRow = {
  id: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  recurrenceFrequency: RecurrenceFrequency;
  occurrenceCount: number | null;
  startsAt: string;
};

type FixedExpenseFormProps = {
  currency?: string;
  /** When set, category is fixed and the category picker is hidden. */
  lockedCategory?: ExpenseCategory;
  submitLabel?: string;
  successMessage?: string;
};

function createExpenseDefaults(
  currency: string,
  category: ExpenseCategory = "HOUSING",
): RecurringExpenseFormValues {
  return {
    amount: 0,
    description: "",
    category,
    currency,
    recurrenceFrequency: "MONTHLY",
    endsMode: "indefinite",
    occurrenceCount: null,
    startsAt: normalizeDateToLocalNoon(new Date()),
  };
}

export function FixedExpenseForm({
  currency = "MAD",
  lockedCategory,
  submitLabel = "Save recurring expense",
  successMessage = "Recurring expense added",
}: FixedExpenseFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const defaults = createExpenseDefaults(currency, lockedCategory ?? "HOUSING");
  const form = useForm<RecurringExpenseFormValues>({
    resolver: zodResolver(recurringExpenseFormSchema) as Resolver<RecurringExpenseFormValues>,
    defaultValues: defaults,
  });
  const endsMode = useWatch({ control: form.control, name: "endsMode" }) ?? "indefinite";
  const recurrenceFrequency =
    useWatch({ control: form.control, name: "recurrenceFrequency" }) ?? "MONTHLY";

  useEffect(() => {
    form.setValue("startsAt", normalizeDateToLocalNoon(new Date()), {
      shouldDirty: false,
      shouldValidate: false,
    });
  }, [form]);

  function onSubmit(values: RecurringExpenseFormValues) {
    startTransition(async () => {
      const res = await createRecurringExpense({
        ...values,
        category: lockedCategory ?? values.category,
        currency,
      });
      if (res.ok) {
        toast.success(successMessage);
        form.reset(createExpenseDefaults(currency, lockedCategory ?? "HOUSING"));
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="re-exp-amount">Amount ({currency})</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {currency}
          </span>
          <Input
            id="re-exp-amount"
            type="number"
            step="0.01"
            className="pl-14"
            {...form.register("amount", { valueAsNumber: true })}
          />
        </div>
        {form.formState.errors.amount ? (
          <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
        ) : null}
      </div>

      <RecurringStartsAtField control={form.control} name="startsAt" id="re-exp-starts" />

      <div className="space-y-2">
        <Label htmlFor="re-exp-freq">Recurrence</Label>
        <Controller
          control={form.control}
          name="recurrenceFrequency"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="re-exp-freq" className="h-10 dark:border-zinc-700">
                <SelectValue />
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
      </div>

      <RecurringEndsFields
        control={form.control}
        endsMode={endsMode}
        endsModeName="endsMode"
        occurrenceCountName="occurrenceCount"
        idPrefix="re-exp"
        frequency={recurrenceFrequency}
        error={form.formState.errors.occurrenceCount?.message}
        onEndsModeChange={(mode) => {
          if (mode === "limited" && !form.getValues("occurrenceCount")) {
            form.setValue("occurrenceCount", 2);
          }
          if (mode === "indefinite") {
            form.setValue("occurrenceCount", null);
          }
        }}
      />

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="re-exp-desc">Description (optional)</Label>
        <Input id="re-exp-desc" className="h-10" {...form.register("description")} />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="re-exp-cat">Category</Label>
        {lockedCategory ? (
          <p className="flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm dark:border-zinc-700">
            <span aria-hidden>{CATEGORY_CONFIG[lockedCategory].icon}</span>
            <span>{CATEGORY_CONFIG[lockedCategory].label}</span>
          </p>
        ) : (
        <Controller
          control={form.control}
          name="category"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="re-exp-cat" className="h-10 dark:border-zinc-700">
                <SelectValue />
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
        )}
      </div>

      <div className="flex justify-end sm:col-span-2">
        <Button type="submit" disabled={pending} className="min-w-35">
          {pending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Saving…
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}

type FixedExpenseTableProps = {
  rows: RecurringExpenseRow[];
  currency: string;
};

export function FixedExpenseTable({ rows, currency }: FixedExpenseTableProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editRow, setEditRow] = useState<RecurringExpenseRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const ends = fromOccurrenceCount(editRow?.occurrenceCount);
  const form = useForm<RecurringExpenseFormValues>({
    resolver: zodResolver(recurringExpenseFormSchema) as Resolver<RecurringExpenseFormValues>,
    values: editRow
      ? {
          amount: editRow.amount,
          description: editRow.description,
          category: editRow.category,
          currency: editRow.currency || currency,
          recurrenceFrequency: editRow.recurrenceFrequency,
          endsMode: ends.endsMode,
          occurrenceCount: ends.occurrenceCount,
          startsAt: normalizeDateToLocalNoon(new Date(editRow.startsAt)),
        }
      : createExpenseDefaults(currency),
  });
  const endsMode = useWatch({ control: form.control, name: "endsMode" }) ?? "indefinite";
  const editFrequency =
    useWatch({ control: form.control, name: "recurrenceFrequency" }) ?? "MONTHLY";

  function onSaveEdit(values: RecurringExpenseFormValues) {
    if (!editRow) return;
    startTransition(async () => {
      const res = await updateRecurringExpense({ ...values, id: editRow.id });
      if (res.ok) {
        toast.success("Updated");
        setEditRow(null);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function onDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      const res = await deleteRecurringExpense(deleteId);
      if (res.ok) {
        toast.success("Deleted");
        setDeleteId(null);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No recurring expenses yet.</p>;
  }

  return (
    <>
      <table className="w-full min-w-xl text-left text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="pb-2 pr-3 font-medium">Description</th>
            <th className="pb-2 pr-3 font-medium whitespace-nowrap">Category</th>
            <th className="pb-2 pr-3 font-medium whitespace-nowrap">Start</th>
            <th className="pb-2 pr-3 font-medium whitespace-nowrap">Recurrence</th>
            <th className="pb-2 pr-3 font-medium whitespace-nowrap">Ends</th>
            <th className="pb-2 pr-3 font-medium whitespace-nowrap text-right">Amount</th>
            <th className="pb-2 font-medium whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const cfg = CATEGORY_CONFIG[row.category];
            return (
              <tr
                key={row.id}
                className={cn("border-b border-border/60 last:border-0", ledgerRowHover)}
              >
                <td className="max-w-48 truncate py-2.5 pr-3 font-medium">
                  {row.description?.trim() || cfg.label}
                </td>
                <td className="py-2.5 pr-3 text-muted-foreground whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden>{cfg.icon}</span>
                    {cfg.label}
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-muted-foreground whitespace-nowrap">
                  {format(new Date(row.startsAt), "MMM d, yyyy")}
                </td>
                <td className="py-2.5 pr-3 capitalize text-muted-foreground whitespace-nowrap">
                  {row.recurrenceFrequency.toLowerCase()}
                </td>
                <td className="py-2.5 pr-3 text-muted-foreground whitespace-nowrap">
                  {formatOccurrenceEnds(row.occurrenceCount, row.recurrenceFrequency)}
                </td>
                <td className="py-2.5 pr-3 text-right font-medium tabular-nums whitespace-nowrap">
                  {formatMoney(row.amount, row.currency || currency)}
                </td>
                <td className="py-2.5 whitespace-nowrap">
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setEditRow(row)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteId(row.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-border dark:border-zinc-700">
            <td
              colSpan={5}
              className="pt-3 pr-3 text-sm font-medium text-muted-foreground"
            >
              Total ({rows.length})
            </td>
            <td className="pt-3 pr-3 text-right text-sm font-semibold tabular-nums whitespace-nowrap">
              {formatMoney(
                rows.reduce((sum, row) => sum + row.amount, 0),
                currency,
              )}
            </td>
            <td className="pt-3" />
          </tr>
        </tfoot>
      </table>

      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit recurring expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSaveEdit)} className="grid gap-3">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" step="0.01" {...form.register("amount", { valueAsNumber: true })} />
            </div>
            <RecurringStartsAtField control={form.control} name="startsAt" id="edit-exp-starts" />
            <div className="space-y-2">
              <Label>Description</Label>
              <Input {...form.register("description")} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Controller
                control={form.control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORY_ORDER.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {CATEGORY_CONFIG[cat].icon} {CATEGORY_CONFIG[cat].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Recurrence</Label>
              <Controller
                control={form.control}
                name="recurrenceFrequency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
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
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <RecurringEndsFields
                control={form.control}
                endsMode={endsMode}
                endsModeName="endsMode"
                occurrenceCountName="occurrenceCount"
                idPrefix="edit-exp"
                frequency={editFrequency}
                error={form.formState.errors.occurrenceCount?.message}
                onEndsModeChange={(mode) => {
                  if (mode === "limited" && !form.getValues("occurrenceCount")) {
                    form.setValue("occurrenceCount", 2);
                  }
                  if (mode === "indefinite") {
                    form.setValue("occurrenceCount", null);
                  }
                }}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditRow(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete recurring expense?</AlertDialogTitle>
            <AlertDialogDescription>
              It will no longer appear in monthly expense tables. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} disabled={pending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
