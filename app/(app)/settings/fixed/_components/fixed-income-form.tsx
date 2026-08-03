"use client";

import { useEffect, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useForm, Controller, useWatch, type Resolver } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createRecurringIncome,
  deleteRecurringIncome,
  updateRecurringIncome,
} from "../actions";
import {
  fromOccurrenceCount,
  recurringIncomeFormSchema,
  type RecurringIncomeFormValues,
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
import { formatMoney } from "@/lib/money";
import { normalizeDateToLocalNoon } from "@/lib/date";
import { ledgerRowHover } from "@/lib/ledger-table-columns";
import { formatOccurrenceEnds } from "@/lib/recurring/occurrence";
import type { IncomeType, RecurrenceFrequency } from "@/generated/prisma/enums";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export type RecurringIncomeRow = {
  id: string;
  source: string;
  type: IncomeType;
  amount: number;
  currency: string;
  recurrenceFrequency: RecurrenceFrequency;
  occurrenceCount: number | null;
  startsAt: string;
};

type FixedIncomeFormProps = {
  currency?: string;
};

function createIncomeDefaults(currency: string): RecurringIncomeFormValues {
  return {
    amount: 0,
    source: "",
    type: "SALARY",
    currency,
    recurrenceFrequency: "MONTHLY",
    endsMode: "indefinite",
    occurrenceCount: null,
    startsAt: normalizeDateToLocalNoon(new Date()),
  };
}

export function FixedIncomeForm({ currency = "MAD" }: FixedIncomeFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<RecurringIncomeFormValues>({
    resolver: zodResolver(recurringIncomeFormSchema) as Resolver<RecurringIncomeFormValues>,
    defaultValues: createIncomeDefaults(currency),
  });
  const endsMode = useWatch({ control: form.control, name: "endsMode" }) ?? "indefinite";
  const recurrenceFrequency =
    useWatch({ control: form.control, name: "recurrenceFrequency" }) ?? "MONTHLY";

  // Align "today" with the client clock after SSR (timezone / stale module Date).
  useEffect(() => {
    form.setValue("startsAt", normalizeDateToLocalNoon(new Date()), {
      shouldDirty: false,
      shouldValidate: false,
    });
  }, [form]);

  function onSubmit(values: RecurringIncomeFormValues) {
    startTransition(async () => {
      const res = await createRecurringIncome({ ...values, currency });
      if (res.ok) {
        toast.success("Recurring income added");
        form.reset(createIncomeDefaults(currency));
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="re-inc-amount">Amount ({currency})</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {currency}
          </span>
          <Input
            id="re-inc-amount"
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

      <RecurringStartsAtField control={form.control} name="startsAt" id="re-inc-starts" />

      <div className="space-y-2">
        <Label htmlFor="re-inc-freq">Recurrence</Label>
        <Controller
          control={form.control}
          name="recurrenceFrequency"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="re-inc-freq" className="h-10 dark:border-zinc-700">
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
        idPrefix="re-inc"
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
        <Label htmlFor="re-inc-source">Source name</Label>
        <Input id="re-inc-source" className="h-10" {...form.register("source")} />
        {form.formState.errors.source ? (
          <p className="text-xs text-destructive">{form.formState.errors.source.message}</p>
        ) : null}
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="re-inc-type">Type</Label>
        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="re-inc-type" className="h-10 dark:border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SALARY">Salary</SelectItem>
                <SelectItem value="PASSIVE">Passive</SelectItem>
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
            "Save recurring income"
          )}
        </Button>
      </div>
    </form>
  );
}

type FixedIncomeTableProps = {
  rows: RecurringIncomeRow[];
  currency: string;
};

export function FixedIncomeTable({ rows, currency }: FixedIncomeTableProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editRow, setEditRow] = useState<RecurringIncomeRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const ends = fromOccurrenceCount(editRow?.occurrenceCount);
  const form = useForm<RecurringIncomeFormValues>({
    resolver: zodResolver(recurringIncomeFormSchema) as Resolver<RecurringIncomeFormValues>,
    values: editRow
      ? {
          amount: editRow.amount,
          source: editRow.source,
          type: editRow.type === "PASSIVE" ? "PASSIVE" : "SALARY",
          currency: editRow.currency || currency,
          recurrenceFrequency: editRow.recurrenceFrequency,
          endsMode: ends.endsMode,
          occurrenceCount: ends.occurrenceCount,
          startsAt: normalizeDateToLocalNoon(new Date(editRow.startsAt)),
        }
      : createIncomeDefaults(currency),
  });
  const endsMode = useWatch({ control: form.control, name: "endsMode" }) ?? "indefinite";
  const editFrequency =
    useWatch({ control: form.control, name: "recurrenceFrequency" }) ?? "MONTHLY";

  function onSaveEdit(values: RecurringIncomeFormValues) {
    if (!editRow) return;
    startTransition(async () => {
      const res = await updateRecurringIncome({ ...values, id: editRow.id });
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
      const res = await deleteRecurringIncome(deleteId);
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
    return <p className="text-sm text-muted-foreground">No recurring incomes yet.</p>;
  }

  return (
    <>
      <table className="w-full min-w-xl text-left text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="pb-2 pr-3 font-medium">Source</th>
            <th className="pb-2 pr-3 font-medium whitespace-nowrap">Type</th>
            <th className="pb-2 pr-3 font-medium whitespace-nowrap">Start</th>
            <th className="pb-2 pr-3 font-medium whitespace-nowrap">Recurrence</th>
            <th className="pb-2 pr-3 font-medium whitespace-nowrap">Ends</th>
            <th className="pb-2 pr-3 font-medium whitespace-nowrap text-right">Amount</th>
            <th className="pb-2 font-medium whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={cn("border-b border-border/60 last:border-0", ledgerRowHover)}
            >
              <td className="max-w-48 truncate py-2.5 pr-3 font-medium">{row.source}</td>
              <td className="py-2.5 pr-3 capitalize text-muted-foreground whitespace-nowrap">
                {row.type.toLowerCase()}
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
          ))}
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
            <DialogTitle>Edit recurring income</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSaveEdit)} className="grid gap-3">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" step="0.01" {...form.register("amount", { valueAsNumber: true })} />
            </div>
            <RecurringStartsAtField control={form.control} name="startsAt" id="edit-inc-starts" />
            <div className="space-y-2">
              <Label>Source</Label>
              <Input {...form.register("source")} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SALARY">Salary</SelectItem>
                      <SelectItem value="PASSIVE">Passive</SelectItem>
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
                idPrefix="edit-inc"
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
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete recurring income?</AlertDialogTitle>
            <AlertDialogDescription>
              It will no longer appear in monthly income tables. This cannot be undone.
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
