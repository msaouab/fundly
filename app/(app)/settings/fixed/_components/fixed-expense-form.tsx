"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createRecurringExpense,
  deleteRecurringExpense,
  updateRecurringExpense,
} from "../actions";
import {
  recurringExpenseFormSchema,
  type RecurringExpenseFormValues,
} from "../schema";
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
import type { ExpenseCategory, RecurrenceFrequency } from "@/generated/prisma/enums";

export type RecurringExpenseRow = {
  id: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  recurrenceFrequency: RecurrenceFrequency;
};

type FixedExpenseFormProps = {
  currency?: string;
};

const defaultValues: RecurringExpenseFormValues = {
  amount: 0,
  description: "",
  category: "HOUSING",
  currency: "MAD",
  recurrenceFrequency: "MONTHLY",
};

export function FixedExpenseForm({ currency = "MAD" }: FixedExpenseFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<RecurringExpenseFormValues>({
    resolver: zodResolver(recurringExpenseFormSchema) as Resolver<RecurringExpenseFormValues>,
    defaultValues: { ...defaultValues, currency },
  });

  function onSubmit(values: RecurringExpenseFormValues) {
    startTransition(async () => {
      const res = await createRecurringExpense({ ...values, currency });
      if (res.ok) {
        toast.success("Recurring expense added");
        form.reset({ ...defaultValues, currency });
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

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="re-exp-desc">Description (optional)</Label>
        <Input id="re-exp-desc" className="h-10" {...form.register("description")} />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="re-exp-cat">Category</Label>
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
      </div>

      <div className="flex justify-end sm:col-span-2">
        <Button type="submit" disabled={pending} className="min-w-35">
          {pending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save recurring expense"
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

  const form = useForm<RecurringExpenseFormValues>({
    resolver: zodResolver(recurringExpenseFormSchema) as Resolver<RecurringExpenseFormValues>,
    values: editRow
      ? {
          amount: editRow.amount,
          description: editRow.description,
          category: editRow.category,
          currency: editRow.currency || currency,
          recurrenceFrequency: editRow.recurrenceFrequency,
        }
      : { ...defaultValues, currency },
  });

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
            <th className="pb-2 pr-3 font-medium whitespace-nowrap">Recurrence</th>
            <th className="pb-2 pr-3 font-medium whitespace-nowrap text-right">Amount</th>
            <th className="pb-2 font-medium whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const cfg = CATEGORY_CONFIG[row.category];
            return (
              <tr key={row.id} className="border-b border-border/60 last:border-0">
                <td className="max-w-48 truncate py-2.5 pr-3 font-medium">
                  {row.description?.trim() || cfg.label}
                </td>
                <td className="py-2.5 pr-3 text-muted-foreground whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden>{cfg.icon}</span>
                    {cfg.label}
                  </span>
                </td>
                <td className="py-2.5 pr-3 capitalize text-muted-foreground whitespace-nowrap">
                  {row.recurrenceFrequency.toLowerCase()}
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
