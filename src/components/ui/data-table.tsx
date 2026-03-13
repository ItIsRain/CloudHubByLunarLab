"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
  type Table as TanStackTable,
} from "@tanstack/react-table";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

// ─── Types ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface DataTableProps<TData> {
  /** Column definitions for the table */
  columns: ColumnDef<TData, any>[];
  /** Table data */
  data: TData[];
  /** Show loading skeleton */
  isLoading?: boolean;
  /** Number of skeleton rows to show */
  skeletonRows?: number;
  /** Enable global text search */
  searchable?: boolean;
  /** Placeholder for search input */
  searchPlaceholder?: string;
  /** Enable row selection with checkboxes */
  selectable?: boolean;
  /** Callback when row selection changes */
  onSelectionChange?: (selectedRows: TData[]) => void;
  /** Custom empty state message */
  emptyTitle?: string;
  /** Custom empty state description */
  emptyDescription?: string;
  /** Custom empty state icon */
  emptyIcon?: React.ReactNode;
  /** Default page size */
  defaultPageSize?: number;
  /** Show page size selector */
  showPageSizeSelector?: boolean;
  /** Additional toolbar content (rendered between search and table) */
  toolbar?: React.ReactNode;
  /** Wrap the table in a Card */
  cardWrapper?: boolean;
  /** Custom class for the outer container */
  className?: string;
}

// ─── Skeleton Row ────────────────────────────────────────────────

function SkeletonRow({ columns }: { columns: number }) {
  return (
    <tr className="border-b last:border-b-0">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <div className="shimmer rounded-lg h-5 w-full" />
        </td>
      ))}
    </tr>
  );
}

// ─── Pagination Controls ─────────────────────────────────────────

function PaginationControls<TData>({
  table,
  showPageSizeSelector,
}: {
  table: TanStackTable<TData>;
  showPageSizeSelector: boolean;
}) {
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();
  const totalRows = table.getFilteredRowModel().rows.length;
  const pageSize = table.getState().pagination.pageSize;
  const startRow = pageIndex * pageSize + 1;
  const endRow = Math.min((pageIndex + 1) * pageSize, totalRows);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border">
      <div className="flex items-center gap-4">
        <p className="text-sm text-muted-foreground">
          {totalRows > 0
            ? `Showing ${startRow}-${endRow} of ${totalRows}`
            : "No results"}
        </p>
        {showPageSizeSelector && (
          <select
            value={pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="h-8 rounded-lg border border-input bg-background px-2 py-1 text-xs ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
          title="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pageCount > 0 && (
          <span className="px-3 text-sm font-medium">
            {pageIndex + 1} / {pageCount}
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => table.setPageIndex(pageCount - 1)}
          disabled={!table.getCanNextPage()}
          title="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Sort Icon ───────────────────────────────────────────────────

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc") return <ArrowUp className="ml-1 h-3.5 w-3.5" />;
  if (direction === "desc") return <ArrowDown className="ml-1 h-3.5 w-3.5" />;
  return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-50" />;
}

// ─── DataTable Component ─────────────────────────────────────────

export function DataTable<TData>({
  columns,
  data,
  isLoading = false,
  skeletonRows = 5,
  searchable = true,
  searchPlaceholder = "Search...",
  selectable = false,
  onSelectionChange,
  emptyTitle = "No results found",
  emptyDescription = "Try adjusting your search or filters.",
  emptyIcon,
  defaultPageSize = 10,
  showPageSizeSelector = true,
  toolbar,
  cardWrapper = true,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // Build column defs with optional selection column
  const allColumns = React.useMemo(() => {
    if (!selectable) return columns;

    const selectColumn: ColumnDef<TData, unknown> = {
      id: "select",
      header: ({ table: tbl }) => (
        <input
          type="checkbox"
          checked={tbl.getIsAllPageRowsSelected()}
          onChange={tbl.getToggleAllPageRowsSelectedHandler()}
          className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableGlobalFilter: false,
      size: 40,
    };

    return [selectColumn, ...columns];
  }, [columns, selectable]);

  const table = useReactTable({
    data,
    columns: allColumns,
    state: {
      sorting,
      globalFilter,
      columnFilters,
      rowSelection,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: selectable,
    initialState: {
      pagination: { pageSize: defaultPageSize },
    },
  });

  // Notify parent about selection changes
  React.useEffect(() => {
    if (selectable && onSelectionChange) {
      const selectedRows = table
        .getFilteredSelectedRowModel()
        .rows.map((r) => r.original);
      onSelectionChange(selectedRows);
    }
  }, [rowSelection, selectable, onSelectionChange, table]);

  const tableContent = (
    <>
      {isLoading ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                {allColumns.map((col, i) => (
                  <th
                    key={i}
                    className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4"
                  >
                    <div className="shimmer rounded h-4 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: skeletonRows }).map((_, i) => (
                <SkeletonRow key={i} columns={allColumns.length} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b bg-muted/50">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className={cn(
                          "text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4",
                          header.column.getCanSort() && "cursor-pointer select-none hover:text-foreground transition-colors"
                        )}
                        style={{
                          width: header.getSize() !== 150 ? header.getSize() : undefined,
                        }}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {header.isPlaceholder ? null : (
                          <div className="flex items-center">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {header.column.getCanSort() && (
                              <SortIcon
                                direction={header.column.getIsSorted()}
                              />
                            )}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-border">
                <AnimatePresence mode="popLayout">
                  {table.getRowModel().rows.map((row, i) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.2 }}
                      className={cn(
                        "hover:bg-muted/30 transition-colors",
                        row.getIsSelected() && "bg-primary/5"
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="p-4">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {table.getRowModel().rows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
                {emptyIcon || (
                  <FileText className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <h3 className="font-display text-lg font-bold mb-1">
                {emptyTitle}
              </h3>
              <p className="text-sm text-muted-foreground">
                {emptyDescription}
              </p>
            </div>
          )}

          {table.getRowModel().rows.length > 0 && (
            <PaginationControls
              table={table}
              showPageSizeSelector={showPageSizeSelector}
            />
          )}
        </>
      )}
    </>
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search + Toolbar */}
      {(searchable || toolbar) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {searchable && (
            <div className="flex-1">
              <Input
                placeholder={searchPlaceholder}
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
            </div>
          )}
          {toolbar}
        </div>
      )}

      {/* Table */}
      {cardWrapper ? (
        <Card>
          <CardContent className="p-0">{tableContent}</CardContent>
        </Card>
      ) : (
        tableContent
      )}
    </div>
  );
}
