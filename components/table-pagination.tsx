"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildPageList,
  TABLE_PAGE_SIZE_OPTIONS,
  type TablePageSize,
} from "@/lib/table-pagination";
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
  const pageSizeLabelId = useId();
  const pageItems = buildPageList(page, pageCount);
  const atFirst = page <= 0;
  const atLast = page >= pageCount - 1;

  return (
    <div
      className={cn(
        "grid gap-4 border-t border-border pt-4 text-sm text-muted-foreground lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <p className="font-medium tabular-nums text-foreground">
          {totalItems === 0 ?
            "No rows"
          : <>
              Showing <span className="font-medium text-foreground">{rangeStart}</span>–
              <span className="font-medium text-foreground">{rangeEnd}</span> of{" "}
              <span className="font-medium text-foreground">{totalItems}</span>
            </>
          }
        </p>
        <p className="text-xs">
          {totalItems === 0 ?
            "No pages to browse"
          : <>
              Page <span className="tabular-nums text-foreground">{page + 1}</span> of{" "}
              <span className="tabular-nums text-foreground">{pageCount}</span>
            </>
          }
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 sm:justify-start dark:bg-zinc-950/40">
          <span
            id={pageSizeLabelId}
            className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            Rows
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v) as TablePageSize)}
          >
            <SelectTrigger
              className="h-8 w-20 bg-background"
              aria-labelledby={pageSizeLabelId}
            >
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
        </div>

        <nav
          className="flex w-full items-center justify-between gap-1 rounded-lg border border-border bg-background p-1 shadow-sm sm:w-auto sm:justify-end dark:bg-zinc-950/60"
          aria-label="Table pagination"
        >
          <Button
            type="button"
            size="icon"
            variant="ghost"
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
            variant="ghost"
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
                <li
                  key={`ellipsis-${i}`}
                  className="px-1 text-muted-foreground"
                  aria-hidden
                >
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
            variant="ghost"
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
            variant="ghost"
            className="hidden size-8 sm:inline-flex"
            disabled={atLast}
            onClick={() => onPageChange(pageCount - 1)}
            aria-label="Last page"
          >
            <ChevronsRight className="size-4" />
          </Button>
        </nav>
      </div>
    </div>
  );
}
