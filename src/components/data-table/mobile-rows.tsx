"use client";
import * as React from "react";
import type { DataTableColumn, DataTableProps } from "./data-table";

export type MobilePriority = "primary" | "secondary" | "hidden";
/** Same priority vocabulary as the table-customization branch; no separate data owner. */
export function MobileRows<Row>({ columns, rows, getRowId, getRowHref, getRowLabel, onRowClick, loading, emptyLabel, sort, onSort }: Pick<DataTableProps<Row>, "columns" | "rows" | "getRowId" | "getRowHref" | "getRowLabel" | "onRowClick" | "loading" | "emptyLabel"> & { sort: { key: string; order: "asc" | "desc" } | null; onSort: (key: string) => void }) {
  const [page, setPage] = React.useState(0);
  const count = 25;
  const last = Math.max(0, Math.ceil(rows.length / count) - 1);
  const current = Math.min(page, last);
  React.useEffect(() => setPage(0), [rows]);
  const primary = columns.filter(c => c.mobilePriority === "primary");
  if (!primary.length && columns[0]) primary.push(columns[0]);
  const secondary = columns.filter(c => !primary.includes(c) && c.mobilePriority !== "hidden").slice(0, 3);
  const detail = columns.filter(c => !primary.includes(c) && !secondary.includes(c));
  const cell = (c: DataTableColumn<Row>, row: Row) => c.render ? c.render(row) : c.value ? c.value(row) : (row as Record<string, React.ReactNode>)[c.key];
  const value = (c: DataTableColumn<Row>, row: Row) => c.value ? c.value(row) : (row as Record<string, unknown>)[c.key];
  return <div className="md:hidden" aria-busy={loading}>
    <div className="flex items-center gap-2 border-b border-border px-3 py-2">
      <label className="flex min-w-0 flex-1 items-center gap-2 text-[13px]">Sort
        <select aria-label="Sort records" value={sort?.key ?? ""} onChange={e => onSort(e.target.value)} className="h-11 min-w-0 flex-1 rounded-md border border-border bg-card px-2 text-base">
          <option value="" disabled>Choose column</option>
          {columns.filter(c => c.sortable !== false).map(c => <option key={c.key} value={c.key}>{c.header}</option>)}
        </select>
      </label>
      {sort && <button type="button" onClick={() => onSort(sort.key)} className="min-h-11 rounded-md px-2 text-[13px]" aria-label={`Sort ${sort.order === "asc" ? "descending" : "ascending"}`}>{sort.order === "asc" ? "Ascending ↑" : "Descending ↓"}</button>}
    </div>
    {loading ? <div role="status" className="p-4 text-[13px] text-muted-foreground">Loading…</div> : !rows.length ? <div className="p-4 text-[13px] text-muted-foreground">{emptyLabel}</div> : <ul className="m-0 list-none p-0">
      {rows.slice(current * count, (current + 1) * count).map((row, index) => {
        const href = getRowHref?.(row);
        const label = getRowLabel?.(row) ?? String(columns[0] ? value(columns[0], row) ?? "record" : "record");
        return <li key={getRowId?.(row, current * count + index) ?? current * count + index} className="space-y-2 border-b border-border p-3 text-[13px]">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-1 break-words font-medium">{primary.map(c => <div key={c.key}>{cell(c, row)}</div>)}</div>
            {href ? <a href={href} aria-label={`Open ${label}`} className="flex min-h-11 shrink-0 items-center gap-1 rounded-md px-2 font-medium text-foreground">Open <span aria-hidden>›</span></a> : onRowClick ? <button type="button" onClick={() => onRowClick(row)} aria-label={`Open ${label}`} className="min-h-11 shrink-0 rounded-md px-2 font-medium">Open <span aria-hidden>›</span></button> : null}
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2">{secondary.map(c => <div key={c.key} className="min-w-0"><dt className="text-[12px] text-muted-foreground">{c.header}</dt><dd className="m-0 break-words tabular-nums">{cell(c, row)}</dd></div>)}</dl>
          {detail.length > 0 && <details><summary className="min-h-11 cursor-pointer py-3 text-muted-foreground">More details</summary><dl className="space-y-2">{detail.map(c => <div key={c.key} className="grid grid-cols-2 gap-3"><dt className="text-muted-foreground">{c.header}</dt><dd className="m-0 min-w-0 break-words">{cell(c, row)}</dd></div>)}</dl></details>}
        </li>;
      })}
    </ul>}
    {!loading && last > 0 && <div className="flex items-center justify-between gap-2 p-3 text-[13px]"><button type="button" disabled={!current} onClick={() => setPage(current - 1)} className="min-h-11 px-2 disabled:opacity-50">Previous</button><span aria-live="polite">{current + 1} / {last + 1}</span><button type="button" disabled={current >= last} onClick={() => setPage(current + 1)} className="min-h-11 px-2 disabled:opacity-50">Next</button></div>}
  </div>;
}
