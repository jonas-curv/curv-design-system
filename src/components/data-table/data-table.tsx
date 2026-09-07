"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "../../lib/cn";
import { SegmentedControl } from "../segmented-control";
import { downloadCsv, downloadPdf, type CellValue } from "./export";
import {
  ActiveFilterBar,
  FilterButton,
  rowMatchesFilters,
  type FilterDef,
  type FilterValues,
} from "./filter-bar";

/* ---------- inline icons ---------- */
function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
      <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
    </svg>
  );
}
function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
      <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
    </svg>
  );
}
function IconChevronDown({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={cn("shrink-0", className)} aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function IconSort({ dir }: { dir: "asc" | "desc" | null }) {
  if (dir === null) {
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground/30" aria-hidden>
        <path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" />
      </svg>
    );
  }
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
      {dir === "asc" ? <path d="m5 12 7-7 7 7" /> : <path d="m5 12 7 7 7-7" />}
    </svg>
  );
}

import { MobileRows, type MobilePriority } from "./mobile-rows";
export type { MobilePriority } from "./mobile-rows";

/* ---------- types ---------- */

export interface DataTableColumn<Row> {
  key: string;
  header: string;
  headerSuffix?: React.ReactNode;
  mobilePriority?: MobilePriority;
  render?: (row: Row) => React.ReactNode;
  /** Sort + export + search value. Defaults to `row[key]`. */
  value?: (row: Row) => CellValue;
  align?: "left" | "right";
  /** Grid track — number → px, or any CSS track (e.g. "minmax(220px,1.6fr)"). */
  width?: number | string;
  /**
   * Comfortable width range for an auto-sized column (ignored when `width` is
   * set). The **primary text column (Name / Title) should set a `minWidth`**
   * (~240–320px) so typical values fit instead of truncating at the 120px
   * default — longer values then ellipsis at the column edge (the Linear
   * pattern). `maxWidth` caps growth so one pathological value can't blow the
   * column out. Numeric columns can stay at the default.
   */
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  /**
   * Pin this column to the left while the table scrolls horizontally (the
   * identity column — Customer, Deal #). Sticky columns must be the leftmost
   * ones; give any sticky column that has sticky columns after it a numeric
   * `width` so the next one's offset can be computed. (design-system.md →
   * Tables: "sticky what you scroll past".)
   */
  sticky?: boolean;
  className?: string;
}

/** A segmented view-swapper tab (All deals / Confirmed / To collect …). */
export interface DataTableTab<Row> {
  key: string;
  label: string;
  /** Predicate for this view; omit for an "all" tab. */
  filter?: (row: Row) => boolean;
  /** Override the auto-computed count; pass null to hide the count. */
  count?: number | null;
}

export interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  getRowId?: (row: Row, index: number) => string;
  initialSort?: { key: string; order: "asc" | "desc" };

  /** Search box (left of the toolbar). */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Column keys to search; defaults to every column. */
  searchKeys?: string[];

  /** Linear-style filters (select + range facets). Filtered internally. */
  filters?: FilterDef<Row>[];

  /** Segmented view tabs (All / Confirmed / …). Filter on top of search + facets. */
  tabs?: DataTableTab<Row>[];
  defaultTab?: string;

  /** Extra controls after Filter (e.g. a Views button). */
  toolbarActions?: React.ReactNode;
  /** Right cluster, before Export (e.g. a "$328k collected GP · 261 deals" summary). */
  summary?: React.ReactNode;

  exportFilename?: string;
  pdfTitle?: string;
  pdfSubtitle?: string;

  rowHeight?: number;
  maxHeight?: number | string;
  /** Horizontal min-width; below it the grid scrolls sideways. */
  minWidth?: number;
  /** Keep spatial report/workbook comparison scrollable on phones. */
  mobileLayout?: "cards" | "scroll";
  onRowClick?: (row: Row) => void;
  /**
   * Make rows real links (cmd+click, middle-click, copy-link, native keyboard
   * access). Rendered as a stretched overlay anchor so per-cell `TableLink`s
   * remain valid HTML (never nested anchors). Interactive cell content needs
   * `relative z-[2]` — above the overlay (z-[1]) for clicks but below sticky
   * cells (z-10) so the frozen column keeps masking on horizontal scroll —
   * `TableLink` and `CopyButton` handle this themselves.
   */
  getRowHref?: (row: Row) => string | undefined;
  /** Accessible name for the row link; defaults to the first column's value. */
  getRowLabel?: (row: Row) => string;
  emptyLabel?: string;
  /** Show a skeleton while data loads (distinct from the empty state). */
  loading?: boolean;
  /** Noun for the bottom count ("deals", "customers"). */
  unit?: string;
  className?: string;
}

// One toolbar-button treatment for Filter / Views / Export at the canonical
// main-toolbar control height (h-9 / 36px, per design-system.md), so search,
// filter, views and export read as one perfectly aligned band.
export const dataTableToolbarButton =
  "inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-[13px] font-medium text-foreground transition-[transform,border-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-foreground/20 active:scale-[0.97]";
const menuRow =
  "flex w-full items-center rounded-md px-2 py-1.5 text-left text-[13px] text-foreground transition hover:bg-accent";

function accessor<Row>(col: DataTableColumn<Row>, row: Row): CellValue {
  if (col.value) return col.value(row);
  return (row as Record<string, unknown>)[col.key] as CellValue;
}

// Sample up to ~20 rows to decide whether an unmarked column is numeric — so it
// auto-aligns right + sizes tight instead of ballooning to 1fr in the text
// branch. Nulls are ignored; the column counts as numeric when its sampled
// non-null values are predominantly `number`.
function isNumericColumn<Row>(col: DataTableColumn<Row>, rows: Row[]): boolean {
  let seen = 0;
  let numeric = 0;
  const limit = Math.min(rows.length, 20);
  for (let i = 0; i < limit; i++) {
    const v = accessor(col, rows[i]);
    if (v == null) continue;
    seen++;
    if (typeof v === "number") numeric++;
  }
  return seen > 0 && numeric >= seen * 0.7;
}

function track<Row>(col: DataTableColumn<Row>, align: "left" | "right"): string {
  if (col.width != null) return typeof col.width === "number" ? `${col.width}px` : col.width;
  // Numeric (right-aligned) columns size to their content — **a number must never
  // truncate** (a dropped digit is silently wrong). So an auto-sized numeric
  // column is `max-content`: always wide enough for its longest value.
  if (align === "right" && col.maxWidth == null) {
    return `minmax(${col.minWidth ?? 72}px,max-content)`;
  }
  // Text columns: a comfortable floor (min) that grows to share slack (1fr) or is
  // capped (maxWidth). Values past the track's width ellipsis in the cell. The
  // primary text column should raise `minWidth`; 120px is the default floor.
  const min = col.minWidth ?? 120;
  const max = col.maxWidth != null ? `${col.maxWidth}px` : "1fr";
  return `minmax(${min}px,${max})`;
}

// Deterministic bar widths for the loading skeleton (no Math.random → stable
// across renders), varied so rows don't look like a printed grid.
const SKELETON_WIDTHS = ["62%", "45%", "70%", "38%", "55%", "48%"];

/* ---------- component ---------- */

export function DataTable<Row>({
  columns,
  rows,
  getRowId,
  initialSort,
  searchable = false,
  searchPlaceholder = "Search…",
  searchKeys,
  filters,
  tabs,
  defaultTab,
  toolbarActions,
  summary,
  exportFilename,
  pdfTitle,
  pdfSubtitle,
  rowHeight = 44,
  maxHeight = "60vh",
  minWidth,
  mobileLayout = "cards",
  onRowClick,
  getRowHref,
  getRowLabel,
  emptyLabel = "No results.",
  loading = false,
  unit = "rows",
  className,
}: DataTableProps<Row>) {
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<{ key: string; order: "asc" | "desc" } | null>(
    initialSort ?? null,
  );
  const [filterValues, setFilterValues] = React.useState<FilterValues>({});
  const [activeTab, setActiveTab] = React.useState(defaultTab ?? tabs?.[0]?.key ?? "");

  // Resolved align per column: the consumer's `align` always wins. Otherwise only
  // a PLAIN numeric column — a number value with NO custom `render` — auto-aligns
  // right + sizes tight. A column with a `render` is presentation-controlled by
  // the consumer, so it's never auto-aligned: a numeric value shown as stars,
  // a badge, or a chip must keep the default left alignment (this is the bug
  // where a "Rating" column rendered as stars had its header flipped right).
  // Used for header/cell alignment, tight track sizing, and export.
  const aligns = React.useMemo<("left" | "right")[]>(
    () => columns.map((c) => c.align ?? (!c.render && isNumericColumn(c, rows) ? "right" : "left")),
    [columns, rows],
  );
  const grid = React.useMemo(() => columns.map((c, i) => track(c, aligns[i])).join(" "), [columns, aligns]);
  const colByKey = React.useMemo(() => Object.fromEntries(columns.map((c) => [c.key, c])), [columns]);

  // Sticky identity columns: cumulative left offset per sticky column, and the
  // index of the last one (which carries the divider to the scrolling body).
  const { stickyLeft, lastStickyIndex } = React.useMemo(() => {
    let acc = 0;
    let last = -1;
    const lefts = columns.map((c) => {
      if (!c.sticky) return undefined as number | undefined;
      const left = Number.isNaN(acc) ? undefined : acc;
      acc = typeof c.width === "number" ? acc + c.width : NaN;
      return left;
    });
    lefts.forEach((l, i) => {
      if (l !== undefined) last = i;
    });
    return { stickyLeft: lefts, lastStickyIndex: last };
  }, [columns]);
  const hasSticky = lastStickyIndex >= 0;

  // Wrap a cell's classes with left-sticky positioning when its column is
  // sticky. Callers supply their own z + background in `base` (header sits
  // above body). The last sticky column carries a right-edge treatment: a
  // resting hairline, deepening to a soft shadow once content scrolls under it
  // (edges.left) — so partial cells at the frozen boundary read as sliding
  // *under* the frozen block, not floating broken.
  const stickyCell = (i: number, base: string): { className: string; style?: React.CSSProperties } => {
    if (stickyLeft[i] === undefined) return { className: base };
    const style: React.CSSProperties = { left: stickyLeft[i] };
    // Only mark the frozen edge once content is actually scrolled under it —
    // at rest the frozen column looks like any other (no stray vertical line,
    // since the table has no column dividers). While scrolled: hairline + soft
    // shadow so partial cells read as sliding under.
    if (i === lastStickyIndex && edges.left) {
      style.boxShadow = "1px 0 0 0 var(--border), 8px 0 10px -6px rgb(0 0 0 / 0.22)";
    }
    return { className: cn(base, "sticky"), style };
  };

  const searchCols = React.useMemo(
    () => (searchKeys ? columns.filter((c) => searchKeys.includes(c.key)) : columns),
    [columns, searchKeys],
  );

  // 1) search
  const searched = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      searchCols.some((c) => {
        const v = accessor(c, row);
        return v != null && String(v).toLowerCase().includes(q);
      }),
    );
  }, [rows, searchCols, query]);

  // 2) facet filters
  const faceted = React.useMemo(() => {
    if (!filters || filters.length === 0) return searched;
    return searched.filter((r) => rowMatchesFilters(r, filters, filterValues));
  }, [searched, filters, filterValues]);

  // tab counts computed over the search + facet set (so they reflect current filters)
  const tabCounts = React.useMemo(() => {
    const out: Record<string, number> = {};
    if (tabs) for (const t of tabs) out[t.key] = t.filter ? faceted.filter(t.filter).length : faceted.length;
    return out;
  }, [tabs, faceted]);

  // 3) active tab
  const tabbed = React.useMemo(() => {
    const t = tabs?.find((x) => x.key === activeTab);
    return t?.filter ? faceted.filter(t.filter) : faceted;
  }, [faceted, tabs, activeTab]);

  // 4) sort
  const sorted = React.useMemo(() => {
    if (!sort) return tabbed;
    const col = colByKey[sort.key];
    if (!col) return tabbed;
    const dir = sort.order === "asc" ? 1 : -1;
    return [...tabbed].sort((a, b) => {
      const av = accessor(col, a);
      const bv = accessor(col, b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir;
    });
  }, [tabbed, sort, colByKey]);

  const parentRef = React.useRef<HTMLDivElement>(null);
  const virt = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
  });
  const items = virt.getVirtualItems();

  // Edge-fade: signal horizontal overflow (the Linear pattern) — only the edges
  // that can actually scroll show a soft fade.
  const [edges, setEdges] = React.useState({ left: false, right: false });
  const updateEdges = React.useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    setEdges({
      left: el.scrollLeft > 1,
      right: el.scrollLeft < el.scrollWidth - el.clientWidth - 1,
    });
  }, []);
  React.useEffect(updateEdges, [updateEdges, grid, minWidth, loading, sorted.length]);

  const toggleSort = (key: string) =>
    setSort((prev) => {
      if (prev?.key !== key) return { key, order: "asc" };
      if (prev.order === "asc") return { key, order: "desc" };
      return null;
    });

  const [menuOpen, setMenuOpen] = React.useState(false);
  const runExport = (kind: "csv" | "pdf") => {
    setMenuOpen(false);
    const headers = columns.map((c) => c.header);
    const align = aligns;
    const data = sorted.map((row) => columns.map((c) => accessor(c, row)));
    if (kind === "csv") downloadCsv(headers, data, exportFilename ?? "export");
    else void downloadPdf(headers, data, { filename: exportFilename ?? "export", title: pdfTitle, subtitle: pdfSubtitle, align });
  };

  const showToolbar = searchable || filters?.length || toolbarActions || summary || exportFilename;

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-lg bg-card shadow-card", className)}>
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          {searchable && (
            <div className="relative min-w-[200px] max-w-[320px] flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70">
                <IconSearch />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="h-11 sm:h-9 w-full rounded-md border border-border bg-card pl-9 pr-3 text-base sm:text-[13px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-foreground/20"
              />
            </div>
          )}
          {filters?.length ? (
            <FilterButton defs={filters} values={filterValues} onChange={setFilterValues} />
          ) : null}
          {toolbarActions}
          {(summary || exportFilename) && (
            <div className="ml-auto flex items-center gap-3">
              {summary}
              {exportFilename && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                    className={cn(dataTableToolbarButton, menuOpen && "border-foreground/20")}
                  >
                    <IconDownload />
                    Export
                    <IconChevronDown className={cn("transition-transform", menuOpen && "rotate-180")} />
                  </button>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" aria-hidden onClick={() => setMenuOpen(false)} />
                      <div role="menu" className="absolute right-0 z-50 mt-1 min-w-[160px] rounded-lg border border-border bg-popover p-1 shadow-lg">
                        <button type="button" role="menuitem" className={menuRow} onClick={() => runExport("csv")}>Export CSV</button>
                        <button type="button" role="menuitem" className={menuRow} onClick={() => runExport("pdf")}>Export PDF</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tabs?.length ? (
        <div className="flex items-center overflow-x-auto border-b border-border px-3 py-2">
          <SegmentedControl
            aria-label="View"
            size="sm"
            value={activeTab}
            onValueChange={setActiveTab}
            items={tabs.map((t) => ({
              value: t.key,
              label: t.label,
              // count: undefined → auto; a number → override; null → hidden
              // (?? would wrongly treat null as "auto").
              count: t.count === null ? undefined : (t.count ?? tabCounts[t.key]),
            }))}
          />
        </div>
      ) : null}

      {filters?.length ? (
        <ActiveFilterBar defs={filters} values={filterValues} onChange={setFilterValues} />
      ) : null}

      {mobileLayout === "cards" && <MobileRows columns={columns} rows={sorted} getRowId={getRowId} getRowHref={getRowHref} getRowLabel={getRowLabel} onRowClick={onRowClick} loading={loading} emptyLabel={emptyLabel} sort={sort} onSort={toggleSort} resetKey={JSON.stringify([query, sort, filterValues, activeTab])} />}
      <div className={cn("relative", mobileLayout === "cards" && "hidden md:block")}>
      <div ref={parentRef} onScroll={updateEdges} aria-busy={loading} className="overflow-auto" style={{ maxHeight }}>
        <div style={minWidth ? { minWidth } : undefined}>
          {/* header */}
          <div
            className="sticky top-0 z-20 grid min-w-max border-b border-border bg-muted/95 text-[12px] font-medium text-muted-foreground backdrop-blur"
            style={{ gridTemplateColumns: grid }}
          >
            {columns.map((c, i) => {
              const sortable = c.sortable ?? true;
              const active = sort?.key === c.key;
              const sc = stickyCell(
                i,
                cn("px-3 py-2.5", aligns[i] === "right" && "text-right", c.sticky && "z-20 bg-muted"),
              );
              return (
                <div key={c.key} className={sc.className} style={sc.style}>
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      aria-label={`Sort by ${c.header}`}
                      className={cn(
                        "inline-flex items-center gap-1 whitespace-nowrap transition hover:text-foreground",
                        aligns[i] === "right" && "flex-row-reverse",
                        active && "text-foreground",
                      )}
                    >
                      {c.header}
                      <IconSort dir={active ? sort!.order : null} />
                    </button>
                  ) : (
                    <span className="whitespace-nowrap">{c.header}</span>
                  )}
                  {c.headerSuffix}
                </div>
              );
            })}
          </div>

          {/* virtualized rows */}
          {loading ? (
            <div aria-hidden>
              {Array.from({ length: 8 }).map((_, r) => (
                <div
                  key={r}
                  className="grid min-w-max items-center border-b border-border"
                  style={{ height: rowHeight, gridTemplateColumns: grid }}
                >
                  {columns.map((c, i) => (
                    <div key={c.key} className={cn("px-3", aligns[i] === "right" && "flex justify-end")}>
                      <div
                        className="h-3 animate-pulse rounded bg-muted"
                        style={{ width: SKELETON_WIDTHS[(r + i) % SKELETON_WIDTHS.length] }}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="px-3 py-12 text-center text-[13px] text-muted-foreground">{emptyLabel}</div>
          ) : (
            <div style={{ height: virt.getTotalSize(), position: "relative" }}>
              {items.map((vi) => {
                const row = sorted[vi.index];
                const href = getRowHref?.(row);
                return (
                  <div
                    key={getRowId ? getRowId(row, vi.index) : vi.key}
                    onClick={onRowClick ? (e) => { if (!(e.target as HTMLElement).closest("a,button,input,select,textarea,[role=button]")) onRowClick(row); } : undefined}
                    className={cn(
                      "group absolute left-0 top-0 grid min-w-max w-full items-center border-b border-border text-[13px] hover:bg-accent/30",
                      (onRowClick || href) && "cursor-pointer",
                    )}
                    style={{ height: rowHeight, transform: `translateY(${vi.start}px)`, gridTemplateColumns: grid }}
                  >
                    {/* Stretched row link — a SIBLING of the cells (never nest
                        anchors). z ladder within the row: overlay z-[1] <
                        TableLink/CopyButton z-[2] < sticky cells z-10 — links
                        beat the overlay for clicks, sticky cells keep painting
                        over BOTH so scrolled content never bleeds past the
                        frozen edge. (The pinned area therefore doesn't row-
                        navigate — by convention the identity cell there is
                        itself a TableLink.) */}
                    {href && (
                      <a
                        href={href}
                        aria-label={getRowLabel ? getRowLabel(row) : String(accessor(columns[0], row) ?? "Open row")}
                        className="absolute inset-0 z-[1] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-foreground/30"
                      />
                    )}
                    {columns.map((c, i) => {
                      const content = c.render ? c.render(row) : (accessor(c, row) as React.ReactNode);
                      if (c.sticky) {
                        // Sticky cell must fill the FULL row height (self-stretch)
                        // — the row centres cells to content height, so an opaque
                        // cell only as tall as its text lets a taller badge behind
                        // it peek above/below. Flex re-centres the content; the
                        // -z-10 overlay (full-height now) carries the row hover tint.
                        const sc = stickyCell(
                          i,
                          cn(
                            "z-10 flex items-center self-stretch overflow-hidden bg-card px-3",
                            aligns[i] === "right" && "justify-end tabular-nums",
                            c.className,
                          ),
                        );
                        return (
                          <div key={c.key} className={sc.className} style={sc.style}>
                            <span
                              aria-hidden
                              className="pointer-events-none absolute inset-0 -z-10 bg-accent/30 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                            />
                            {href && <a href={href} tabIndex={-1} aria-hidden className="absolute inset-0 z-[1]" />}
                            <span className="min-w-0 truncate">{content}</span>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={c.key}
                          className={cn(
                            // `min-w-0` lets the cell shrink to its grid track instead of
                            // its content — without it, a long value (or a custom multi-line
                            // `render`) forces the track wider and shoves every later column.
                            // `overflow-hidden` clips tall custom content to the row height so
                            // it can't overlap the next row. Together: content NEVER breaks the
                            // grid — it truncates/clips inside its own cell, whatever it is.
                            "min-w-0 overflow-hidden px-3",
                            // Numbers never truncate — nowrap + a max-content track keep every
                            // digit; text ellipsizes past its track.
                            aligns[i] === "right" ? "whitespace-nowrap text-right tabular-nums" : "truncate",
                            c.className,
                          )}
                        >
                          {content}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
        {/* horizontal-overflow fades (Linear pattern). A pinned identity column
            already anchors the left, so only fade left when nothing is pinned. */}
        {!hasSticky && (
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-card to-transparent transition-opacity duration-150",
              edges.left ? "opacity-100" : "opacity-0",
            )}
          />
        )}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent transition-opacity duration-150",
            edges.right ? "opacity-100" : "opacity-0",
          )}
        />
      </div>

      <div className="flex shrink-0 items-center border-t border-border px-3 py-2 text-[12px] text-muted-foreground">
        <span className="tabular-nums" role="status" aria-live="polite">
          {loading ? (
            "Loading…"
          ) : (
            <>
              <span className="font-medium text-foreground">{sorted.length.toLocaleString()}</span> {unit}
            </>
          )}
        </span>
      </div>
    </div>
  );
}
