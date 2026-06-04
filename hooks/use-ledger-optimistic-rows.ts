"use client";

import { useCallback, useMemo, useState } from "react";

/** Minimal fields required to merge optimistic ledger rows. */
export type LedgerOptimisticRow = {
  id: string;
  amount: number;
  date: string;
};

export function useLedgerOptimisticRows<T extends LedgerOptimisticRow>(serverRows: T[]) {
  const [pendingRows, setPendingRows] = useState<T[]>([]);

  const mergedRows = useMemo(() => {
    const byId = new Map(serverRows.map((row) => [row.id, row]));
    for (const pending of pendingRows) {
      if (!byId.has(pending.id)) {
        byId.set(pending.id, pending);
      }
    }
    return [...byId.values()].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [serverRows, pendingRows]);

  const pendingAmountTotal = useMemo(
    () => pendingRows.reduce((sum, row) => sum + row.amount, 0),
    [pendingRows],
  );

  const onOptimisticAdd = useCallback((row: T) => {
    setPendingRows((prev) => [row, ...prev]);
  }, []);

  const onOptimisticEnd = useCallback((tempId: string) => {
    setPendingRows((prev) => prev.filter((row) => row.id !== tempId));
  }, []);

  return {
    pendingRows,
    mergedRows,
    pendingAmountTotal,
    onOptimisticAdd,
    onOptimisticEnd,
  };
}
