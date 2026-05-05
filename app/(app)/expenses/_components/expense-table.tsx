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
  Copy,
  Loader2,
  Pencil,
  Repeat,
  Trash2,
} from "lucide-react";
import { useForm, useWatch, Controller, type Resolver } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteExpense, deleteExpenses, duplicateExpenses, editExpense } from "../actions";
import { expenseEditFormSchema, type ExpenseEditFormValues } from "../schema";
import type { ExpenseCategory, ExpenseKind } from "@/generated/prisma/enums";
import type { ExpenseWithMeta } from "../types";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { EXPENSE_CATEGORY_ORDER, CATEGORY_CONFIG } from "@/lib/expense-categories";
import { addMonths, formatMonthKey } from "@/lib/month";
import { formatMoney, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import { ExpenseTypeToggle } from "./expense-type-toggle";

const PAGE_SIZE = 50;

const ALL_CATEGORIES: ExpenseCategory[] = EXPENSE_CATEGORY_ORDER;

const ALL_KINDS: ExpenseKind[] = ["FIXED", "VARIABLE"];

function kindLabel(k: ExpenseKind): string {
  return k === "FIXED" ? "Fixed" : "Variable";
}

type SortKey = "date" | "amount" | "share" | "description" | "category" | "kind";
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

type ExpenseTableProps = {
  expenses: ExpenseWithMeta[];
  currency: string;
  totalIncome: number;
  monthKey: string;
  onFocusAddForm?: () => void;
};

export function ExpenseTable({
  expenses,
  currency,
  totalIncome,
  monthKey,
  onFocusAddForm,
}: ExpenseTableProps) {
  const searchInputId = useId();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selectedKinds, setSelectedKinds] = useState<Set<ExpenseKind>>(
    () => new Set(ALL_KINDS),
  );
  const [kindFilterOpen, setKindFilterOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<ExpenseCategory>>(
    () => new Set(ALL_CATEGORIES),
  );
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false);
  const [sort, dispatchSort] = useReducer(sortReducer, {
    key: "date" as SortKey,
    dir: "desc" as SortDir,
  });
  const [page, setPage] = useState(0);
  const [editRow, setEditRow] = useState<ExpenseWithMeta | null>(null);
  const [deleteRow, setDeleteRow] = useState<ExpenseWithMeta | null>(null);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [bulkDupOpen, setBulkDupOpen] = useState(false);
  const [bulkTargetKey, setBulkTargetKey] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [vy, vm] = monthKey.split("-").map(Number);
  const bulkTargetOptions = useMemo(() => {
    const out: { key: string; label: string }[] = [];
    for (let i = 1; i <= 3; i++) {
      const { year, month } = addMonths(vy, vm, i);
      const key = formatMonthKey(year, month);
      out.push({
        key,
        label: format(new Date(year, month - 1, 1), "MMMM yyyy"),
      });
    }
    return out;
  }, [vy, vm]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const allCategoriesSelected = selectedCategories.size === ALL_CATEGORIES.length;
  const allKindsSelected = selectedKinds.size === ALL_KINDS.length;

  const kindFilterSummary = useMemo(() => {
    if (allKindsSelected) return "All kinds";
    return [...selectedKinds].sort().map(kindLabel).join(", ");
  }, [selectedKinds, allKindsSelected]);

  const categoryFilterSummary = useMemo(() => {
    if (allCategoriesSelected) return "All categories";
    return [...selectedCategories]
      .sort()
      .map((c) => CATEGORY_CONFIG[c].label)
      .join(", ");
  }, [selectedCategories, allCategoriesSelected]);

  const filtered = useMemo(() => {
    let rows = [...expenses];
    if (!allKindsSelected && selectedKinds.size > 0) {
      rows = rows.filter((r) => selectedKinds.has(r.kind));
    }
    if (!allCategoriesSelected && selectedCategories.size > 0) {
      rows = rows.filter((r) => selectedCategories.has(r.category));
    }
    if (debounced) {
      rows = rows.filter(
        (r) =>
          (r.description || "").toLowerCase().includes(debounced) ||
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
      if (sortKey === "description") {
        return (a.description || "").localeCompare(b.description || "") * mul;
      }
      if (sortKey === "category") {
        return a.category.localeCompare(b.category) * mul;
      }
      return a.kind.localeCompare(b.kind) * mul;
    });
    return rows;
  }, [
    expenses,
    debounced,
    selectedCategories,
    allCategoriesSelected,
    sort,
    selectedKinds,
    allKindsSelected,
  ]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pageCount - 1);
  const slice = filtered.slice(
    pageSafe * PAGE_SIZE,
    pageSafe * PAGE_SIZE + PAGE_SIZE,
  );
  const visibleSum = slice.reduce((s, r) => s + r.amount, 0);
  const visibleShareOfIncome =
    totalIncome > 0 ? (visibleSum / totalIncome) * 100 : 0;

  const selectedIds = useMemo(
    () =>
      Object.entries(rowSelection)
        .filter(([, v]) => v)
        .map(([id]) => id)
        .filter((id) => !id.startsWith("optimistic-")),
    [rowSelection],
  );

  const toggleSort = useCallback((column: SortKey) => {
    dispatchSort(column);
    setPage(0);
  }, []);

  function setKindChecked(k: ExpenseKind, checked: boolean) {
    setSelectedKinds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(k);
      else next.delete(k);
      if (next.size === 0) return new Set(ALL_KINDS);
      return next;
    });
    setPage(0);
  }

  function setCategoryChecked(c: ExpenseCategory, checked: boolean) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (checked) next.add(c);
      else next.delete(c);
      if (next.size === 0) return new Set(ALL_CATEGORIES);
      return next;
    });
    setPage(0);
  }

  function toggleRow(id: string, checked: boolean) {
    setRowSelection((s) => ({ ...s, [id]: checked }));
  }

  function togglePageRows(checked: boolean) {
    setRowSelection((s) => {
      const next = { ...s };
      for (const r of slice) {
        if (!r.id.startsWith("optimistic-")) next[r.id] = checked;
      }
      return next;
    });
  }

  const pageSelectableIds = slice.filter((r) => !r.id.startsWith("optimistic-")).map((r) => r.id);
  const allPageSelected =
    pageSelectableIds.length > 0 && pageSelectableIds.every((id) => rowSelection[id]);

  function onDeleteConfirmed() {
    if (!deleteRow) return;
    startTransition(async () => {
      const res = await deleteExpense(deleteRow.id);
      if (res.ok) {
        toast.success("Expense deleted");
        setDeleteRow(null);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function bulkDelete() {
    if (!selectedIds.length) return;
    startTransition(async () => {
      const res = await deleteExpenses(selectedIds);
      if (res.ok) {
        toast.success(`Deleted ${res.data.count} expense${res.data.count === 1 ? "" : "s"}`);
        setRowSelection({});
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function openBulkDuplicate() {
    setBulkTargetKey(bulkTargetOptions[0]?.key ?? null);
    setBulkDupOpen(true);
  }

  function confirmBulkDuplicate() {
    const key = bulkTargetKey ?? bulkTargetOptions[0]?.key;
    if (!key || !selectedIds.length) return;
    startTransition(async () => {
      const res = await duplicateExpenses(selectedIds, key);
      if (res.ok) {
        toast.success(
          `Duplicated ${res.data.count} expense${res.data.count === 1 ? "" : "s"}`,
        );
        setBulkDupOpen(false);
        setRowSelection({});
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-background p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3">
        <Input
          id={searchInputId}
          name="expenseSearch"
          placeholder="Search description or payee…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="max-w-md dark:border-zinc-700"
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Popover open={kindFilterOpen} onOpenChange={setKindFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-between gap-2 sm:w-[min(100%,280px)] dark:border-zinc-700"
                aria-expanded={kindFilterOpen}
                aria-haspopup="dialog"
              >
                <span className="truncate text-left font-normal text-muted-foreground">
                  Kind:{" "}
                  <span className="font-medium text-foreground">{kindFilterSummary}</span>
                </span>
                <ChevronDown className="size-4 shrink-0 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <div className="border-b border-border px-3 py-2 dark:border-zinc-800">
                <p className="text-sm font-medium text-foreground">Expense kind</p>
                <p className="text-xs text-muted-foreground">
                  Show rows matching any selected kind.
                </p>
              </div>
              <ul className="space-y-1 p-2">
                {ALL_KINDS.map((k) => (
                  <li key={k}>
                    <label
                      htmlFor={`kind-filter-${k}`}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted/80 dark:hover:bg-zinc-800/80"
                    >
                      <Checkbox
                        id={`kind-filter-${k}`}
                        checked={selectedKinds.has(k)}
                        onCheckedChange={(c) => setKindChecked(k, c === true)}
                      />
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-normal",
                          k === "FIXED"
                            ? "border-primary/45 text-primary dark:border-primary/50"
                            : "border-border text-muted-foreground dark:border-zinc-600",
                        )}
                      >
                        {kindLabel(k)}
                      </Badge>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 border-t border-border p-2 dark:border-zinc-800">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setSelectedKinds(new Set(ALL_KINDS));
                    setPage(0);
                  }}
                >
                  Select all
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Popover open={categoryFilterOpen} onOpenChange={setCategoryFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-between gap-2 sm:w-[min(100%,320px)] dark:border-zinc-700"
              aria-expanded={categoryFilterOpen}
              aria-haspopup="dialog"
            >
              <span className="truncate text-left font-normal text-muted-foreground">
                Categories:{" "}
                <span className="font-medium text-foreground">{categoryFilterSummary}</span>
              </span>
              <ChevronDown className="size-4 shrink-0 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="border-b border-border px-3 py-2 dark:border-zinc-800">
              <p className="text-sm font-medium text-foreground">Categories</p>
              <p className="text-xs text-muted-foreground">
                Show rows matching any selected category.
              </p>
            </div>
            <ul className="max-h-64 space-y-1 overflow-y-auto p-2">
              {ALL_CATEGORIES.map((c) => {
                const cfg = CATEGORY_CONFIG[c];
                return (
                  <li key={c}>
                    <label
                      htmlFor={`cat-filter-${c}`}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted/80 dark:hover:bg-zinc-800/80"
                    >
                      <Checkbox
                        id={`cat-filter-${c}`}
                        checked={selectedCategories.has(c)}
                        onCheckedChange={(v) => setCategoryChecked(c, v === true)}
                      />
                      <span className="text-base" aria-hidden>
                        {cfg.icon}
                      </span>
                      <span>{cfg.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <div className="flex gap-2 border-t border-border p-2 dark:border-zinc-800">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setSelectedCategories(new Set(ALL_CATEGORIES));
                  setPage(0);
                }}
              >
                Select all
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        </div>
      </div>

      {selectedIds.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-800/40">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{selectedIds.length}</span> selected
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={openBulkDuplicate}>
              <Copy className="mr-1 size-4" />
              Duplicate
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={bulkDelete}
            >
              <Trash2 className="mr-1 size-4" />
              Delete
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setRowSelection({})}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground dark:border-zinc-700">
          {expenses.length === 0 ? (
            <>
              <p>No expenses yet.</p>
              {onFocusAddForm ? (
                <Button type="button" variant="link" className="mt-2" onClick={onFocusAddForm}>
                  Focus add form
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <p>No expenses match your filters.</p>
              <Button
                type="button"
                variant="link"
                className="mt-2"
                onClick={() => {
                  setSearch("");
                  setSelectedKinds(new Set(ALL_KINDS));
                  setSelectedCategories(new Set(ALL_CATEGORIES));
                  setPage(0);
                }}
              >
                Reset filters
              </Button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground dark:border-zinc-800">
                  <th className="pb-2 pr-2">
                    <Checkbox
                      checked={allPageSelected}
                      onCheckedChange={(c) => togglePageRows(c === true)}
                      aria-label="Select page"
                    />
                  </th>
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
                      title="Each row as a percent of monthly income"
                      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                      onClick={() => toggleSort("share")}
                    >
                      <span className="whitespace-nowrap">% of income</span>
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
                      onClick={() => toggleSort("description")}
                    >
                      Description
                      {sort.key === "description" ? (
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
                      onClick={() => toggleSort("category")}
                    >
                      Category
                      {sort.key === "category" ? (
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
                      onClick={() => toggleSort("kind")}
                    >
                      Kind
                      {sort.key === "kind" ? (
                        sort.dir === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        )
                      ) : null}
                    </button>
                  </th>
                  <th className="pb-2 pr-2">Recurring</th>
                  <th className="pb-2 pr-2">Payee</th>
                  <th className="pb-2 pr-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((row) => {
                  const cfg = CATEGORY_CONFIG[row.category];
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-border/60 last:border-0 dark:border-zinc-800/60"
                    >
                      <td className="py-2 pr-2">
                        {row.id.startsWith("optimistic-") ? (
                          <span className="inline-block w-4" />
                        ) : (
                          <Checkbox
                            checked={!!rowSelection[row.id]}
                            onCheckedChange={(c) => toggleRow(row.id, c === true)}
                            aria-label={`Select ${row.description?.trim() || "unnamed expense"}`}
                          />
                        )}
                      </td>
                      <td className="py-2 pr-2 tabular-nums text-muted-foreground">
                        {format(new Date(row.date), "MMM d, yyyy")}
                      </td>
                      <td className="py-2 pr-2 font-medium tabular-nums">
                        {formatMoney(row.amount, currency)}
                      </td>
                      <td className="py-2 pr-2 text-muted-foreground">
                        {formatPercent(row.sharePercent, 1)}
                      </td>
                      <td className="py-2 pr-2">
                        {row.description?.trim() ? (
                          row.description
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        <span className="inline-flex items-center gap-1.5">
                          <span aria-hidden>{cfg.icon}</span>
                          <span className="text-muted-foreground">{cfg.label}</span>
                        </span>
                      </td>
                      <td className="py-2 pr-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            row.kind === "FIXED"
                              ? "border-primary/45 text-primary dark:border-primary/50"
                              : "border-border text-muted-foreground dark:border-zinc-600",
                          )}
                        >
                          {row.kind === "FIXED" ? "Fixed" : "Variable"}
                        </Badge>
                      </td>
                      <td className="py-2 pr-2">
                        {row.isRecurring ? (
                          <Repeat className="size-4 text-primary" aria-label="Recurring" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="max-w-[120px] truncate py-2 pr-2 text-muted-foreground">
                        {row.payee ?? "—"}
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
                              aria-label="Edit expense"
                              onClick={() => setEditRow(row)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 shrink-0 text-destructive"
                              aria-label="Delete expense"
                              onClick={() => setDeleteRow(row)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border font-semibold text-foreground dark:border-zinc-800">
                  <td className="pt-3 pr-2" />
                  <td className="pt-3 pr-2">Page total</td>
                  <td className="pt-3 pr-2 tabular-nums">{formatMoney(visibleSum, currency)}</td>
                  <td className="pt-3 pr-2 text-muted-foreground">
                    {formatPercent(visibleShareOfIncome, 1)} of income
                  </td>
                  <td className="pt-3 pr-2" colSpan={5} />
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

      <EditExpenseSheet
        row={editRow}
        currency={currency}
        onClose={() => setEditRow(null)}
        onSaved={() => {
          setEditRow(null);
          router.refresh();
        }}
      />

      <Dialog open={bulkDupOpen} onOpenChange={setBulkDupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate selected expenses</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="bulk-dup-target-month">Target month</Label>
            <Select
              name="bulkDuplicateExpenseTargetMonth"
              value={bulkTargetKey ?? bulkTargetOptions[0]?.key ?? ""}
              onValueChange={setBulkTargetKey}
            >
              <SelectTrigger id="bulk-dup-target-month" className="dark:border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {bulkTargetOptions.map((o) => (
                  <SelectItem key={o.key} value={o.key}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBulkDupOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={pending} onClick={confirmBulkDuplicate}>
              {pending ? "Duplicating…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteRow}
        onOpenChange={(open) => {
          if (!open) setDeleteRow(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRow
                ? deleteRow.description?.trim()
                  ? `This will permanently remove “${deleteRow.description.trim()}”. This cannot be undone.`
                  : "This expense will be permanently removed. This cannot be undone."
                : null}
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

function EditExpenseSheet({
  row,
  currency,
  onClose,
  onSaved,
}: {
  row: ExpenseWithMeta | null;
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
          <EditExpenseSheetForm key={row.id} row={row} currency={currency} onSaved={onSaved} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function EditExpenseSheetForm({
  row,
  currency,
  onSaved,
}: {
  row: ExpenseWithMeta;
  currency: string;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const form = useForm<ExpenseEditFormValues>({
    resolver: zodResolver(expenseEditFormSchema) as Resolver<ExpenseEditFormValues>,
    defaultValues: {
      id: row.id,
      amount: row.amount,
      date: new Date(row.date),
      description: row.description,
      kind: row.kind,
      category: row.category,
      currency: row.currency,
      isRecurring: row.isRecurring,
      recurrenceFrequency: row.recurrenceFrequency as ExpenseEditFormValues["recurrenceFrequency"],
      payee: row.payee ?? "",
      note: row.note ?? "",
    },
  });

  const kind = useWatch({ control: form.control, name: "kind" });
  const isRecurring = useWatch({ control: form.control, name: "isRecurring" });

  useEffect(() => {
    if (kind === "VARIABLE") {
      form.setValue("isRecurring", false);
      form.setValue("recurrenceFrequency", null);
    }
  }, [kind, form]);

  useEffect(() => {
    form.reset({
      id: row.id,
      amount: row.amount,
      date: new Date(row.date),
      description: row.description,
      kind: row.kind,
      category: row.category,
      currency: row.currency,
      isRecurring: row.isRecurring,
      recurrenceFrequency: row.recurrenceFrequency as ExpenseEditFormValues["recurrenceFrequency"],
      payee: row.payee ?? "",
      note: row.note ?? "",
    });
  }, [row, form]);

  function onSubmit(values: ExpenseEditFormValues) {
    startTransition(async () => {
      const res = await editExpense({
        ...values,
        currency,
        payee: values.payee === "" || values.payee == null ? null : values.payee,
        note: values.note === "" || values.note == null ? null : values.note,
        isRecurring: values.kind === "FIXED" ? values.isRecurring : false,
        recurrenceFrequency:
          values.kind === "FIXED" && values.isRecurring
            ? values.recurrenceFrequency ?? null
            : null,
      });
      if (res.ok) {
        toast.success("Expense updated");
        onSaved();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>Edit expense</SheetTitle>
      </SheetHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 grid gap-4">
        <input id="edit-expense-id" type="hidden" {...form.register("id")} />
        <div className="space-y-2">
          <p className="text-sm font-medium">Kind</p>
          <Controller
            control={form.control}
            name="kind"
            render={({ field }) => (
              <ExpenseTypeToggle
                value={field.value}
                onChange={field.onChange}
                disabled={pending}
              />
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-expense-amount">Amount ({currency})</Label>
          <Input
            id="edit-expense-amount"
            type="number"
            step="0.01"
            {...form.register("amount", { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-expense-date-trigger">Date</Label>
          <Controller
            control={form.control}
            name="date"
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="edit-expense-date-trigger"
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal dark:border-zinc-700",
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
          <Label htmlFor="edit-expense-description">Description (optional)</Label>
          <Input id="edit-expense-description" {...form.register("description")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-expense-category-trigger">Category</Label>
          <Controller
            control={form.control}
            name="category"
            render={({ field }) => (
              <Select
                name="editExpenseCategory"
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger id="edit-expense-category-trigger" className="dark:border-zinc-700">
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
        {kind === "FIXED" ? (
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 dark:border-zinc-700">
            <Label htmlFor="edit-expense-recurring">Recurring</Label>
            <Controller
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <Switch
                  id="edit-expense-recurring"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
        ) : null}
        {kind === "FIXED" && isRecurring ? (
          <Controller
            control={form.control}
            name="recurrenceFrequency"
            render={({ field }) => (
              <Select
                name="editExpenseRecurrence"
                value={field.value ?? ""}
                onValueChange={(v) => field.onChange(v || null)}
              >
                <SelectTrigger id="edit-expense-recurrence-trigger" className="dark:border-zinc-700">
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
          <Label htmlFor="edit-expense-payee">Payee</Label>
          <Input id="edit-expense-payee" {...form.register("payee")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-expense-note">Note</Label>
          <Textarea id="edit-expense-note" rows={3} maxLength={200} {...form.register("note")} />
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
