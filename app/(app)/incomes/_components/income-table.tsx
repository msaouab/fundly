"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useState,
  useTransition,
} from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Repeat,
  Trash2,
} from "lucide-react";
import { useForm, useWatch, Controller, type Resolver } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteIncome, editIncome } from "../actions";
import {
  incomeEditFormSchema,
  type IncomeEditFormValues,
} from "../schema";
import type { IncomeType } from "@/generated/prisma/enums";
import type { IncomeWithMeta } from "../types";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

const ALL_INCOME_TYPES: IncomeType[] = [
  "SALARY",
  "FREELANCE",
  "PASSIVE",
  "BONUS",
  "OTHER",
];

function incomeTypeLabel(t: IncomeType): string {
  return t.charAt(0) + t.slice(1).toLowerCase();
}

function typeBadge(t: IncomeType) {
  const map: Record<IncomeType, "salary" | "freelance" | "passive" | "bonus" | "other"> = {
    SALARY: "salary",
    FREELANCE: "freelance",
    PASSIVE: "passive",
    BONUS: "bonus",
    OTHER: "other",
  };
  return map[t];
}

type SortKey = "date" | "amount" | "share" | "source";
type SortDir = "asc" | "desc";

type SortState = { key: SortKey; dir: SortDir };

function sortReducer(state: SortState, column: SortKey): SortState {
  if (state.key === column) {
    return { key: state.key, dir: state.dir === "asc" ? "desc" : "asc" };
  }
  return {
    key: column,
    dir: column === "date" ? "desc" : "asc",
  };
}

type IncomeTableProps = {
  incomes: IncomeWithMeta[];
  currency: string;
};

export function IncomeTable({ incomes, currency }: IncomeTableProps) {
  const searchInputId = useId();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<IncomeType>>(
    () => new Set(ALL_INCOME_TYPES),
  );
  const [typeFilterOpen, setTypeFilterOpen] = useState(false);
  const [sort, dispatchSort] = useReducer(sortReducer, {
    key: "date" as SortKey,
    dir: "desc" as SortDir,
  });
  const [page, setPage] = useState(0);
  const [editRow, setEditRow] = useState<IncomeWithMeta | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const allTypesSelected = selectedTypes.size === ALL_INCOME_TYPES.length;

  const typeFilterSummary = useMemo(() => {
    if (allTypesSelected) return "All types";
    return [...selectedTypes]
      .sort()
      .map(incomeTypeLabel)
      .join(", ");
  }, [selectedTypes, allTypesSelected]);

  const filtered = useMemo(() => {
    let rows = [...incomes];
    if (!allTypesSelected && selectedTypes.size > 0) {
      rows = rows.filter((r) => selectedTypes.has(r.type));
    }
    if (debounced) {
      rows = rows.filter(
        (r) =>
          r.source.toLowerCase().includes(debounced) ||
          (r.payee ?? "").toLowerCase().includes(debounced),
      );
    }
    const { key: sortKey, dir: sortDir } = sort;
    rows.sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortKey === "date") {
        return (new Date(a.date).getTime() - new Date(b.date).getTime()) * mul;
      }
      if (sortKey === "amount") {
        return (a.amount - b.amount) * mul;
      }
      if (sortKey === "share") {
        return (a.sharePercent - b.sharePercent) * mul;
      }
      return a.source.localeCompare(b.source) * mul;
    });
    return rows;
  }, [incomes, debounced, selectedTypes, allTypesSelected, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pageCount - 1);
  const slice = filtered.slice(
    pageSafe * PAGE_SIZE,
    pageSafe * PAGE_SIZE + PAGE_SIZE,
  );
  const visibleSum = slice.reduce((s, r) => s + r.amount, 0);
  const monthTotal = incomes.reduce((s, r) => s + r.amount, 0);
  const visibleShare =
    monthTotal > 0 ? (visibleSum / monthTotal) * 100 : 0;

  const toggleSort = useCallback((column: SortKey) => {
    dispatchSort(column);
    setPage(0);
  }, []);

  function setTypeChecked(t: IncomeType, checked: boolean) {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (checked) next.add(t);
      else next.delete(t);
      if (next.size === 0) return new Set(ALL_INCOME_TYPES);
      return next;
    });
    setPage(0);
  }

  function onDeleteConfirmed() {
    if (!deleteId) return;
    startTransition(async () => {
      const res = await deleteIncome(deleteId);
      if (res.ok) {
        toast.success("Income deleted");
        setDeleteId(null);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-background p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          id={searchInputId}
          name="incomeSearch"
          placeholder="Search source or payee…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="max-w-md"
        />
        <Popover open={typeFilterOpen} onOpenChange={setTypeFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-between gap-2 sm:w-[min(100%,280px)]"
              aria-expanded={typeFilterOpen}
              aria-haspopup="dialog"
            >
              <span className="truncate text-left font-normal text-muted-foreground">
                Types:{" "}
                <span className="font-medium text-foreground">{typeFilterSummary}</span>
              </span>
              <ChevronDown className="size-4 shrink-0 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="border-b border-border px-3 py-2">
              <p className="text-sm font-medium text-foreground">Income types</p>
              <p className="text-xs text-muted-foreground">
                Select one or more. Table shows rows matching any selected type.
              </p>
            </div>
            <ul className="max-h-64 space-y-1 overflow-y-auto p-2">
              {ALL_INCOME_TYPES.map((t) => (
                <li key={t}>
                  <label
                    htmlFor={`type-filter-${t}`}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted/80"
                  >
                    <Checkbox
                      id={`type-filter-${t}`}
                      checked={selectedTypes.has(t)}
                      onCheckedChange={(c) =>
                        setTypeChecked(t, c === true)
                      }
                    />
                    <Badge variant={typeBadge(t)} className="font-normal">
                      {incomeTypeLabel(t)}
                    </Badge>
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex gap-2 border-t border-border p-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setSelectedTypes(new Set(ALL_INCOME_TYPES));
                  setPage(0);
                }}
              >
                Select all
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          <p>No income found.</p>
          <Button
            type="button"
            variant="link"
            className="mt-2"
            onClick={() => {
              setSearch("");
              setSelectedTypes(new Set(ALL_INCOME_TYPES));
              setPage(0);
            }}
          >
            Reset filters
          </Button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-2 pr-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                      onClick={() => toggleSort("date")}
                    >
                      Date
                      {sort.key === "date" ? (
                        sort.dir === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        )
                      ) : null}
                    </button>
                  </th>
                  <th className="pb-2 pr-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                      onClick={() => toggleSort("amount")}
                    >
                      Amount
                      {sort.key === "amount" ? (
                        sort.dir === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        )
                      ) : null}
                    </button>
                  </th>
                  <th className="pb-2 pr-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                      onClick={() => toggleSort("share")}
                    >
                      Share %
                      {sort.key === "share" ? (
                        sort.dir === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        )
                      ) : null}
                    </button>
                  </th>
                  <th className="pb-2 pr-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                      onClick={() => toggleSort("source")}
                    >
                      Source
                      {sort.key === "source" ? (
                        sort.dir === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        )
                      ) : null}
                    </button>
                  </th>
                  <th className="pb-2 pr-2">Type</th>
                  <th className="pb-2 pr-2">Recurring</th>
                  <th className="pb-2 pr-2">Payee</th>
                  <th className="pb-2 pr-2">Note</th>
                  <th className="pb-2 pr-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="py-2 pr-2 tabular-nums text-muted-foreground">
                      {format(new Date(row.date), "MMM d, yyyy")}
                    </td>
                    <td className="py-2 pr-2 font-medium tabular-nums">
                      {formatMoney(row.amount, currency)}
                    </td>
                    <td className="py-2 pr-2 text-muted-foreground">
                      {formatPercent(row.sharePercent, 1)}
                    </td>
                    <td className="py-2 pr-2">{row.source}</td>
                    <td className="py-2 pr-2">
                      <Badge variant={typeBadge(row.type)}>{row.type}</Badge>
                    </td>
                    <td className="py-2 pr-2">
                      {row.isRecurring ? (
                        <Repeat className="size-4 text-teal-600 dark:text-teal-400" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="max-w-[120px] truncate py-2 pr-2 text-muted-foreground">
                      {row.payee ?? "—"}
                    </td>
                    <td className="max-w-[140px] truncate py-2 pr-2 text-muted-foreground">
                      {row.note ?? "—"}
                    </td>
                    <td className="py-2 pr-2">
                      {row.id.startsWith("optimistic-") ? (
                        <span className="text-xs text-muted-foreground">Saving…</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0"
                            aria-label="Edit income"
                            onClick={() => setEditRow(row)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0 text-destructive"
                            aria-label="Delete income"
                            onClick={() => setDeleteId(row.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border font-semibold text-foreground">
                  <td className="pt-3 pr-2">Page total</td>
                  <td className="pt-3 pr-2 tabular-nums">
                    {formatMoney(visibleSum, currency)}
                  </td>
                  <td className="pt-3 pr-2 text-muted-foreground">
                    {formatPercent(visibleShare, 1)}
                  </td>
                  <td className="pt-3 pr-2" colSpan={5} />
                  <td className="pt-3 pr-2" />
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {pageSafe + 1} of {pageCount} · {filtered.length} rows
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pageSafe <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pageSafe >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <EditIncomeSheet
        row={editRow}
        currency={currency}
        onClose={() => setEditRow(null)}
        onSaved={() => {
          setEditRow(null);
          router.refresh();
        }}
      />

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete income?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                onDeleteConfirmed();
              }}
              disabled={pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EditIncomeSheet({
  row,
  currency,
  onClose,
  onSaved,
}: {
  row: IncomeWithMeta | null;
  currency: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Sheet
      open={!!row}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="overflow-y-auto sm:max-w-md">
        {row ? (
          <EditIncomeSheetForm
            key={row.id}
            row={row}
            currency={currency}
            onSaved={onSaved}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function EditIncomeSheetForm({
  row,
  currency,
  onSaved,
}: {
  row: IncomeWithMeta;
  currency: string;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const form = useForm<IncomeEditFormValues>({
    resolver: zodResolver(incomeEditFormSchema) as Resolver<IncomeEditFormValues>,
    defaultValues: {
      id: row.id,
      amount: row.amount,
      date: new Date(row.date),
      source: row.source,
      type: row.type,
      currency: row.currency,
      isRecurring: row.isRecurring,
      recurrenceFrequency: row.recurrenceFrequency as IncomeEditFormValues["recurrenceFrequency"],
      payee: row.payee ?? "",
      note: row.note ?? "",
    },
  });

  const type = useWatch({ control: form.control, name: "type" });
  const isRecurring = useWatch({ control: form.control, name: "isRecurring" });
  const showRecurring = type === "SALARY" || type === "PASSIVE";

  useEffect(() => {
    if (!showRecurring) {
      form.setValue("isRecurring", false);
      form.setValue("recurrenceFrequency", null);
    }
  }, [showRecurring, form]);

  useEffect(() => {
    form.reset({
      id: row.id,
      amount: row.amount,
      date: new Date(row.date),
      source: row.source,
      type: row.type,
      currency: row.currency,
      isRecurring: row.isRecurring,
      recurrenceFrequency: row.recurrenceFrequency as IncomeEditFormValues["recurrenceFrequency"],
      payee: row.payee ?? "",
      note: row.note ?? "",
    });
  }, [row, form]);

  function onSubmit(values: IncomeEditFormValues) {
    startTransition(async () => {
      const res = await editIncome({
        ...values,
        currency,
        payee: values.payee === "" || values.payee == null ? null : values.payee,
        note: values.note === "" || values.note == null ? null : values.note,
        recurrenceFrequency: values.isRecurring
          ? values.recurrenceFrequency ?? null
          : null,
      });
      if (res.ok) {
        toast.success("Income updated");
        onSaved();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>Edit income</SheetTitle>
      </SheetHeader>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-6 grid gap-4"
      >
        <input id="edit-income-id" type="hidden" {...form.register("id")} />
        <div className="space-y-2">
          <Label htmlFor="edit-income-amount">Amount ({currency})</Label>
          <Input
            id="edit-income-amount"
            type="number"
            step="0.01"
            {...form.register("amount", { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-income-date-trigger">Date</Label>
          <Controller
            control={form.control}
            name="date"
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="edit-income-date-trigger"
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !field.value && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 size-4" />
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
          <Label htmlFor="edit-income-source">Source</Label>
          <Input id="edit-income-source" {...form.register("source")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-income-type-trigger">Type</Label>
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <Select
                name="editIncomeType"
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger id="edit-income-type-trigger">
                  <SelectValue />
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
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <Label htmlFor="edit-income-recurring">Recurring</Label>
            <Controller
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <Switch
                  id="edit-income-recurring"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
        ) : null}
        {showRecurring && isRecurring ? (
          <Controller
            control={form.control}
            name="recurrenceFrequency"
            render={({ field }) => (
              <Select
                name="editIncomeRecurrence"
                value={field.value ?? ""}
                onValueChange={(v) => field.onChange(v || null)}
              >
                <SelectTrigger id="edit-income-recurrence-trigger">
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
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="edit-income-payee">Payee</Label>
          <Input id="edit-income-payee" {...form.register("payee")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-income-note">Note</Label>
          <Textarea id="edit-income-note" rows={3} maxLength={200} {...form.register("note")} />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </form>
    </>
  );
}
