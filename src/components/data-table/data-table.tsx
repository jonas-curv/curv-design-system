"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "../../lib/cn";
import { EmptyState } from "../empty-state";
import { Skeleton } from "../skeleton";
import { Tooltip } from "../tooltip";
import { ActiveFilterBar } from "./filter-bar";
import { EMPTY, formatNumber, formatValue } from "./format";
import type { DataTableGroupItem } from "./grouping";
import { edgePadding } from "./layout";
import { MobileRows } from "./mobile-rows";
import {
  accessor,
  cellText,
  DataTableContext,
  useDataTableModel,
  useDataTableModelContext,
  type DataTableModel,
  type ResolvedColumn,
} from "./model";
import { tableHeaderRow } from "./tokens";
import { DataTableToolbar, IconChevronDown, SelectionCheckbox } from "./toolbar";
import type { DataTableProps } from "./types";

export type {
  DataTableBulkContext,
  DataTableColumn,
  DataTableColumnType,
  DataTableProps,
  DataTableTab,
} from "./types";
export type { MobilePriority } from "./mobile-rows";
export type { DataTableGroup } from "./grouping";

// One toolbar-button treatment for links and controls that sit beside a
// table's toolbar, at the canonical control height (h-9 / 36px).
export const dataTableToolbarButton =
  "inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-[13px] font-medium text-foreground transition-[transform,border-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-foreground/20 active:scale-[0.97]";

/** An empty cell's dash. */
const DASH = <span className="text-muted-foreground/60">{EMPTY}</span>;
const HEADER_HEIGHT = 36;
const TOTALS_HEIGHT = 44;

function IconArrow({ dir, className }: { dir: "asc" | "desc"; className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("shrink-0", className)} aria-hidden>
      <path d={dir === "asc" ? "M12 19V5M5 12l7-7 7 7" : "M12 5v14M19 12l-7 7-7-7"} />
    </svg>
  );
}

// Deterministic bar widths for the loading skeleton (no Math.random → stable
// across renders), varied so rows don't look like a printed grid.
const SKELETON_WIDTHS = ["62%", "45%", "70%", "38%", "55%", "48%"];

// Grouped mode. A header's React/virtual key starts with NUL, which no row id
// plausibly contains, so a header can never collide with a row.
const GROUP_KEY = "\u0000group:";
const UNGROUPED_KEY = "\u0000ungrouped";
// A click on these inside a header keeps its own behaviour and doesn't toggle
// the group (the data-row guard, plus controls a header might hold).
const GROUP_HEADER_SKIP =
  "a,button,input,select,textarea,label,summary,[role=button],[role=checkbox],[role=switch],[role=link]";
const ROW_CLICK_SKIP = "a,button,input,select,textarea,label,[role=button],[role=checkbox]";

// The header deepens once rows scroll under it.
const HEADER_SCROLLED = "0 2px 4px -2px rgb(0 0 0 / 0.08)";

function totalText<Row>(rc: ResolvedColumn<Row>, v: unknown): React.ReactNode {
  if (v == null || v === "") return DASH;
  if (typeof v === "number") {
    if (rc.col.format) return rc.col.format(v);
    return rc.type ? formatValue(rc.type, v) : formatNumber(v);
  }
  return v as React.ReactNode;
}

/* ---------- the card ---------- */

function DataTableCard<Row>({
  model: m,
  toolbar,
  className,
}: {
  model: DataTableModel<Row>;
  toolbar: "internal" | "external";
  className?: string;
}) {
  const p = m.props;
  const rowHeight = p.rowHeight ?? 44;
  const groupHeaderHeight = p.groupHeaderHeight ?? 36;
  const maxHeight = p.maxHeight ?? "60vh";
  const mobileLayout = p.mobileLayout ?? "cards";
  const loading = p.loading ?? false;
  const unit = p.unit ?? "rows";
  const emptyLabel = p.emptyLabel ?? "No results.";
  const { listItems, sorted, visible, totals } = m;
  const lead = m.selectable ? 1 : 0;
  const count = listItems ? listItems.length : sorted.length;
  const grouped = listItems != null;
  const groupId = React.useId();
  const showTotals = totals != null && !loading && sorted.length > 0;
  const bulk = m.selectable && m.selectedRows.length > 0;

  // The virtualizer rebuilds its measurements only when `count` or `getItemKey`
  // changes. A re-sort can move headers without changing the count, so the key
  // function must change with the list or stale offsets would stick. Only passed
  // when grouped; the flat table keeps the default index key. The two heights
  // aren't read here, but they size the offsets: listing them rebuilds those
  // when a height changes (`estimateSize` alone wouldn't). `getRowId` is read
  // through a ref instead: an inline lambda is new every render and would
  // rebuild every offset each time. (The row's React key below calls it direct.)
  const getRowIdRef = React.useRef(p.getRowId);
  getRowIdRef.current = p.getRowId;
  const getItemKey = React.useCallback(
    (i: number): string | number => {
      const item = listItems?.[i];
      if (!item) return i;
      if (item.kind === "group") return item.group.key === null ? UNGROUPED_KEY : GROUP_KEY + item.group.key;
      const rowId = getRowIdRef.current;
      return rowId ? rowId(item.row, item.index) : item.index;
    },
    [listItems, rowHeight, groupHeaderHeight],
  );

  const parentRef = React.useRef<HTMLDivElement>(null);
  const virt = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => (listItems?.[i]?.kind === "group" ? groupHeaderHeight : rowHeight),
    getItemKey: listItems ? getItemKey : undefined,
    overscan: 12,
  });
  const items = virt.getVirtualItems();

  // Scroll edges: the side fades (only where the table can scroll), the frozen
  // column's shadow, and the header's once rows pass under it. Set only on a
  // change, so scrolling doesn't re-render the table every frame.
  const [edges, setEdges] = React.useState({ left: false, right: false, top: false });
  const updateEdges = React.useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    const left = el.scrollLeft > 1;
    const right = el.scrollLeft < el.scrollWidth - el.clientWidth - 1;
    const top = el.scrollTop > 0;
    setEdges((prev) => (prev.left === left && prev.right === right && prev.top === top ? prev : { left, right, top }));
  }, []);
  React.useEffect(updateEdges, [updateEdges, m.template.template, p.minWidth, loading, count]);
  // The card resizing (a sidebar collapsing, the window) changes what can scroll.
  React.useEffect(() => {
    const el = parentRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateEdges]);

  const pad = (cell: number) => edgePadding(cell, m.cellCount).className;

  // Left-sticky positioning for a pinned cell. Callers supply z + background.
  // The last pinned cell carries the frozen edge: a hairline at rest, and a
  // soft shadow once content scrolls under it, so partial cells read as
  // sliding *under* the frozen block.
  const stickyCell = (cell: number, base: string): { className: string; style?: React.CSSProperties } => {
    const left = m.stickyLeft[cell];
    if (left === undefined) return { className: base };
    const style: React.CSSProperties = { left };
    if (cell === m.lastSticky) {
      style.boxShadow = edges.left
        ? "1px 0 0 0 var(--border), 8px 0 10px -6px rgb(0 0 0 / 0.22)"
        : "1px 0 0 0 var(--border)";
    }
    return { className: cn(base, "sticky"), style };
  };

  // Escape clears the selection while focus is in the table. Portalled menus
  // (a bulk action's own) bubble through React, not the DOM: skip those.
  const rootRef = React.useRef<HTMLDivElement>(null);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Escape" || e.defaultPrevented || !m.selectable || m.selectedRows.length === 0) return;
    if (!rootRef.current?.contains(e.target as Node)) return;
    m.clearSelection();
  };

  // Shift on the click that toggles a row's checkbox (the Checkbox reports only on/off).
  const shiftRef = React.useRef(false);
  const rowLabel = (row: Row) => (p.getRowLabel ? p.getRowLabel(row) : String(accessor(visible[0]?.col ?? p.columns[0], row) ?? "row"));

  const gridStyle = { gridTemplateColumns: "var(--dt-cols)" } as const;
  const anySticky = m.lastSticky >= 0;

  /* ---- header ---- */

  const headerCells = visible.map((rc, j) => {
    const cell = j + lead;
    const c = rc.col;
    const right = rc.align === "right";
    const active = m.sort?.key === rc.key;
    const order = active ? m.sort!.order : rc.first;
    const label = (
      <span className={cn(c.description != null && "underline decoration-dotted underline-offset-4")}>{c.header}</span>
    );
    const arrow = (
      <IconArrow
        dir={order}
        className={cn(
          "transition-opacity duration-150",
          active ? "opacity-100" : "opacity-0 group-hover/sort:opacity-100 group-focus-visible/sort:opacity-100",
        )}
      />
    );
    const suffix = c.headerSuffix;
    const sc = stickyCell(cell, cn("flex h-full min-w-0 items-center whitespace-nowrap", c.sticky && "z-20 bg-muted", suffix != null && pad(cell), suffix != null && right && "justify-end"));
    let body: React.ReactNode;
    if (rc.sortable) {
      const button = (
        <button
          type="button"
          onClick={() => m.toggleSort(rc.key)}
          tabIndex={bulk ? -1 : undefined}
          className={cn(
            "group/sort flex h-full min-w-0 items-center outline-none transition-colors hover:bg-accent/60",
            // The whole cell is the button; with a suffix beside it, just the label.
            suffix == null && cn("w-full", pad(cell)),
            right && "justify-end",
            active && "text-foreground",
          )}
        >
          <span className="-mx-1 inline-flex h-6 items-center gap-1 rounded-[4px] px-1 group-focus-visible/sort:ring-2 group-focus-visible/sort:ring-ring">
            {right && arrow}
            {label}
            {!right && arrow}
          </span>
        </button>
      );
      body = c.description != null ? <Tooltip content={c.description}>{button}</Tooltip> : button;
    } else {
      const text =
        c.description != null ? (
          <Tooltip content={c.description}>
            <span tabIndex={0} className="rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {label}
            </span>
          </Tooltip>
        ) : (
          label
        );
      body = suffix == null ? <div className={cn("flex h-full w-full items-center", pad(cell), right && "justify-end")}>{text}</div> : text;
    }
    return (
      <div
        key={rc.key}
        role="columnheader"
        aria-sort={!rc.sortable ? undefined : active ? (m.sort!.order === "asc" ? "ascending" : "descending") : "none"}
        className={sc.className}
        style={sc.style}
      >
        {body}
        {suffix}
      </div>
    );
  });

  /* ---- rows ---- */

  const renderGroupRow = (vi: { index: number; key: React.Key; start: number }, group: Extract<DataTableGroupItem<Row>, { kind: "group" }>) => {
    const g = group.group;
    const label = p.getGroupLabel ? p.getGroupLabel(g) : (g.key ?? p.ungroupedLabel ?? "Other");
    const labelId = `${groupId}-${vi.index}`;
    const contentId = `${labelId}-content`;
    return (
      <div
        key={vi.key}
        role="row"
        aria-rowindex={vi.index + 2}
        // Anywhere on the band toggles, except controls inside it and
        // a drag-selection that ends here (that still fires a click).
        onClick={(e) => {
          if (window.getSelection()?.toString() || (e.target as HTMLElement).closest(GROUP_HEADER_SKIP)) return;
          m.toggleGroup(g.key);
        }}
        className={cn(
          "absolute left-0 top-0 grid w-full border-b border-border bg-muted/60 text-[13px] transition-colors",
          !m.searching && "cursor-pointer hover:bg-muted",
        )}
        style={{ height: groupHeaderHeight, transform: `translateY(${vi.start}px)`, ...gridStyle }}
      >
        <div role="cell" aria-colspan={m.cellCount} className="min-w-0" style={{ gridColumn: "1 / -1" }}>
          {/* `sticky left-0` keeps the label in view while the grid scrolls
              sideways. It clips itself (overflow-hidden) — never an ancestor,
              or that ancestor would become the sticky scroll container. Capped
              at the scroll area's visible width (100cqw), not the grid's:
              `max-w-full` would let a long header run off the right edge.
              `pr-8` clears the 32px right-edge fade. The chevron sits on the
              16px edge and the label at 36, over the rows' first column. */}
          <div className="sticky left-0 flex h-full w-max items-center gap-0.5 overflow-hidden pl-4 pr-8" style={{ maxWidth: "100cqw" }}>
            <button
              type="button"
              onClick={() => m.toggleGroup(g.key)}
              disabled={m.searching}
              aria-expanded={!g.collapsed}
              // The default header's visible label names the button (one
              // reading, not two); a custom header has none to point at, so
              // `getGroupLabel` names it and the custom content describes it.
              aria-labelledby={p.renderGroupHeader ? undefined : labelId}
              aria-label={p.renderGroupHeader ? label : undefined}
              aria-describedby={p.renderGroupHeader ? contentId : undefined}
              className="-ml-1.5 grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              <IconChevronDown className={cn("motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)]", g.collapsed && "-rotate-90")} />
            </button>
            <div id={p.renderGroupHeader ? contentId : undefined} className="flex min-w-0 items-center gap-2 whitespace-nowrap">
              {p.renderGroupHeader ? (
                p.renderGroupHeader(g)
              ) : (
                <>
                  <span id={labelId} className="font-medium text-foreground">{label}</span>
                  {/* A real space: flex drops it from the layout, but text
                      readers would run "PO-1" and "3" together without it. */}
                  {" "}
                  <span className="tabular-nums text-muted-foreground">{g.rows.length.toLocaleString()}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // The row's hover / selected tint on an opaque pinned cell (it masks the row's own).
  const tint = (selected: boolean) => (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 transition-opacity duration-150",
        selected ? "bg-accent/50" : "bg-accent/30 opacity-0 group-hover:opacity-100",
      )}
    />
  );

  const renderRow = (vi: { index: number; key: React.Key; start: number }, row: Row, rowIndex: number) => {
    const href = p.getRowHref?.(row);
    const selected = m.selectable && m.isSelected(row);
    return (
      <div
        key={p.getRowId ? p.getRowId(row, rowIndex) : vi.key}
        role="row"
        aria-rowindex={vi.index + 2}
        aria-selected={m.selectable ? selected : undefined}
        onClick={p.onRowClick ? (e) => { if (!(e.target as HTMLElement).closest(ROW_CLICK_SKIP)) p.onRowClick!(row); } : undefined}
        className={cn(
          "group absolute left-0 top-0 grid w-full items-center border-b border-border text-[13px] text-foreground hover:bg-accent/30",
          selected && "bg-accent/50 hover:bg-accent/50",
          (p.onRowClick || href) && "cursor-pointer",
        )}
        style={{ height: rowHeight, transform: `translateY(${vi.start}px)`, ...gridStyle }}
      >
        {/* Stretched row link — a SIBLING of the cells (never nest
            anchors). z ladder within the row: overlay z-[1] <
            TableLink/CopyButton/checkbox z-[2] < sticky cells z-10 — links
            beat the overlay for clicks, sticky cells keep painting
            over BOTH so scrolled content never bleeds past the
            frozen edge. (The pinned area therefore doesn't row-
            navigate — by convention the identity cell there is
            itself a TableLink.) */}
        {href && (
          <a
            href={href}
            aria-label={p.getRowLabel ? p.getRowLabel(row) : String(accessor(p.columns[0], row) ?? "Open row")}
            className="absolute inset-0 z-[1] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-foreground/30"
          />
        )}
        {m.selectable &&
          (() => {
            const sc = stickyCell(0, cn("relative z-[2] flex items-center self-stretch pl-4", anySticky && "z-10 bg-card"));
            return (
              <div
                role="cell"
                className={sc.className}
                style={sc.style}
                // Shift-click selects a range; keep it from selecting page text too.
                onMouseDown={(e) => {
                  if (e.shiftKey) e.preventDefault();
                }}
                onClickCapture={(e) => {
                  shiftRef.current = e.shiftKey;
                }}
              >
                {anySticky && tint(selected)}
                <SelectionCheckbox
                  state={selected ? "all" : "none"}
                  onCheckedChange={(on) => m.toggleRow(row, on, shiftRef.current)}
                  label={`Select ${rowLabel(row)}`}
                />
              </div>
            );
          })()}
        {visible.map((rc, j) => {
          const cell = j + lead;
          const c = rc.col;
          const raw = c.render ? c.render(row) : cellText(rc, accessor(c, row));
          const content = raw == null || raw === "" ? DASH : raw;
          const right = rc.align === "right";
          const indent = grouped && !m.selectable && j === 0 && "pl-9";
          if (c.sticky) {
            // A sticky cell fills the FULL row height (self-stretch): the row
            // centres cells to content height, so an opaque cell only as tall
            // as its text would let a taller badge behind it peek out. Flex
            // re-centres the content; the -z-10 tint carries hover/selected.
            const sc = stickyCell(
              cell,
              cn(
                "z-10 flex items-center self-stretch overflow-hidden bg-card",
                pad(cell),
                indent,
                j === 0 && "font-medium",
                right && "justify-end tabular-nums",
                c.className,
              ),
            );
            return (
              <div key={c.key} role="cell" className={sc.className} style={sc.style}>
                {tint(selected)}
                {href && <a href={href} tabIndex={-1} aria-hidden className="absolute inset-0 z-[1]" />}
                <span className="min-w-0 truncate">{content}</span>
              </div>
            );
          }
          return (
            <div
              key={c.key}
              role="cell"
              className={cn(
                // `min-w-0` lets the cell shrink to its track instead of its
                // content; `overflow-hidden` clips tall custom content to the
                // row. Content never breaks the grid.
                "min-w-0 overflow-hidden",
                pad(cell),
                indent,
                j === 0 && "font-medium",
                right ? "whitespace-nowrap text-right tabular-nums" : "truncate",
                c.className,
              )}
            >
              {content}
            </div>
          );
        })}
      </div>
    );
  };

  /* ---- the card ---- */

  const fadeInset = { top: HEADER_HEIGHT, bottom: showTotals ? TOTALS_HEIGHT : 0 };
  const selectedCount = m.selectedRows.length;
  const bulkContent =
    typeof p.bulkActions === "function" ? p.bulkActions(m.selectedRows, { clear: m.clearSelection }) : p.bulkActions;

  return (
    <div ref={rootRef} onKeyDown={onKeyDown} className={cn("flex flex-col overflow-hidden rounded-lg bg-card shadow-card", className)}>
      {toolbar === "internal" && <DataTableToolbar />}

      {p.filters?.length ? <ActiveFilterBar defs={p.filters} values={m.filterValues} onChange={m.setFilterValues} /> : null}

      {mobileLayout === "cards" && (
        <MobileRows
          columns={p.columns}
          rows={sorted}
          getRowId={p.getRowId}
          getRowHref={p.getRowHref}
          getRowLabel={p.getRowLabel}
          onRowClick={p.onRowClick}
          loading={loading}
          emptyLabel={emptyLabel}
          sort={m.sort}
          onSort={m.toggleSort}
          resetKey={JSON.stringify([m.query, m.sort, m.filterValues, m.activeTab])}
        />
      )}
      <div className={cn("relative", mobileLayout === "cards" && "hidden md:block")}>
        {/* The scroll area publishes the one column template (--dt-cols) every
            row reads. Grouped or selectable, it is also a size container: a
            group label and the bulk bar cap at its visible width (100cqw). */}
        <div
          ref={parentRef}
          onScroll={updateEdges}
          aria-busy={loading}
          className="overflow-auto"
          style={{
            maxHeight,
            containerType: grouped || m.selectable ? "inline-size" : undefined,
            ["--dt-cols" as string]: m.template.template,
          }}
        >
          <div style={{ minWidth: Math.max(p.minWidth ?? 0, m.template.minWidth) }}>
            {bulk && (
              // Takes the header's place (same 36px band, same spot) without
              // moving it: the column headers stay in the table for screen
              // readers, their buttons out of the tab order meanwhile.
              <div
                role="toolbar"
                aria-label="Bulk actions"
                className="sticky left-0 top-0 z-30 -mb-9 flex h-9 items-center gap-3 border-b border-border bg-muted pl-4 pr-3"
                style={{ width: "100cqw" }}
              >
                <SelectionCheckbox state={m.headerCheck} onCheckedChange={m.toggleAllInView} label={`Select all ${unit}`} />
                <span className="whitespace-nowrap text-[13px] font-medium tabular-nums text-foreground">
                  {selectedCount.toLocaleString()} selected
                </span>
                {bulkContent != null && <div className="flex min-w-0 items-center gap-1.5">{bulkContent}</div>}
                <button
                  type="button"
                  onClick={m.clearSelection}
                  className="ml-auto inline-flex h-7 shrink-0 items-center rounded-md px-2 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Clear
                </button>
              </div>
            )}
            <div
              role="table"
              aria-label={p["aria-label"]}
              aria-rowcount={loading ? -1 : 1 + count + (showTotals ? 1 : 0)}
              aria-colcount={m.cellCount}
            >
              <div
                role="row"
                aria-rowindex={1}
                className={cn("sticky top-0 z-20 grid w-full transition-shadow duration-150", tableHeaderRow)}
                style={{ ...gridStyle, boxShadow: edges.top ? HEADER_SCROLLED : undefined }}
              >
                {m.selectable &&
                  (() => {
                    const sc = stickyCell(0, cn("flex items-center pl-4", anySticky && "z-20 bg-muted"));
                    return (
                      <div role="columnheader" className={sc.className} style={sc.style}>
                        <SelectionCheckbox
                          state={m.headerCheck}
                          onCheckedChange={m.toggleAllInView}
                          label={`Select all ${unit}`}
                          tabIndex={bulk ? -1 : undefined}
                          disabled={loading || sorted.length === 0}
                        />
                      </div>
                    );
                  })()}
                {headerCells}
              </div>

              {loading ? (
                <div aria-hidden>
                  {Array.from({ length: 8 }).map((_, r) => (
                    <div key={r} className="grid w-full items-center border-b border-border" style={{ height: rowHeight, ...gridStyle }}>
                      {m.selectable && <div />}
                      {visible.map((rc, j) => (
                        <div key={rc.key} className={cn(pad(j + lead), rc.align === "right" && "flex justify-end")}>
                          <Skeleton height={12} width={SKELETON_WIDTHS[(r + j) % SKELETON_WIDTHS.length]} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : sorted.length === 0 ? (
                <div role="row">
                  <div role="cell" aria-colspan={m.cellCount}>
                    {p.emptyState ?? <EmptyState size="sm" title={emptyLabel} className="py-12" />}
                  </div>
                </div>
              ) : (
                <div role="rowgroup" style={{ height: virt.getTotalSize(), position: "relative" }}>
                  {items.map((vi) => {
                    const item = listItems?.[vi.index];
                    if (item?.kind === "group") return renderGroupRow(vi, item);
                    // Grouped, vi.index counts headers too; getRowId gets the sorted-list index, as flat.
                    return item ? renderRow(vi, item.row, item.index) : renderRow(vi, sorted[vi.index], vi.index);
                  })}
                </div>
              )}

              {showTotals && (
                <div
                  role="row"
                  aria-rowindex={count + 2}
                  // -mt-px: its top hairline lands on the last row's, not under it.
                  className="sticky bottom-0 z-20 -mt-px grid h-11 w-full items-center border-t border-border bg-muted text-[13px] font-semibold text-foreground"
                  style={gridStyle}
                >
                  {m.selectable &&
                    (() => {
                      const sc = stickyCell(0, cn("self-stretch", anySticky && "z-10 bg-muted"));
                      return <div role="cell" className={sc.className} style={sc.style} />;
                    })()}
                  {visible.map((rc, j) => {
                    const cell = j + lead;
                    const right = rc.align === "right";
                    const content =
                      j === m.totalLabelAt ? (p.totalsLabel ?? "Total") : rc.key in totals ? totalText(rc, totals[rc.key]) : null;
                    const sc = stickyCell(
                      cell,
                      cn(
                        "flex min-w-0 items-center self-stretch overflow-hidden whitespace-nowrap",
                        pad(cell),
                        right && "justify-end tabular-nums",
                        rc.col.sticky && "z-10 bg-muted",
                      ),
                    );
                    return (
                      <div key={rc.key} role="cell" className={sc.className} style={sc.style}>
                        {content != null && <span className="min-w-0 truncate">{content}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Horizontal-overflow fades (Linear pattern), below the header and
            above the totals. A pinned identity column already anchors the
            left, so only fade left when nothing is pinned. */}
        {!anySticky && (
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-0 w-8 bg-gradient-to-r from-card to-transparent transition-opacity duration-150",
              edges.left ? "opacity-100" : "opacity-0",
            )}
            style={fadeInset}
          />
        )}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute right-0 w-8 bg-gradient-to-l from-card to-transparent transition-opacity duration-150",
            edges.right ? "opacity-100" : "opacity-0",
          )}
          style={fadeInset}
        />
      </div>

      <div className="flex h-9 shrink-0 items-center border-t border-border px-4 text-[12px] tabular-nums text-muted-foreground">
        <span role="status" aria-live="polite">
          {loading ? (
            "Loading…"
          ) : selectedCount > 0 ? (
            <>
              <span>{selectedCount.toLocaleString()}</span> of {sorted.length.toLocaleString()} selected
            </>
          ) : (
            <>
              <span>{sorted.length.toLocaleString()}</span> {unit}
              {grouped && m.groupCount > 0 ? ` · ${m.groupCount.toLocaleString()} ${m.groupCount === 1 ? "group" : "groups"}` : null}
            </>
          )}
        </span>
      </div>
    </div>
  );
}

/* ---------- public components ---------- */

/** `<DataTable toolbar="external" />` inside a `DataTableProvider`: the card, with the provider's table. */
export interface DataTableConnectedProps {
  toolbar: "external";
  columns?: undefined;
  className?: string;
}

function StandaloneDataTable<Row>(props: DataTableProps<Row>) {
  const model = useDataTableModel(props);
  return (
    <DataTableContext.Provider value={model}>
      <DataTableCard model={model} toolbar={props.toolbar ?? "internal"} className={props.className} />
    </DataTableContext.Provider>
  );
}

function ConnectedDataTable({ className }: { className?: string }) {
  const model = useDataTableModelContext("DataTable toolbar=\"external\"");
  return <DataTableCard model={model} toolbar="external" className={className} />;
}

/**
 * The one table every OS uses. Search, filters, view tabs, a Columns picker,
 * row selection, totals, grouping and CSV/PDF export, each optional;
 * virtualized rows on one shared column template.
 */
export function DataTable<Row>(props: DataTableProps<Row>): React.ReactElement;
export function DataTable(props: DataTableConnectedProps): React.ReactElement;
export function DataTable<Row>(props: DataTableProps<Row> | DataTableConnectedProps): React.ReactElement {
  if (props.columns === undefined) return <ConnectedDataTable className={props.className} />;
  return <StandaloneDataTable {...(props as DataTableProps<Row>)} />;
}

export type DataTableProviderProps<Row> = Omit<DataTableProps<Row>, "toolbar" | "className"> & { children: React.ReactNode };

/**
 * Holds a table's state for a page that puts the toolbar in its own control
 * row: the pieces (`DataTableViews`, `DataTableSearch`, `DataTableFilterButton`,
 * `DataTableColumnsButton`, `DataTableExportMenu`) and `<DataTable toolbar="external" />`
 * anywhere inside it share one table.
 */
export function DataTableProvider<Row>({ children, ...props }: DataTableProviderProps<Row>) {
  const model = useDataTableModel(props as DataTableProps<Row>);
  return <DataTableContext.Provider value={model}>{children}</DataTableContext.Provider>;
}
