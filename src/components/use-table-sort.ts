"use client";

import * as React from "react";
import type { DataTableColumnType } from "./data-table/format";
import { firstSortOrder, nextSort, sortRows } from "./data-table/layout";
import type { TableSortOrder } from "./table";

/** A sorted column and its order, or `null` for the rows as given. */
export type TableSortState = { key: string; order: TableSortOrder } | null;

/**
 * How to sort one column: its value, or the value with a `type` (numbers,
 * money, percentages and dates sort high to low first, text A to Z) or an
 * explicit `first` direction. A bare function sorts high to low first when
 * its values are numbers or `Date`s; give ISO date strings `type: "date"`.
 */
export type TableSortColumn<Row> =
  | ((row: Row) => unknown)
  | { value: (row: Row) => unknown; type?: DataTableColumnType; first?: TableSortOrder };

export interface UseTableSortOptions<Row> {
  /** The sortable columns by key. Pass a stable object (module scope or `useMemo`) for long lists. */
  columns: Readonly<Record<string, TableSortColumn<Row>>>;
  /** The sort on first render (uncontrolled). */
  initialSort?: TableSortState;
  /** Controlled sort: pass it with `onSortChange` to keep it in the URL or a saved view. */
  sort?: TableSortState;
  onSortChange?: (sort: TableSortState) => void;
}

/** What `getHeadProps` gives a `TableHead`. */
export interface TableSortHeadProps {
  sort: TableSortOrder | null;
  onSort: () => void;
  sortFirst: TableSortOrder;
}

export interface UseTableSortResult<Row> {
  /** The rows in sort order (a new array; the input is never mutated). Empty values sort last both ways. */
  rows: Row[];
  sort: TableSortState;
  setSort: (sort: TableSortState) => void;
  /** First click sorts the column's first direction, the second flips it, the third clears. */
  toggleSort: (key: string) => void;
  /** Spread onto the column's `TableHead`: `<TableHead {...getHeadProps("value")} numeric>Value</TableHead>`. */
  getHeadProps: (key: string) => TableSortHeadProps;
}

function accessorOf<Row>(col: TableSortColumn<Row>): (row: Row) => unknown {
  return typeof col === "function" ? col : col.value;
}

function firstOf<Row>(col: TableSortColumn<Row>, rows: readonly Row[]): TableSortOrder {
  if (typeof col !== "function") {
    if (col.first) return col.first;
    if (col.type) return firstSortOrder(col.type);
  }
  const value = accessorOf(col);
  for (const row of rows) {
    const v = value(row);
    if (v == null || v === "") continue;
    return typeof v === "number" || v instanceof Date ? "desc" : "asc";
  }
  return "asc";
}

/**
 * Client-side sort for a hand-built table on the `Table` parts, with the
 * standard's order: numbers and dates high to low first, text A to Z, the
 * third click clears. DataTable sorts on its own; this is for the rest.
 */
export function useTableSort<Row>(rows: readonly Row[], options: UseTableSortOptions<Row>): UseTableSortResult<Row> {
  const { columns, initialSort = null, sort: sortProp, onSortChange } = options;
  const [ownSort, setOwnSort] = React.useState<TableSortState>(initialSort);
  const sort = sortProp !== undefined ? sortProp : ownSort;

  const setSort = React.useCallback(
    (next: TableSortState) => {
      if (sortProp === undefined) setOwnSort(next);
      onSortChange?.(next);
    },
    [sortProp, onSortChange],
  );

  const first = React.useCallback((key: string): TableSortOrder => {
    const col = columns[key];
    return col ? firstOf(col, rows) : "asc";
  }, [columns, rows]);

  const toggleSort = React.useCallback((key: string) => setSort(nextSort(sort, key, first(key))), [setSort, sort, first]);

  const sorted = React.useMemo(() => {
    const col = sort ? columns[sort.key] : undefined;
    if (!sort || !col) return rows.slice();
    return sortRows(rows, accessorOf(col), sort.order);
  }, [rows, sort, columns]);

  const getHeadProps = (key: string): TableSortHeadProps => ({
    sort: sort?.key === key ? sort.order : null,
    onSort: () => toggleSort(key),
    sortFirst: first(key),
  });

  return { rows: sorted, sort, setSort, toggleSort, getHeadProps };
}
