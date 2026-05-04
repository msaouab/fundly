"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { duplicateIncomes } from "../actions";
import type { IncomeWithMeta } from "../types";
import { addMonths, formatMonthKey } from "@/lib/month";
import { formatMoney } from "@/lib/money";
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

type DuplicateModalProps = {
  incomes: IncomeWithMeta[];
  currency: string;
  /** Viewed month (YYYY-MM). Target months are the next 3 after this. */
  monthKey: string;
};

export function DuplicateIncomeBanner({
  incomes,
  currency,
  monthKey,
}: DuplicateModalProps) {
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

  function openDialog() {
    const defaultKey = targetOptions[0]?.key ?? null;
    setTargetKey(defaultKey);
    const init: Record<string, boolean> = {};
    for (const row of incomes) {
      init[row.id] = row.isRecurring;
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
    return incomes.filter((r) => set.has(r.id)).reduce((s, r) => s + r.amount, 0);
  }, [incomes, selectedIds]);

  function toggle(id: string, checked: boolean) {
    setSelected((s) => ({ ...s, [id]: checked }));
  }

  function confirm() {
    if (!targetKey || !selectedIds.length) return;
    startTransition(async () => {
      const res = await duplicateIncomes(selectedIds, targetKey);
      if (res.ok) {
        toast.success(`Duplicated ${res.data.count} entr${res.data.count === 1 ? "y" : "ies"}`);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  if (!incomes.length) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900/40">
        <p className="text-sm text-muted-foreground">
          Copy this month&apos;s incomes into a future month for planning.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={targetKey ?? targetOptions[0]?.key ?? ""}
            onValueChange={setTargetKey}
          >
            <SelectTrigger className="w-[200px]">
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
            Duplicate income
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Select incomes to duplicate</DialogTitle>
          </DialogHeader>
          <ul className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
            {incomes.map((row) => (
              <li
                key={row.id}
                className="flex items-start gap-3 rounded-lg border border-border p-3 dark:border-zinc-800"
              >
                <Checkbox
                  id={`dup-${row.id}`}
                  checked={!!selected[row.id]}
                  onCheckedChange={(c) => toggle(row.id, c === true)}
                  className="mt-0.5"
                />
                <label htmlFor={`dup-${row.id}`} className="min-w-0 flex-1 cursor-pointer">
                  <p className="font-medium text-foreground">{row.source}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatMoney(row.amount, currency)} ·{" "}
                    {format(new Date(row.date), "MMM d")}
                    {row.isRecurring ? " · recurring" : ""}
                  </p>
                </label>
              </li>
            ))}
          </ul>
          <DialogFooter className="flex-col gap-3 sm:flex-col">
            <p className="text-sm text-muted-foreground">
              {selectedIds.length} entr{selectedIds.length === 1 ? "y" : "ies"} selected →{" "}
              <span className="font-semibold text-foreground">
                {formatMoney(selectedTotal, currency)}
              </span>
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={pending || !selectedIds.length || !targetKey}
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
