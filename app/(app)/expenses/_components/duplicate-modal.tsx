"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { duplicateExpenses } from "../actions";
import type { ExpenseWithMeta } from "../types";
import { CATEGORY_CONFIG } from "@/lib/expense-categories";
import { addMonths, formatMonthKey } from "@/lib/month";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type DuplicateExpenseBannerProps = {
  expenses: ExpenseWithMeta[];
  currency: string;
  monthKey: string;
};

export function DuplicateExpenseBanner({
  expenses,
  currency,
  monthKey,
}: DuplicateExpenseBannerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [targetKey, setTargetKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [pending, startTransition] = useTransition();

  const [vy, vm] = monthKey.split("-").map(Number);
  const targetOptions = useMemo(() => {
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

  const variableExpenses = useMemo(
    () =>
      expenses.filter(
        (r) =>
          !r.id.startsWith("optimistic-") &&
          !r.id.startsWith("recurring-") &&
          r.kind === "VARIABLE",
      ),
    [expenses],
  );

  function openDialog() {
    const defaultKey = targetOptions[0]?.key ?? null;
    setTargetKey(defaultKey);
    const init: Record<string, boolean> = {};
    for (const row of variableExpenses) {
      init[row.id] = false;
    }
    setSelected(init);
    setOpen(true);
  }

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
    [selected],
  );

  const selectedTotal = useMemo(() => {
    const set = new Set(selectedIds);
    return expenses.filter((r) => set.has(r.id)).reduce((s, r) => s + r.amount, 0);
  }, [expenses, selectedIds]);

  const targetLabel = useMemo(() => {
    const k = targetKey ?? targetOptions[0]?.key;
    if (!k) return "";
    const [y, m] = k.split("-").map(Number);
    return format(new Date(y, m - 1, 1), "MMMM yyyy");
  }, [targetKey, targetOptions]);

  function toggle(id: string, checked: boolean) {
    setSelected((s) => ({ ...s, [id]: checked }));
  }

  function selectAll() {
    const next: Record<string, boolean> = { ...selected };
    for (const row of variableExpenses) {
      next[row.id] = true;
    }
    setSelected(next);
  }

  function confirm() {
    const key = targetKey ?? targetOptions[0]?.key;
    if (!key || !selectedIds.length) return;
    const realIds = selectedIds.filter((id) => !id.startsWith("optimistic-") && !id.startsWith("recurring-"));
    if (!realIds.length) {
      toast.error("Nothing to duplicate yet.");
      return;
    }
    startTransition(async () => {
      const res = await duplicateExpenses(realIds, key);
      if (res.ok) {
        toast.success(
          `Duplicated ${res.data.count} expense${res.data.count === 1 ? "" : "s"}`,
        );
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  const listRows = variableExpenses;

  if (!listRows.length) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900/40">
        <p className="text-sm font-medium text-foreground">Duplicate expenses to →</p>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            name="duplicateExpenseTargetMonth"
            value={targetKey ?? targetOptions[0]?.key ?? ""}
            onValueChange={setTargetKey}
          >
            <SelectTrigger className="w-50 dark:border-zinc-700">
              <SelectValue placeholder="Target month" />
            </SelectTrigger>
            <SelectContent>
              {targetOptions.map((o) => (
                <SelectItem key={o.key} value={o.key}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="secondary" onClick={openDialog}>
            Duplicate
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Select expenses to duplicate</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={selectAll}>
              Select all
            </Button>
          </div>
          <ul className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
            {listRows.map((row) => {
              const cfg = CATEGORY_CONFIG[row.category];
              return (
                <li
                  key={row.id}
                  className="flex items-start gap-3 rounded-lg border border-border p-3 dark:border-zinc-800"
                >
                  <Checkbox
                    id={`dup-exp-${row.id}`}
                    checked={!!selected[row.id]}
                    onCheckedChange={(c) => toggle(row.id, c === true)}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor={`dup-exp-${row.id}`}
                    className="min-w-0 flex-1 cursor-pointer space-y-1"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base" aria-hidden>
                        {cfg.icon}
                      </span>
                      <p
                        className={cn(
                          "font-medium",
                          row.description?.trim() ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {row.description?.trim() || "Unnamed expense"}
                      </p>
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
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatMoney(row.amount, currency)}
                    </p>
                  </label>
                </li>
              );
            })}
          </ul>
          <DialogFooter className="flex-col gap-3 sm:flex-col">
            <p className="text-sm text-muted-foreground">
              {selectedIds.length} expense{selectedIds.length === 1 ? "" : "s"} selected →{" "}
              <span className="font-semibold text-foreground">
                {formatMoney(selectedTotal, currency)}
              </span>{" "}
              will be duplicated to <span className="font-medium text-foreground">{targetLabel}</span>
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={pending || !selectedIds.length || !(targetKey ?? targetOptions[0]?.key)}
                onClick={confirm}
              >
                {pending ? "Duplicating…" : "Confirm"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
