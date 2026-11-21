import * as React from "react";
import { cn } from "../lib/cn";
import { EMPTY } from "./data-table/format";
import { tableCellPadding } from "./data-table/tokens";

// The shadcn table parts, in the one table look (design-system.md → Tables):
// for small read-only tables in a card or a detail page, editable grids, and
// anything DataTable's cells can't express. Same names and props as shadcn's
// `ui/table.tsx`, so an app's copy is replaced by an import.
//
// No hooks, no context and no "use client": server components render these
// (import them from "@curvgroup/design-system/table"; the package root also
// exports them). Density and the identity column are set on <Table> and reach
// the cells through CSS, never through React state.

type Align = "left" | "right";
/** 1 shows always; 2 hides below md (768px); 3 hides below xl (1280px). Give a head and its cells the same one. */
export type TableColumnPriority = 1 | 2 | 3;
export type TableSortOrder = "asc" | "desc";
type Sticky = boolean | "left" | "right";

const PRIORITY: Record<TableColumnPriority, string | undefined> = {
  1: undefined,
  2: "hidden md:table-cell",
  3: "hidden xl:table-cell",
};

function stickySide(sticky: Sticky | undefined): "left" | "right" | null {
  if (sticky === true || sticky === "left") return "left";
  if (sticky === "right") return "right";
  return null;
}

/** The 12px sort arrow (the same one DataTable draws). */
export function SortArrow({ dir, className }: { dir: TableSortOrder; className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("shrink-0", className)} aria-hidden>
      <path d={dir === "asc" ? "M12 19V5M5 12l7-7 7 7" : "M12 5v14M19 12l-7 7-7-7"} />
    </svg>
  );
}

/* ---------- Table ---------- */

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /** Classes for the scroll container around the `<table>`. */
  containerClassName?: string;
  /**
   * Caps the container's height and makes it scroll vertically, so a sticky
   * `TableHeader` and `TableFooter` hold while rows scroll (the card owns
   * vertical scroll). Without it the container only scrolls sideways.
   */
  maxHeight?: number | string;
  /** Draw the container as the standard card (`rounded-lg bg-card shadow-card`, clipped). Leave it off inside a `Card`. */
  card?: boolean;
  /** Rows 36 instead of 44: financial statements and dense read-outs. The header stays 36. */
  dense?: boolean;
  /** The first body column is the row's identity and is set 500. Default true; pass false when a date or a checkbox leads. */
  identityColumn?: boolean;
}

/**
 * The scroll container and the `<table>`. Full-bleed in its card: padding
 * lives on the cells (12 a side, 16 on the outer edges).
 */
export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, containerClassName, maxHeight, card = false, dense = false, identityColumn = true, ...props }, ref) => (
    <div
      data-slot="table-container"
      className={cn("relative w-full overflow-auto", card && "rounded-lg bg-card shadow-card", containerClassName)}
      style={maxHeight != null ? { maxHeight } : undefined}
    >
      <table
        ref={ref}
        data-slot="table"
        data-density={dense ? "compact" : undefined}
        className={cn(
          "w-full caption-bottom border-collapse text-body text-foreground",
          dense && "[&>tbody>tr>td]:h-9",
          identityColumn && "[&>tbody>tr>td:first-child]:font-medium",
          className,
        )}
        {...props}
      />
    </div>
  ),
);
Table.displayName = "Table";

/* ---------- sections ---------- */

export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  /** Stick to the top of the scroll container (give `Table` a `maxHeight`). */
  sticky?: boolean;
}

/** `<thead>`. The hairline below it travels with a sticky header (it is drawn on each head cell). */
export const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(({ className, sticky = false, ...props }, ref) => (
  <thead ref={ref} data-slot="table-header" className={cn("[&>tr]:border-b-0", sticky && "sticky top-0 z-20", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

/** `<tbody>`. Rows have hairline dividers; the last one leaves the edge to the card or the footer. */
export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <tbody ref={ref} data-slot="table-body" className={cn("[&>tr:last-child]:border-b-0", className)} {...props} />
));
TableBody.displayName = "TableBody";

export interface TableFooterProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  /** Stick to the bottom of the scroll container (give `Table` a `maxHeight`). */
  sticky?: boolean;
}

/**
 * `<tfoot>`: the totals row. 44 tall, `bg-muted`, a hairline above, semibold;
 * "Total" goes in the first text column. `sticky` pins it to the bottom of
 * the scroll container while rows scroll under it.
 */
export const TableFooter = React.forwardRef<HTMLTableSectionElement, TableFooterProps>(({ className, sticky = false, ...props }, ref) => (
  <tfoot
    ref={ref}
    data-slot="table-footer"
    className={cn(
      "font-semibold text-foreground [&>tr]:border-b-0",
      // On the cells, not the section: a collapsed border would stay behind
      // when the footer sticks, and an opaque cell masks the rows under it.
      "[&>tr>*]:h-11 [&>tr>*]:bg-muted [&>tr>*]:shadow-[inset_0_1px_0_var(--border)]",
      sticky && "sticky bottom-0 z-20",
      className,
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

/* ---------- rows ---------- */

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  /** A selected row (`bg-accent/50`). Sets `data-state="selected"` and `aria-selected`, as shadcn's selection does. */
  selected?: boolean;
}

/** `<tr>`: a hairline below, `hover:bg-accent/30` on body rows only, no zebra. */
export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(({ className, selected, ...props }, ref) => (
  <tr
    ref={ref}
    data-slot="table-row"
    data-state={selected ? "selected" : undefined}
    aria-selected={selected}
    className={cn(
      "border-b border-border transition-colors",
      "[tbody>&:not([data-state=selected])]:hover:bg-accent/30 data-[state=selected]:bg-accent/50",
      className,
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

/* ---------- cells ---------- */

// The hairlines are shadows, not borders: a collapsed border stays behind when
// its cell sticks. A pinned column's edge is a hairline on the side content
// scrolls under.
const HEAD_SHADOW = {
  none: "shadow-[inset_0_-1px_0_var(--border)]",
  left: "shadow-[inset_0_-1px_0_var(--border),1px_0_0_0_var(--border)]",
  right: "shadow-[inset_0_-1px_0_var(--border),-1px_0_0_0_var(--border)]",
} as const;
const CELL_EDGE = { left: "shadow-[1px_0_0_0_var(--border)]", right: "shadow-[-1px_0_0_0_var(--border)]" } as const;

// A pinned body cell is opaque (it masks what scrolls under it), so it carries
// the row's hover and selected tint itself, as a layer over the card colour.
const STICKY_BODY =
  "z-10 bg-card [tbody>tr:hover>&]:bg-[linear-gradient(color-mix(in_oklab,var(--accent)_30%,transparent),color-mix(in_oklab,var(--accent)_30%,transparent))] [tr[data-state=selected]>&]:bg-[linear-gradient(color-mix(in_oklab,var(--accent)_50%,transparent),color-mix(in_oklab,var(--accent)_50%,transparent))]";

interface CellLayout {
  /** Text, status and dates left (default); numbers, money, %, quantities and durations right. */
  align?: Align;
  /** A number: right-aligned with tabular figures, never wrapping. */
  numeric?: boolean;
  /** Responsive column priority (2 hides below md, 3 below xl). */
  priority?: TableColumnPriority;
  /** Pin while the table scrolls sideways: `true` / `"left"` (the identity column) or `"right"` (a total). One per side; offset further ones with `style.left`. */
  sticky?: Sticky;
}

export interface TableHeadProps extends Omit<React.ThHTMLAttributes<HTMLTableCellElement>, "align">, CellLayout {
  /**
   * The column's sort: `"asc"`, `"desc"`, or `null` when another column (or
   * none) is sorted. With `onSort` the whole cell is the sort button.
   */
  sort?: TableSortOrder | null;
  /** Makes the head a sort button. The caller owns the order (see `useTableSort`). */
  onSort?: () => void;
  /** Where a first click sorts, for the arrow shown on hover. Default: numeric columns high to low, others A to Z. Dates: `"desc"`. */
  sortFirst?: TableSortOrder;
}

/**
 * `<th scope="col">`: 36 tall, solid `bg-muted`, 12 / 500 muted, sentence
 * case, never wraps; a hairline below. Sortable with `sort` + `onSort`: the
 * whole cell is the button, a 12px arrow in a reserved slot (hidden at rest,
 * muted on hover and focus, foreground when sorted), after the label on left
 * columns and before it on right ones, `aria-sort` on the cell.
 */
export const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, align, numeric = false, priority, sticky, sort, onSort, sortFirst, scope = "col", "aria-sort": ariaSort, children, ...props }, ref) => {
    const right = numeric || align === "right";
    const side = stickySide(sticky);
    const sortable = onSort != null;
    const active = sortable && sort != null;
    const dir: TableSortOrder = active ? sort! : (sortFirst ?? (right ? "desc" : "asc"));
    return (
      <th
        ref={ref}
        scope={scope}
        data-slot="table-head"
        aria-sort={sortable ? (active ? (sort === "asc" ? "ascending" : "descending") : "none") : ariaSort}
        className={cn(
          "h-9 whitespace-nowrap bg-muted py-0 text-left align-middle text-caption font-medium text-muted-foreground",
          HEAD_SHADOW[side ?? "none"],
          sortable ? "p-0" : tableCellPadding,
          right && "text-right",
          active && "text-foreground",
          priority && PRIORITY[priority],
          side && cn("sticky z-10", side === "left" ? "left-0" : "right-0"),
          className,
        )}
        {...props}
      >
        {sortable ? (
          <button
            type="button"
            onClick={onSort}
            className={cn(
              // The whole cell is the button; it carries the cell's padding.
              "group/sort flex h-9 w-full min-w-0 items-center px-3 outline-none transition-colors hover:bg-accent/60",
              "[th:first-child>&]:pl-4 [th:last-child>&]:pr-4",
              right && "justify-end",
            )}
          >
            <span className="-mx-1 inline-flex h-6 items-center gap-1 rounded-[4px] px-1 group-focus-visible/sort:ring-2 group-focus-visible/sort:ring-ring">
              {right && <HeadArrow dir={dir} active={active} />}
              {children}
              {!right && <HeadArrow dir={dir} active={active} />}
            </span>
          </button>
        ) : (
          children
        )}
      </th>
    );
  },
);
TableHead.displayName = "TableHead";

function HeadArrow({ dir, active }: { dir: TableSortOrder; active: boolean }) {
  return (
    <SortArrow
      dir={dir}
      className={cn(
        "transition-opacity duration-150",
        active ? "opacity-100" : "opacity-0 group-hover/sort:opacity-100 group-focus-visible/sort:opacity-100",
      )}
    />
  );
}

export interface TableCellProps extends Omit<React.TdHTMLAttributes<HTMLTableCellElement>, "align">, CellLayout {}

/** `<td>`: a 44 row (36 in a `dense` table), 13px, 12 a side and 16 on the outer edges. */
export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, align, numeric = false, priority, sticky, ...props }, ref) => {
    const right = numeric || align === "right";
    const side = stickySide(sticky);
    return (
      <td
        ref={ref}
        data-slot="table-cell"
        className={cn(
          "h-11 py-2 align-middle",
          tableCellPadding,
          right && "whitespace-nowrap text-right tabular-nums",
          priority && PRIORITY[priority],
          side && cn("sticky", side === "left" ? "left-0" : "right-0", STICKY_BODY, CELL_EDGE[side]),
          className,
        )}
        {...props}
      />
    );
  },
);
TableCell.displayName = "TableCell";

/** `<caption>`, under the table, muted. Most tables are named by `aria-label` instead. */
export const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(({ className, ...props }, ref) => (
  <caption ref={ref} data-slot="table-caption" className={cn("mt-4 text-body text-muted-foreground", className)} {...props} />
));
TableCaption.displayName = "TableCaption";

/** What an empty cell shows: a muted "—". `<TableCell>{deal.closeDate ?? <TableNull />}</TableCell>`. */
export function TableNull({ className }: { className?: string }) {
  return <span className={cn("text-muted-foreground/60", className)}>{EMPTY}</span>;
}
