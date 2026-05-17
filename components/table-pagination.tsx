"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildPageList, TABLE_PAGE_SIZE_OPTIONS, type TablePageSize } from "@/lib/table-pagination";
import { cn } from "@/lib/utils";

type TablePaginationProps = {
  page: number;
  pageCount: number;
  pageSize: TablePageSize;
  totalItems: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: TablePageSize) => void;
  className?: string;
};

export function TablePagination({
  page,
  pageCount,
  pageSize,
  totalItems,
  rangeStart,
  rangeEnd,
  onPageChange,
  onPageSizeChange,
  className,
}: TablePaginationProps) {
  const pageItems = buildPageList(page, pageCount);
  const atFirst = page <= 0;
  const atLast = page >= pageCount - 1;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-border pt-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="tabular-nums">
          {totalItems === 0 ?
            "No rows"
          : <>
              Showing <span className="font-medium text-foreground">{rangeStart}</span>–
              <span className="font-medium text-foreground">{rangeEnd}</span> of{" "}
              <span className="font-medium text-foreground">{totalItems}</span>
            </>
          }
        </span>
        <span className="hidden text-border sm:inline" aria-hidden>
          |
        </span>
        <label className="flex items-center gap-2">
          <span className="sr-only">Rows per page</span>
          <span className="text-xs sm:not-sr-only sm:text-sm">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v) as TablePageSize)}
          >
            <SelectTrigger className="h-8 w-18" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TABLE_PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      <nav
        className="flex w-full flex-wrap items-center justify-center gap-1 sm:justify-end"
        aria-label="Table pagination"
      >
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="hidden size-8 sm:inline-flex"
          disabled={atFirst}
          onClick={() => onPageChange(0)}
          aria-label="First page"
        >
          <ChevronsLeft className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-8"
          disabled={atFirst}
          onClick={() => onPageChange(Math.max(0, page - 1))}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <ol className="mx-1 hidden items-center gap-1 sm:flex">
          {pageItems.map((item, i) =>
            item === "ellipsis" ?
              <li key={`ellipsis-${i}`} className="px-1 text-muted-foreground" aria-hidden>
                …
              </li>
            : <li key={item}>
                <Button
                  type="button"
                  size="sm"
                  variant={item === page ? "secondary" : "ghost"}
                  className="min-w-8 px-2 tabular-nums"
                  onClick={() => onPageChange(item)}
                  aria-label={`Page ${item + 1}`}
                  aria-current={item === page ? "page" : undefined}
                >
                  {item + 1}
                </Button>
              </li>,
          )}
        </ol>

        <span className="min-w-16 px-2 text-center text-xs tabular-nums sm:hidden">
          {page + 1} / {pageCount}
        </span>

        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-8"
          disabled={atLast}
          onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="hidden size-8 sm:inline-flex"
          disabled={atLast}
          onClick={() => onPageChange(pageCount - 1)}
          aria-label="Last page"
        >
          <ChevronsRight className="size-4" />
        </Button>
      </nav>
    </div>
  );
}
