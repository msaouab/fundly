export const TABLE_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export type TablePageSize = (typeof TABLE_PAGE_SIZE_OPTIONS)[number];

export const DEFAULT_TABLE_PAGE_SIZE: TablePageSize = 10;

export function readStoredPageSize(
  storageKey: string | undefined,
  fallback: TablePageSize = DEFAULT_TABLE_PAGE_SIZE,
): TablePageSize {
  if (!storageKey || typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(storageKey);
    const n = raw ? Number(raw) : NaN;
    if (TABLE_PAGE_SIZE_OPTIONS.includes(n as TablePageSize)) {
      return n as TablePageSize;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

/** Build page indices with ellipsis markers for large page counts. */
export function buildPageList(
  currentPage: number,
  pageCount: number,
): Array<number | "ellipsis"> {
  if (pageCount <= 0) return [];
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i);
  }

  const candidates = new Set<number>([
    0,
    pageCount - 1,
    currentPage,
    currentPage - 1,
    currentPage + 1,
  ]);

  const sorted = [...candidates].filter((n) => n >= 0 && n < pageCount).sort((a, b) => a - b);
  const result: Array<number | "ellipsis"> = [];

  for (let i = 0; i < sorted.length; i++) {
    const page = sorted[i]!;
    if (i > 0 && page - sorted[i - 1]! > 1) {
      result.push("ellipsis");
    }
    result.push(page);
  }

  return result;
}
