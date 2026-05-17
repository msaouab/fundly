"use client";

import { useCallback, useState } from "react";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  readStoredPageSize,
  type TablePageSize,
} from "@/lib/table-pagination";

type UseTablePaginationOptions = {
  /** Persist page size in localStorage under this key. */
  storageKey?: string;
  defaultPageSize?: TablePageSize;
};

export function useTablePagination(
  itemCount: number,
  options?: UseTablePaginationOptions,
) {
  const defaultPageSize = options?.defaultPageSize ?? DEFAULT_TABLE_PAGE_SIZE;
  const storageKey = options?.storageKey;
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSizeState] = useState<TablePageSize>(() =>
    readStoredPageSize(storageKey, defaultPageSize),
  );

  const pageCount = Math.max(1, Math.ceil(itemCount / pageSize));
  const page = Math.min(pageIndex, pageCount - 1);

  const setPage = useCallback(
    (next: number) => {
      setPageIndex(Math.max(0, next));
    },
    [],
  );

  const resetPage = useCallback(() => {
    setPageIndex(0);
  }, []);

  const setPageSize = useCallback(
    (size: TablePageSize) => {
      setPageSizeState(size);
      setPageIndex(0);
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, String(size));
        } catch {
          /* ignore */
        }
      }
    },
    [storageKey],
  );

  const startIndex = itemCount === 0 ? 0 : page * pageSize;
  const endIndex = Math.min(itemCount, startIndex + pageSize);

  const sliceItems = useCallback(
    <T,>(items: readonly T[]): T[] => items.slice(startIndex, endIndex) as T[],
    [startIndex, endIndex],
  );

  return {
    page,
    pageCount,
    pageSize,
    setPage,
    setPageSize,
    resetPage,
    startIndex,
    endIndex,
    rangeStart: itemCount === 0 ? 0 : startIndex + 1,
    rangeEnd: endIndex,
    totalItems: itemCount,
    sliceItems,
  };
}
