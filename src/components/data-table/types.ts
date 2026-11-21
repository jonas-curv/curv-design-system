import type * as React from "react";
import type { CellValue } from "./export";
import type { FilterDef } from "./filter-bar";
import type { DataTableColumnType } from "./format";
import type { DataTableGroup } from "./grouping";
import type { TotalSpec } from "./layout";
import type { MobilePriority } from "./mobile-rows";

export type { DataTableColumnType } from "./format";

export interface DataTableColumn<Row> {
  key: string;
  /** Sentence case. The column is never narrower than this label, and it never wraps. */
  header: string;
  headerSuffix?: React.ReactNode;
  /** A definition for the header: a dotted underline and a tooltip on the label (never an info icon). */
  description?: React.ReactNode;
  /**
   * What the column holds. It sets the alignment (number, money and percent
   * right with tabular figures; text, status and dates left), the default
   * formatting when there is no `render`, and the first sort direction
   * (numbers and dates high to low, text A to Z), even with a `render`. An
   * explicit `align` still wins. Untyped columns keep the old guess: a plain
   * numeric column without a `render` aligns right.
   */
  type?: DataTableColumnType;
  /** Text for the value when there is no `render`; also sizes the column and formats its total. Defaults to the `type`'s format. */
  format?: (value: CellValue) => string;
  mobilePriority?: MobilePriority;
  render?: (row: Row) => React.ReactNode;
  /** Sort + export + search value. Defaults to `row[key]`. */
  value?: (row: Row) => CellValue;
  align?: "left" | "right";
  /**
   * The column's track. A number is px. A string may be `"240px"`, `"1.5fr"` or
   * `"minmax(220px,1.6fr)"`; content-sized tracks (`auto`, `max-content`) are
   * ignored, because they let rows drift apart. Never narrower than the header.
   */
  width?: number | string;
  /**
   * Floor of an auto-sized column (ignored when `width` is set). The primary
   * text column (Name, Title) should set one (~240–320px) so typical values
   * fit; longer values then ellipsis at the edge (the Linear pattern). Numeric,
   * date and status columns size to their longest formatted value on their own.
   */
  minWidth?: number;
  /** Cap for an auto-sized text column. Numbers never truncate, so a numeric column ignores it. */
  maxWidth?: number;
  sortable?: boolean;
  /**
   * Pin this column to the left while the table scrolls horizontally (the
   * identity column: Customer, Deal #). Sticky columns must be the leftmost
   * ones; give any sticky column that has sticky columns after it a numeric
   * `width` so the next one's offset can be computed. A sticky column can't be hidden.
   */
  sticky?: boolean;
  /** Offer the column in the Columns picker. Default true; the first (identity) column and sticky columns can never be hidden. */
  hideable?: boolean;
  /** Start hidden until someone turns it on in the Columns picker. */
  defaultHidden?: boolean;
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

/** What `bulkActions` gets: the selected rows in view, and a way to clear the selection. */
export interface DataTableBulkContext {
  clear: () => void;
}

export interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  /** A stable id per row. Selection needs it (without it, a row's id is its index in `rows`). */
  getRowId?: (row: Row, index: number) => string;
  initialSort?: { key: string; order: "asc" | "desc" };
  /** The table's accessible name ("Deals"). */
  "aria-label"?: string;

  /**
   * Where the toolbar goes. `internal` (default): inside the card, above the
   * header. `external`: the card shows none; the page puts the pieces
   * (`DataTableViews`, `DataTableSearch`, `DataTableFilterButton`,
   * `DataTableColumnsButton`, `DataTableExportMenu`) in its own control row,
   * inside a `DataTableProvider`.
   */
  toolbar?: "internal" | "external";

  /** Search box (left of the toolbar). */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Column keys to search; defaults to every column. */
  searchKeys?: string[];

  /** Linear-style filters (select + range facets). Filtered internally. */
  filters?: FilterDef<Row>[];

  /** Segmented view tabs (All / Confirmed / …), first in the toolbar. Filter on top of search + facets. */
  tabs?: DataTableTab<Row>[];
  defaultTab?: string;

  /** Extra controls after Filter (e.g. a Views button). */
  toolbarActions?: React.ReactNode;
  /** Right cluster, before Columns and Export (e.g. a "$328k collected GP" summary). */
  summary?: React.ReactNode;

  exportFilename?: string;
  pdfTitle?: string;
  pdfSubtitle?: string;

  /**
   * Show a Columns button (a picker over every hideable column). On when
   * `tableId` or `columnVisibility` is given.
   */
  columnPicker?: boolean;
  /** Persists the Columns choices in this browser under this id (one id per table). */
  tableId?: string;
  /** Controlled column visibility: key → shown. Missing keys fall back to `defaultHidden`. */
  columnVisibility?: Readonly<Record<string, boolean>>;
  onColumnVisibilityChange?: (next: Record<string, boolean>) => void;

  /**
   * Row selection (off by default): a 40px checkbox column, and a bulk bar
   * that replaces the header while rows are selected. Select-all covers every
   * row in view (search, filters and tabs applied), not just the rendered ones;
   * shift-click selects a range; Escape clears.
   */
  selectable?: boolean;
  /** Controlled selection: row ids (`getRowId`). */
  selected?: readonly string[];
  defaultSelected?: readonly string[];
  onSelectedChange?: (ids: string[]) => void;
  /**
   * The bulk bar's actions (use `DataTableBulkAction` for the 28px button). A
   * function gets the selected rows in view. Rows a search or filter hides stay
   * selected but are not passed here.
   */
  bulkActions?: React.ReactNode | ((rows: Row[], context: DataTableBulkContext) => React.ReactNode);

  /**
   * A totals row, sticky at the bottom of the scroll area, over the rows in
   * view (search, filters and tabs applied). Per column key: `"sum"`, or a
   * function of the rows. "Total" sits in the first text column without a total.
   * Give totalled columns a `type` (or `format`) so the total reads like its cells.
   */
  totals?: Partial<Record<string, TotalSpec<Row>>>;
  totalsLabel?: string;

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
  /** Accessible name for the row link and its checkbox; defaults to the first column's value. */
  getRowLabel?: (row: Row) => string;
  emptyLabel?: string;
  /** Replaces the default empty state (an `EmptyState` with one line and at most one action). */
  emptyState?: React.ReactNode;
  /** Show a skeleton while data loads (distinct from the empty state). */
  loading?: boolean;
  /** Noun for the bottom count ("deals", "customers"). */
  unit?: string;

  /**
   * Group rows under header rows — for a list people scan by a parent record
   * (one header per PO, its lines underneath). Search, filters, tabs and sort
   * run first, then this partitions the sorted rows, so a column sort orders
   * rows *within* each group. Rows returning `null` (or `""`/`undefined`, which
   * count as `null`) go in one trailing group. Opt-in: without it the table is
   * the flat list, unchanged. The footer still counts rows, export stays flat,
   * and `mobileLayout="cards"` ignores grouping (the phone card list is flat).
   * Pass a stable function (module scope or `useCallback`): a new one each
   * render regroups the whole list each render.
   */
  groupBy?: (row: Row) => string | null | undefined;
  /**
   * Header row content for a group, rendered beside the toggle. Default: the
   * group label and the row count — the count is part of the default header
   * only, so a custom header shows its own. Links and badges are fine here; a
   * click anywhere else on the header toggles the group.
   */
  renderGroupHeader?: (group: DataTableGroup<Row>) => React.ReactNode;
  /**
   * Group order. Default: the order each group first appears in the sorted rows
   * (sort by due date and POs order by their earliest line). The `null` group
   * always comes last and never reaches the comparator.
   */
  compareGroups?: (a: DataTableGroup<Row>, b: DataTableGroup<Row>) => number;
  /**
   * Groups collapsed on first render (uncontrolled): read at mount only, so
   * changing it later does nothing. `null` is the ungrouped group. Collapse
   * hides a group's rows; an active search shows its matches regardless (the
   * saved collapse comes back when the search clears). Ignored when
   * `collapsedGroups` is passed.
   */
  defaultCollapsedGroups?: readonly (string | null)[];
  /**
   * Controlled collapse: the collapsed group keys. Passing it hands the state to
   * you: a header toggle calls `onCollapsedGroupsChange` with the next keys and
   * the table keeps none of its own. Use it to keep collapse across an unmount,
   * or to act on the open groups only (select-all). Pass state, not a fresh array
   * each render. Toggles made while a search shows its matches are not reported:
   * they last until the search clears, when your keys come back as they were.
   */
  collapsedGroups?: readonly (string | null)[];
  /** The next collapsed keys after a header toggle. Only called when `collapsedGroups` is passed. */
  onCollapsedGroupsChange?: (keys: (string | null)[]) => void;
  /**
   * `true` while a search of your own is filtering `rows` (`searchable={false}`
   * plus your own box): search matches then show in collapsed groups, as with the
   * built-in search. The built-in search box already counts.
   */
  searchActive?: boolean;
  /**
   * Label for the `null` group in the default header. Default "Other". Set it
   * (or `getGroupLabel`) whenever your own header names the catch-all, so the
   * toggle's accessible name says the same thing.
   */
  ungroupedLabel?: string;
  /**
   * A group's name: the default header's text, and the toggle button's
   * accessible name (with a custom `renderGroupHeader`, the button's only name).
   * Default: the key, or `ungroupedLabel` for the `null` group.
   */
  getGroupLabel?: (group: DataTableGroup<Row>) => string;
  /** Group header row height. Default 36. */
  groupHeaderHeight?: number;
  className?: string;
}
