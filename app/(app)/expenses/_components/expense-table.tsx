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
  Copy,
  Loader2,
  Pencil,
  PiggyBank,
  Repeat,
  Trash2,
} from "lucide-react";
import { useForm, useWatch, Controller, type Resolver } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteExpense, deleteExpenses, duplicateExpenses, editExpense } from "../actions";
import {
  setRecurringExpensePaid,
} from "@/app/(app)/settings/fixed/actions";
import { isRecurringRowId, parseRecurringExpenseRowId } from "@/lib/recurring/ids";
import { formatRecurrenceFrequency } from "@/lib/recurring/labels";
import { RecurringPaidToggle } from "@/components/recurring-paid-toggle";
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
import { PayeeSwitchField } from "@/components/payee-switch-field";
import { PayeeYesNo } from "@/components/payee-yes-no";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { LedgerTableScroll } from "@/components/ledger-table-scroll";
import { ledgerColNowrap, ledgerColPrimaryText, ledgerRowHover } from "@/lib/ledger-table-columns";
import { EXPENSE_CATEGORY_ORDER, CATEGORY_CONFIG } from "@/lib/expense-categories";
import { addMonths, formatMonthKey } from "@/lib/month";
import { formatMoney, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import { TablePagination } from "@/components/table-pagination";
import { useTablePagination } from "@/hooks/use-table-pagination";
import { ExpenseTypeToggle } from "./expense-type-toggle";

function ExpensePaidCell({ row }: { row: ExpenseWithMeta }) {
  const parsed = parseRecurringExpenseRowId(row.id);
  if (parsed) {
    return (
      <RecurringPaidToggle
        checked={row.payee}
        onToggle={async (next) => {
          const res = await setRecurringExpensePaid({
            templateId: parsed.templateId,
            year: parsed.year,
            month: parsed.month,
            payee: next,
          });
          return res.ok ? { ok: true } : { ok: false, error: res.error };
        }}
      />
    );
  }
  return (
    <PayeeYesNo value={row.payee} trueLabel="Paid" falseLabel="Unpaid" />
  );
}

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

const SAVINGS_CATEGORY: ExpenseCategory = "SAVINGS_CONTRIBUTION";

function isSavingsTransfer(row: ExpenseWithMeta): boolean {
  return row.category === SAVINGS_CATEGORY;
}

type ExpenseTableProps = {
  expenses: ExpenseWithMeta[];
  currency: string;
  totalIncome: number;
  monthKey: string;
  onFocusAddForm?: () => void;
  /**
   * When true (default), SAVINGS_CONTRIBUTION rows are pulled into a separate
   * collapsible group so they stay visible but isolated from spend.
   * Set false on the Savings page where the whole table is already transfers.
   */
  isolateSavings?: boolean;
};

export function ExpenseTable({
  expenses,
  currency,
  totalIncome,
  monthKey,
  onFocusAddForm,
  isolateSavings = true,
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
  const [editRow, setEditRow] = useState<ExpenseWithMeta | null>(null);
  const [deleteRow, setDeleteRow] = useState<ExpenseWithMeta | null>(null);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [bulkDupOpen, setBulkDupOpen] = useState(false);
  const [bulkTargetKey, setBulkTargetKey] = useState<string | null>(null);
  const [fixedExpanded, setFixedExpanded] = useState(true);
  const [savingsExpanded, setSavingsExpanded] = useState(true);
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
          (r.payee ? "paid yes" : "unpaid no").includes(debounced),
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

  const { savingsRows, fixedRows, variableRows } = useMemo(() => {
    const savings: ExpenseWithMeta[] = [];
    const fixed: ExpenseWithMeta[] = [];
    const variable: ExpenseWithMeta[] = [];
    for (const row of filtered) {
      if (isolateSavings && isSavingsTransfer(row)) {
        savings.push(row);
        continue;
      }
      if (row.kind === "FIXED" || isRecurringRowId(row.id)) fixed.push(row);
      else variable.push(row);
    }
    return { savingsRows: savings, fixedRows: fixed, variableRows: variable };
  }, [filtered, isolateSavings]);

  const showSavingsGroup = isolateSavings && savingsRows.length > 0;
  const showFixedGroup = fixedRows.length > 0;
  const savingsTotal = useMemo(
    () => savingsRows.reduce((sum, row) => sum + row.amount, 0),
    [savingsRows],
  );
  const savingsPaidCount = useMemo(
    () => savingsRows.reduce((count, row) => (row.payee ? count + 1 : count), 0),
    [savingsRows],
  );
  const savingsShareOfIncome = totalIncome > 0 ? (savingsTotal / totalIncome) * 100 : 0;
  const fixedTotal = useMemo(
    () => fixedRows.reduce((sum, row) => sum + row.amount, 0),
    [fixedRows],
  );
  const fixedPaidCount = useMemo(
    () => fixedRows.reduce((count, row) => (row.payee ? count + 1 : count), 0),
    [fixedRows],
  );
  const fixedShareOfIncome = totalIncome > 0 ? (fixedTotal / totalIncome) * 100 : 0;

  const pagination = useTablePagination(variableRows.length, {
    storageKey: "fundly-expense-table-page-size",
  });
  const { resetPage, setPage, setPageSize, sliceItems, ...paginationMeta } = pagination;
  const slice = sliceItems(variableRows);
  const variableSum = slice.reduce((s, r) => s + r.amount, 0);
  const visibleSum =
    (showSavingsGroup ? savingsTotal : 0) + (showFixedGroup ? fixedTotal : 0) + variableSum;
  const visibleShareOfIncome =
    totalIncome > 0 ? (visibleSum / totalIncome) * 100 : 0;

  const selectedRowIds = useMemo(
    () =>
      Object.entries(rowSelection)
        .filter(([, v]) => v)
        .map(([id]) => id)
        .filter((id) => !id.startsWith("optimistic-")),
    [rowSelection],
  );

  /** Variable ledger rows only — bulk delete / duplicate cannot target template projections. */
  const selectedIds = useMemo(
    () => selectedRowIds.filter((id) => !isRecurringRowId(id)),
    [selectedRowIds],
  );

  const selectedTotal = useMemo(() => {
    if (selectedRowIds.length === 0) return 0;
    const idSet = new Set(selectedRowIds);
    return expenses.reduce((sum, row) => (idSet.has(row.id) ? sum + row.amount : sum), 0);
  }, [expenses, selectedRowIds]);

  const toggleSort = useCallback((column: SortKey) => {
    dispatchSort(column);
    resetPage();
  }, [resetPage]);

  function setKindChecked(k: ExpenseKind, checked: boolean) {
    setSelectedKinds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(k);
      else next.delete(k);
      if (next.size === 0) return new Set(ALL_KINDS);
      return next;
    });
    resetPage();
  }

  function setCategoryChecked(c: ExpenseCategory, checked: boolean) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (checked) next.add(c);
      else next.delete(c);
      if (next.size === 0) return new Set(ALL_CATEGORIES);
      return next;
    });
    resetPage();
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

  function toggleFixedGroup(checked: boolean) {
    setRowSelection((s) => {
      const next = { ...s };
      for (const r of fixedRows) {
        if (!r.id.startsWith("optimistic-")) next[r.id] = checked;
      }
      return next;
    });
  }

  function toggleSavingsGroup(checked: boolean) {
    setRowSelection((s) => {
      const next = { ...s };
      for (const r of savingsRows) {
        if (!r.id.startsWith("optimistic-")) next[r.id] = checked;
      }
      return next;
    });
  }

  const pageSelectableIds = slice.filter((r) => !r.id.startsWith("optimistic-")).map((r) => r.id);
  const allPageSelected =
    pageSelectableIds.length > 0 && pageSelectableIds.every((id) => rowSelection[id]);

  const fixedSelectableIds = fixedRows
    .filter((r) => !r.id.startsWith("optimistic-"))
    .map((r) => r.id);
  const allFixedSelected =
    fixedSelectableIds.length > 0 && fixedSelectableIds.every((id) => rowSelection[id]);
  const someFixedSelected =
    fixedSelectableIds.some((id) => rowSelection[id]) && !allFixedSelected;

  const savingsSelectableIds = savingsRows
    .filter((r) => !r.id.startsWith("optimistic-"))
    .map((r) => r.id);
  const allSavingsSelected =
    savingsSelectableIds.length > 0 && savingsSelectableIds.every((id) => rowSelection[id]);
  const someSavingsSelected =
    savingsSelectableIds.some((id) => rowSelection[id]) && !allSavingsSelected;

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
    <div className="w-full min-w-0 space-y-4 rounded-xl border border-border bg-background p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="rounded-lg border border-border bg-muted/30 p-3 dark:border-zinc-800 dark:bg-zinc-800/30">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row">
            <Input
              id={searchInputId}
              name="expenseSearch"
              placeholder="Search description or payee…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              className="w-full sm:max-w-md dark:border-zinc-700"
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-nowrap">
              <Popover open={kindFilterOpen} onOpenChange={setKindFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-between gap-2 bg-background sm:w-[min(100%,280px)] dark:border-zinc-700"
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
                        resetPage();
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
                    className="w-full justify-between gap-2 bg-background sm:w-[min(100%,320px)] dark:border-zinc-700"
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
                        resetPage();
                      }}
                    >
                      Select all
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {selectedRowIds.length > 0 ? (
            <div className="flex shrink-0 flex-col gap-2 rounded-lg border border-border bg-background p-3 shadow-sm lg:min-w-72 dark:border-zinc-700 dark:bg-zinc-900/80">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{selectedRowIds.length}</span> selected
                </p>
                <p className="text-sm font-semibold tabular-nums text-foreground">
                  {formatMoney(selectedTotal, currency)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={selectedIds.length === 0}
                  onClick={openBulkDuplicate}
                >
                  <Copy className="mr-1 size-4" />
                  Duplicate
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={pending || selectedIds.length === 0}
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
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          variant={expenses.length === 0 ? "ledger" : "ledger-filtered"}
          title={expenses.length === 0 ? "No expenses yet" : "No expenses match your filters"}
          className="rounded-lg border border-dashed border-border dark:border-zinc-700"
        >
          {expenses.length === 0 && onFocusAddForm ? (
            <Button type="button" variant="link" onClick={onFocusAddForm}>
              Open add expense form
            </Button>
          ) : null}
          {expenses.length > 0 ? (
            <Button
              type="button"
              variant="link"
              onClick={() => {
                setSearch("");
                setSelectedKinds(new Set(ALL_KINDS));
                setSelectedCategories(new Set(ALL_CATEGORIES));
                resetPage();
              }}
            >
              Reset filters
            </Button>
          ) : null}
        </EmptyState>
      ) : (
        <>
          <ul className="space-y-3 md:hidden" aria-label="Expense entries">
            {showSavingsGroup ? (
              <li className="rounded-lg border border-emerald-500/35 bg-emerald-500/5 p-3 dark:border-emerald-500/40 dark:bg-emerald-500/10">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={
                      allSavingsSelected ? true : someSavingsSelected ? "indeterminate" : false
                    }
                    onCheckedChange={(c) => toggleSavingsGroup(c === true)}
                    aria-label="Select all savings transfers"
                    className="mt-0.5"
                  />
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setSavingsExpanded((v) => !v)}
                    aria-expanded={savingsExpanded}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="inline-flex min-w-0 items-center gap-1.5 font-medium text-foreground">
                        <ChevronDown
                          className={cn(
                            "size-4 shrink-0 transition-transform",
                            !savingsExpanded && "-rotate-90",
                          )}
                          aria-hidden
                        />
                        <PiggyBank className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                        Savings transfers
                        <span className="text-xs font-normal text-muted-foreground">
                          ({savingsRows.length})
                        </span>
                      </p>
                      <p className="shrink-0 text-base font-semibold tabular-nums">
                        {formatMoney(savingsTotal, currency)}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatPercent(savingsShareOfIncome, 1)} of income
                      {" · "}
                      <span
                        className={
                          savingsPaidCount > 0
                            ? "text-emerald-700 dark:text-emerald-300"
                            : undefined
                        }
                      >
                        {savingsPaidCount}/{savingsRows.length} paid
                      </span>
                      {savingsExpanded ? " · tap to collapse" : " · tap to expand"}
                    </p>
                  </button>
                </div>
                {savingsExpanded ? (
                  <ul className="mt-3 space-y-2 border-t border-emerald-500/25 pt-3 dark:border-emerald-500/30">
                    {savingsRows.map((row) => {
                      const cfg = CATEGORY_CONFIG[row.category];
                      return (
                        <li
                          key={row.id}
                          className="rounded-md border border-emerald-500/20 bg-background/80 p-2.5 dark:border-emerald-500/25 dark:bg-zinc-950/40"
                        >
                          <div className="flex items-start gap-2">
                            {!row.id.startsWith("optimistic-") ? (
                              <Checkbox
                                checked={!!rowSelection[row.id]}
                                onCheckedChange={(c) => toggleRow(row.id, c === true)}
                                aria-label={`Select ${row.description?.trim() || "saving"}`}
                                className="mt-0.5"
                              />
                            ) : (
                              <span className="inline-block w-4 shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="min-w-0 flex-1 truncate text-sm font-medium">
                                  {row.description?.trim() || "—"}
                                </p>
                                <p className="shrink-0 text-sm font-semibold tabular-nums">
                                  {formatMoney(row.amount, currency)}
                                </p>
                              </div>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {format(new Date(row.date), "MMM d, yyyy")} · {cfg.icon}{" "}
                                {cfg.label}
                              </p>
                              <div className="mt-2 flex items-center justify-between gap-2">
                                <Badge
                                  variant="outline"
                                  className="border-emerald-500/45 text-emerald-700 dark:border-emerald-500/50 dark:text-emerald-300"
                                >
                                  Savings
                                </Badge>
                                {row.id.startsWith("optimistic-") ? (
                                  <span className="text-xs text-muted-foreground">Saving…</span>
                                ) : isRecurringRowId(row.id) ? (
                                  <ExpensePaidCell row={row} />
                                ) : (
                                  <div className="flex gap-1">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-8"
                                      onClick={() => setEditRow(row)}
                                    >
                                      <Pencil className="size-4" />
                                      Edit
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 text-destructive"
                                      onClick={() => setDeleteRow(row)}
                                    >
                                      <Trash2 className="size-4" />
                                      Delete
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            ) : null}
            {showFixedGroup ? (
              <li className="rounded-lg border border-primary/30 bg-primary/5 p-3 dark:border-primary/35 dark:bg-primary/10">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={
                      allFixedSelected ? true : someFixedSelected ? "indeterminate" : false
                    }
                    onCheckedChange={(c) => toggleFixedGroup(c === true)}
                    aria-label="Select all fixed expenses"
                    className="mt-0.5"
                  />
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setFixedExpanded((v) => !v)}
                    aria-expanded={fixedExpanded}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="inline-flex min-w-0 items-center gap-1.5 font-medium text-foreground">
                        <ChevronDown
                          className={cn(
                            "size-4 shrink-0 transition-transform",
                            !fixedExpanded && "-rotate-90",
                          )}
                          aria-hidden
                        />
                        Fixed expenses
                        <span className="text-xs font-normal text-muted-foreground">
                          ({fixedRows.length})
                        </span>
                      </p>
                      <p className="shrink-0 text-base font-semibold tabular-nums">
                        {formatMoney(fixedTotal, currency)}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatPercent(fixedShareOfIncome, 1)} of income
                      {" · "}
                      <span
                        className={
                          fixedPaidCount > 0
                            ? "text-emerald-700 dark:text-emerald-300"
                            : undefined
                        }
                      >
                        {fixedPaidCount}/{fixedRows.length} paid
                      </span>
                      {fixedExpanded ? " · tap to collapse" : " · tap to expand"}
                    </p>
                  </button>
                </div>
                {fixedExpanded ? (
                  <ul className="mt-3 space-y-2 border-t border-primary/20 pt-3 dark:border-primary/25">
                    {fixedRows.map((row) => {
                      const cfg = CATEGORY_CONFIG[row.category];
                      return (
                        <li
                          key={row.id}
                          className="rounded-md border border-border/60 bg-background/80 p-2.5 dark:border-zinc-700 dark:bg-zinc-950/40"
                        >
                          <div className="flex items-start gap-2">
                            {!row.id.startsWith("optimistic-") ? (
                              <Checkbox
                                checked={!!rowSelection[row.id]}
                                onCheckedChange={(c) => toggleRow(row.id, c === true)}
                                aria-label={`Select ${row.description?.trim() || "expense"}`}
                                className="mt-0.5"
                              />
                            ) : (
                              <span className="inline-block w-4 shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="min-w-0 flex-1 truncate text-sm font-medium">
                                  {row.description?.trim() || "—"}
                                </p>
                                <p className="shrink-0 text-sm font-semibold tabular-nums">
                                  {formatMoney(row.amount, currency)}
                                </p>
                              </div>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {format(new Date(row.date), "MMM d, yyyy")} · {cfg.icon}{" "}
                                {cfg.label}
                              </p>
                              <div className="mt-2 flex items-center justify-between gap-2">
                                {isSavingsTransfer(row) ? (
                                  <Badge
                                    variant="outline"
                                    className="border-emerald-500/45 text-emerald-700 dark:border-emerald-500/50 dark:text-emerald-300"
                                  >
                                    Savings
                                  </Badge>
                                ) : (
                                  <span />
                                )}
                                <div className="flex justify-end gap-1">
                                  {row.id.startsWith("optimistic-") ? (
                                    <span className="text-xs text-muted-foreground">Saving…</span>
                                  ) : isRecurringRowId(row.id) ? (
                                    <ExpensePaidCell row={row} />
                                  ) : (
                                    <>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-8"
                                        onClick={() => setEditRow(row)}
                                      >
                                        <Pencil className="size-4" />
                                        Edit
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 text-destructive"
                                        onClick={() => setDeleteRow(row)}
                                      >
                                        <Trash2 className="size-4" />
                                        Delete
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            ) : null}
            {slice.map((row) => {
              const cfg = CATEGORY_CONFIG[row.category];
              return (
                <li
                  key={row.id}
                  className="rounded-lg border border-border bg-muted/20 p-3 dark:border-zinc-800 dark:bg-zinc-900/50"
                >
                  <div className="flex items-start gap-3">
                    {!row.id.startsWith("optimistic-") ? (
                      <Checkbox
                        checked={!!rowSelection[row.id]}
                        onCheckedChange={(c) => toggleRow(row.id, c === true)}
                        aria-label={`Select ${row.description?.trim() || "expense"}`}
                        className="mt-0.5"
                      />
                    ) : (
                      <span className="inline-block w-4 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 truncate font-medium text-foreground">
                          {row.description?.trim() || "—"}
                        </p>
                        <p className="shrink-0 text-base font-semibold tabular-nums">
                          {formatMoney(row.amount, currency)}
                        </p>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {format(new Date(row.date), "MMM d, yyyy")}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <span aria-hidden>{cfg.icon}</span>
                          {cfg.label}
                        </span>
                        {isSavingsTransfer(row) ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/45 font-normal text-emerald-700 dark:border-emerald-500/50 dark:text-emerald-300"
                          >
                            Savings
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-border font-normal text-muted-foreground"
                          >
                            Variable
                          </Badge>
                        )}
                        <span className="text-muted-foreground">
                          {formatPercent(row.sharePercent, 1)} of income
                        </span>
                      </div>
                      <PayeeYesNo
                        value={row.payee}
                        trueLabel="Paid"
                        falseLabel="Unpaid"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-1 border-t border-border/60 pt-2 dark:border-zinc-800">
                    {row.id.startsWith("optimistic-") ? (
                      <span className="text-xs text-muted-foreground">Saving…</span>
                    ) : (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditRow(row);
                          }}
                        >
                          <Pencil className="size-4" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-destructive"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeleteRow(row);
                          }}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="rounded-lg border border-border bg-muted/30 p-3 md:hidden dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-xs font-medium text-muted-foreground">Page total</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatMoney(visibleSum, currency)}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({formatPercent(visibleShareOfIncome, 1)} of income)
              </span>
            </p>
          </div>

          <LedgerTableScroll className="hidden md:block">
            <table className="w-full min-w-4xl text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground dark:border-zinc-800">
                  <th className={cn("w-px pb-2 pr-2", ledgerColNowrap)}>
                    <Checkbox
                      checked={allPageSelected}
                      onCheckedChange={(c) => togglePageRows(c === true)}
                      aria-label="Select page"
                    />
                  </th>
                  <th className={cn("pb-2 pr-2", ledgerColNowrap)}>
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
                  <th className={cn("pb-2 pr-2", ledgerColNowrap)}>
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
                  <th className={cn("pb-2 pr-2", ledgerColNowrap)}>
                    <button
                      type="button"
                      title="Each row as a percent of monthly income"
                      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                      onClick={() => toggleSort("share")}
                    >
                      <span>% of income</span>
                      {sort.key === "share" ? (
                        sort.dir === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        )
                      ) : null}
                    </button>
                  </th>
                  <th className={cn("pb-2 pr-2", ledgerColPrimaryText)}>
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
                  <th className={cn("pb-2 pr-2", ledgerColNowrap)}>
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
                  <th className={cn("pb-2 pr-2", ledgerColNowrap)}>
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
                  <th className={cn("pb-2 pr-2", ledgerColNowrap)}>Recurring</th>
                  <th className="pb-2 pr-2">Paid</th>
                  <th className={cn("pb-2 pr-2", ledgerColNowrap)}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {showSavingsGroup ? (
                  <tr className="border-b border-emerald-500/30 bg-emerald-500/5 dark:border-emerald-500/35 dark:bg-emerald-500/10">
                    <td className="py-2 pr-2">
                      <Checkbox
                        checked={
                          allSavingsSelected ? true : someSavingsSelected ? "indeterminate" : false
                        }
                        onCheckedChange={(c) => toggleSavingsGroup(c === true)}
                        aria-label="Select all savings transfers"
                      />
                    </td>
                    <td className={cn("py-2 pr-2", ledgerColNowrap)}>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-muted-foreground"
                        onClick={() => setSavingsExpanded((v) => !v)}
                        aria-expanded={savingsExpanded}
                        aria-label={
                          savingsExpanded ? "Collapse savings transfers" : "Expand savings transfers"
                        }
                      >
                        <ChevronDown
                          className={cn(
                            "size-4 shrink-0 transition-transform",
                            !savingsExpanded && "-rotate-90",
                          )}
                          aria-hidden
                        />
                      </button>
                    </td>
                    <td className={cn("py-2 pr-2 font-semibold tabular-nums", ledgerColNowrap)}>
                      {formatMoney(savingsTotal, currency)}
                    </td>
                    <td className={cn("py-2 pr-2 text-muted-foreground", ledgerColNowrap)}>
                      {formatPercent(savingsShareOfIncome, 1)}
                    </td>
                    <td className={cn("py-2 pr-2", ledgerColPrimaryText)}>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 font-medium text-foreground"
                        onClick={() => setSavingsExpanded((v) => !v)}
                        aria-expanded={savingsExpanded}
                      >
                        <PiggyBank
                          className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                          aria-hidden
                        />
                        Savings transfers
                        <span className="text-xs font-normal text-muted-foreground">
                          ({savingsRows.length})
                        </span>
                      </button>
                    </td>
                    <td className={cn("py-2 pr-2 text-muted-foreground", ledgerColNowrap)}>—</td>
                    <td className={cn("py-2 pr-2", ledgerColNowrap)}>
                      <Badge
                        variant="outline"
                        className="border-emerald-500/45 text-emerald-700 dark:border-emerald-500/50 dark:text-emerald-300"
                      >
                        Savings
                      </Badge>
                    </td>
                    <td className={cn("py-2 pr-2", ledgerColNowrap)}>
                      <PiggyBank
                        className="size-4 text-emerald-600 dark:text-emerald-400"
                        aria-label="Savings group"
                      />
                    </td>
                    <td className={cn("py-2 pr-2", ledgerColNowrap)}>
                      <span
                        className={cn(
                          "inline-flex flex-col gap-0.5 tabular-nums",
                          savingsPaidCount > 0
                            ? "font-medium text-emerald-700 dark:text-emerald-300"
                            : "text-muted-foreground",
                        )}
                        title={`${savingsPaidCount} of ${savingsRows.length} marked paid`}
                      >
                        <span>
                          {savingsPaidCount}/{savingsRows.length}
                        </span>
                        <span className="text-[10px] font-normal leading-none text-muted-foreground">
                          paid
                        </span>
                      </span>
                    </td>
                    <td className="py-2 pr-2" />
                  </tr>
                ) : null}
                {showSavingsGroup && savingsExpanded
                  ? savingsRows.map((row) => {
                      const cfg = CATEGORY_CONFIG[row.category];
                      return (
                        <tr
                          key={row.id}
                          className={cn(
                            "border-b border-emerald-500/15 bg-emerald-500/[0.03] dark:border-emerald-500/20 dark:bg-emerald-500/[0.06]",
                            ledgerRowHover,
                          )}
                        >
                          <td className="py-2 pr-2 pl-4">
                            {row.id.startsWith("optimistic-") ? (
                              <span className="inline-block w-4" />
                            ) : (
                              <Checkbox
                                checked={!!rowSelection[row.id]}
                                onCheckedChange={(c) => toggleRow(row.id, c === true)}
                                aria-label={`Select ${row.description?.trim() || "saving"}`}
                              />
                            )}
                          </td>
                          <td
                            className={cn(
                              "py-2 pr-2 tabular-nums text-muted-foreground",
                              ledgerColNowrap,
                            )}
                          >
                            {format(new Date(row.date), "MMM d, yyyy")}
                          </td>
                          <td className={cn("py-2 pr-2 font-medium tabular-nums", ledgerColNowrap)}>
                            {formatMoney(row.amount, currency)}
                          </td>
                          <td className={cn("py-2 pr-2 text-muted-foreground", ledgerColNowrap)}>
                            {formatPercent(row.sharePercent, 1)}
                          </td>
                          <td
                            className={cn("py-2 pr-2", ledgerColPrimaryText)}
                            title={row.description?.trim() || undefined}
                          >
                            {row.description?.trim() ? (
                              row.description
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className={cn("relative z-10 py-2 pr-2", ledgerColNowrap)}>
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                              <span aria-hidden>{cfg.icon}</span>
                              <span className="text-muted-foreground">{cfg.label}</span>
                            </span>
                          </td>
                          <td className={cn("py-2 pr-2", ledgerColNowrap)}>
                            <Badge
                              variant="outline"
                              className="border-emerald-500/45 text-emerald-700 dark:border-emerald-500/50 dark:text-emerald-300"
                            >
                              Savings
                            </Badge>
                          </td>
                          <td className={cn("py-2 pr-2", ledgerColNowrap)}>
                            {row.isRecurring || row.recurrenceFrequency || isRecurringRowId(row.id) ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Repeat
                                  className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                                  aria-hidden
                                />
                                {formatRecurrenceFrequency(row.recurrenceFrequency)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className={cn("py-2 pr-2", ledgerColNowrap)}>
                            <ExpensePaidCell row={row} />
                          </td>
                          <td className={cn("py-2 pr-2", ledgerColNowrap)}>
                            {row.id.startsWith("optimistic-") ? (
                              <span className="text-xs text-muted-foreground">Saving…</span>
                            ) : isRecurringRowId(row.id) ? (
                              <span className="text-xs text-muted-foreground">Template</span>
                            ) : (
                              <div className="flex flex-nowrap gap-1">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 shrink-0"
                                  aria-label="Edit saving"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditRow(row);
                                  }}
                                >
                                  <Pencil className="size-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 shrink-0 text-destructive"
                                  aria-label="Delete saving"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setDeleteRow(row);
                                  }}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  : null}
                {showFixedGroup ? (
                  <tr className="border-b border-primary/25 bg-primary/5 dark:border-primary/30 dark:bg-primary/10">
                    <td className="py-2 pr-2">
                      <Checkbox
                        checked={
                          allFixedSelected ? true : someFixedSelected ? "indeterminate" : false
                        }
                        onCheckedChange={(c) => toggleFixedGroup(c === true)}
                        aria-label="Select all fixed expenses"
                      />
                    </td>
                    <td className={cn("py-2 pr-2", ledgerColNowrap)}>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-muted-foreground"
                        onClick={() => setFixedExpanded((v) => !v)}
                        aria-expanded={fixedExpanded}
                        aria-label={fixedExpanded ? "Collapse fixed expenses" : "Expand fixed expenses"}
                      >
                        <ChevronDown
                          className={cn(
                            "size-4 shrink-0 transition-transform",
                            !fixedExpanded && "-rotate-90",
                          )}
                          aria-hidden
                        />
                      </button>
                    </td>
                    <td className={cn("py-2 pr-2 font-semibold tabular-nums", ledgerColNowrap)}>
                      {formatMoney(fixedTotal, currency)}
                    </td>
                    <td className={cn("py-2 pr-2 text-muted-foreground", ledgerColNowrap)}>
                      {formatPercent(fixedShareOfIncome, 1)}
                    </td>
                    <td className={cn("py-2 pr-2", ledgerColPrimaryText)}>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 font-medium text-foreground"
                        onClick={() => setFixedExpanded((v) => !v)}
                        aria-expanded={fixedExpanded}
                      >
                        Fixed expenses
                        <span className="text-xs font-normal text-muted-foreground">
                          ({fixedRows.length})
                        </span>
                      </button>
                    </td>
                    <td className={cn("py-2 pr-2 text-muted-foreground", ledgerColNowrap)}>—</td>
                    <td className={cn("py-2 pr-2", ledgerColNowrap)}>
                      <Badge
                        variant="outline"
                        className="border-primary/45 text-primary dark:border-primary/50"
                      >
                        Fixed
                      </Badge>
                    </td>
                    <td className={cn("py-2 pr-2", ledgerColNowrap)}>
                      <Repeat className="size-4 text-primary" aria-label="Recurring group" />
                    </td>
                    <td className={cn("py-2 pr-2", ledgerColNowrap)}>
                      <span
                        className={cn(
                          "inline-flex flex-col gap-0.5 tabular-nums",
                          fixedPaidCount > 0
                            ? "font-medium text-emerald-700 dark:text-emerald-300"
                            : "text-muted-foreground",
                        )}
                        title={`${fixedPaidCount} of ${fixedRows.length} marked paid`}
                      >
                        <span>
                          {fixedPaidCount}/{fixedRows.length}
                        </span>
                        <span className="text-[10px] font-normal leading-none text-muted-foreground">
                          paid
                        </span>
                      </span>
                    </td>
                    <td className="py-2 pr-2" />
                  </tr>
                ) : null}
                {showFixedGroup && fixedExpanded
                  ? fixedRows.map((row) => {
                      const cfg = CATEGORY_CONFIG[row.category];
                      return (
                        <tr
                          key={row.id}
                          className={cn(
                            "border-b border-border/60 bg-muted/20 dark:border-zinc-800/60 dark:bg-zinc-900/40",
                            ledgerRowHover,
                          )}
                        >
                          <td className="py-2 pr-2 pl-4">
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
                          <td
                            className={cn(
                              "py-2 pr-2 tabular-nums text-muted-foreground",
                              ledgerColNowrap,
                            )}
                          >
                            {format(new Date(row.date), "MMM d, yyyy")}
                          </td>
                          <td className={cn("py-2 pr-2 font-medium tabular-nums", ledgerColNowrap)}>
                            {formatMoney(row.amount, currency)}
                          </td>
                          <td className={cn("py-2 pr-2 text-muted-foreground", ledgerColNowrap)}>
                            {formatPercent(row.sharePercent, 1)}
                          </td>
                          <td
                            className={cn("py-2 pr-2", ledgerColPrimaryText)}
                            title={row.description?.trim() || undefined}
                          >
                            {row.description?.trim() ? (
                              row.description
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className={cn("relative z-10 py-2 pr-2", ledgerColNowrap)}>
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                              <span aria-hidden>{cfg.icon}</span>
                              <span className="text-muted-foreground">{cfg.label}</span>
                            </span>
                          </td>
                          <td className={cn("py-2 pr-2", ledgerColNowrap)}>
                            {isSavingsTransfer(row) ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-500/45 text-emerald-700 dark:border-emerald-500/50 dark:text-emerald-300"
                              >
                                Savings
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-primary/45 text-primary dark:border-primary/50"
                              >
                                Fixed
                              </Badge>
                            )}
                          </td>
                          <td className={cn("py-2 pr-2", ledgerColNowrap)}>
                            {row.isRecurring || row.recurrenceFrequency ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Repeat
                                  className={cn(
                                    "size-3.5 shrink-0",
                                    isSavingsTransfer(row)
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-primary",
                                  )}
                                  aria-hidden
                                />
                                {formatRecurrenceFrequency(row.recurrenceFrequency)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className={cn("py-2 pr-2", ledgerColNowrap)}>
                            <ExpensePaidCell row={row} />
                          </td>
                          <td className={cn("py-2 pr-2", ledgerColNowrap)}>
                            {row.id.startsWith("optimistic-") ? (
                              <span className="text-xs text-muted-foreground">Saving…</span>
                            ) : isRecurringRowId(row.id) ? (
                              <span className="text-xs text-muted-foreground">Template</span>
                            ) : (
                              <div className="flex flex-nowrap gap-1">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 shrink-0"
                                  aria-label="Edit expense"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditRow(row);
                                  }}
                                >
                                  <Pencil className="size-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 shrink-0 text-destructive"
                                  aria-label="Delete expense"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setDeleteRow(row);
                                  }}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  : null}
                {slice.map((row) => {
                  const cfg = CATEGORY_CONFIG[row.category];
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-b border-border/60 last:border-0 dark:border-zinc-800/60",
                        ledgerRowHover,
                      )}
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
                      <td className={cn("py-2 pr-2 tabular-nums text-muted-foreground", ledgerColNowrap)}>
                        {format(new Date(row.date), "MMM d, yyyy")}
                      </td>
                      <td className={cn("py-2 pr-2 font-medium tabular-nums", ledgerColNowrap)}>
                        {formatMoney(row.amount, currency)}
                      </td>
                      <td className={cn("py-2 pr-2 text-muted-foreground", ledgerColNowrap)}>
                        {formatPercent(row.sharePercent, 1)}
                      </td>
                      <td
                        className={cn("py-2 pr-2", ledgerColPrimaryText)}
                        title={row.description?.trim() || undefined}
                      >
                        {row.description?.trim() ? (
                          row.description
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className={cn("relative z-10 py-2 pr-2", ledgerColNowrap)}>
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <span aria-hidden>{cfg.icon}</span>
                          <span className="text-muted-foreground">{cfg.label}</span>
                        </span>
                      </td>
                      <td className={cn("py-2 pr-2", ledgerColNowrap)}>
                        {isSavingsTransfer(row) ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/45 text-emerald-700 dark:border-emerald-500/50 dark:text-emerald-300"
                          >
                            Savings
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-border text-muted-foreground dark:border-zinc-600"
                          >
                            Variable
                          </Badge>
                        )}
                      </td>
                      <td className={cn("py-2 pr-2", ledgerColNowrap)}>
                        <span className="text-muted-foreground">—</span>
                      </td>
                      <td className={cn("py-2 pr-2", ledgerColNowrap)}>
                        <ExpensePaidCell row={row} />
                      </td>
                      <td className={cn("py-2 pr-2", ledgerColNowrap)}>
                        {row.id.startsWith("optimistic-") ? (
                          <span className="text-xs text-muted-foreground">Saving…</span>
                        ) : (
                          <div className="flex flex-nowrap gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 shrink-0"
                              aria-label="Edit expense"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditRow(row);
                              }}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 shrink-0 text-destructive"
                              aria-label="Delete expense"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDeleteRow(row);
                              }}
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
                  <td className="pt-3 pr-2">Total</td>
                  <td className="pt-3 pr-2 tabular-nums">{formatMoney(visibleSum, currency)}</td>
                  <td className="pt-3 pr-2 text-muted-foreground">
                    {formatPercent(visibleShareOfIncome, 1)} of income
                  </td>
                  <td className="pt-3 pr-2" colSpan={5} />
                </tr>
              </tfoot>
            </table>
          </LedgerTableScroll>
          {variableRows.length > 0 ? (
            <TablePagination
              page={paginationMeta.page}
              pageCount={paginationMeta.pageCount}
              pageSize={paginationMeta.pageSize}
              totalItems={paginationMeta.totalItems}
              rangeStart={paginationMeta.rangeStart}
              rangeEnd={paginationMeta.rangeEnd}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          ) : null}
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
      payee: row.payee,
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
      payee: row.payee,
      note: row.note ?? "",
    });
  }, [row, form]);

  function onSubmit(values: ExpenseEditFormValues) {
    startTransition(async () => {
      const res = await editExpense({
        ...values,
        currency,
        payee: values.payee,
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
        <Controller
          control={form.control}
          name="payee"
          render={({ field }) => (
            <PayeeSwitchField
              id="edit-expense-payee"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
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
