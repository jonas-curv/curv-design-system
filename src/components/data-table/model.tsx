"use client";

// The table's state and everything derived from it, computed once per render
// and shared through context: the card, the built-in toolbar and the toolbar
// pieces a page places in its own control row all read the same model.

import * as React from "react";
import { downloadCsv, downloadPdf, type CellValue } from "./export";
import { rowMatchesFilters, type FilterValues } from "./filter-bar";
import { EMPTY, formatValue, type DataTableColumnType } from "./format";
import { collapsedFor, groupItems, toggled, type DataTableGroupItem } from "./grouping";
import {
  alignForType,
  checkState,
  computeTotals,
  exportColumns,
  firstSortOrder,
  isSortable,
  looksNumeric,
  nextSort,
  parseVisibility,
  resolveTemplate,
  selectRange,
  setColumnVisible,
  sortRows,
  stickyOffsets,
  toggleAll,
  toggleOne,
  totalLabelIndex,
  visibilityStorageKey,
  visibleColumnKeys,
  type CheckState,
  type ColumnAlign,
  type ResolvedTemplate,
  type SortOrder,
  type SortState,
  type TrackSpec,
} from "./layout";
import type { DataTableColumn, DataTableProps } from "./types";

export function accessor<Row>(col: DataTableColumn<Row>, row: Row): CellValue {
  if (col.value) return col.value(row);
  return (row as Record<string, unknown>)[col.key] as CellValue;
}

/** A column with its type, alignment and sort direction worked out. */
export interface ResolvedColumn<Row> {
  col: DataTableColumn<Row>;
  key: string;
  type: DataTableColumnType | undefined;
  align: ColumnAlign;
  /** Where a first click sorts. */
  first: SortOrder;
  sortable: boolean;
  /** A text column ("Total" sits in the first one without a total). */
  text: boolean;
  /** The identity column, a sticky column, or `hideable: false`: always shown. */
  locked: boolean;
}

/** The text a cell shows when it has no `render`: the column's `format`, else its type's. Untyped columns show the value as is. */
export function cellText<Row>(rc: ResolvedColumn<Row>, value: unknown): React.ReactNode {
  if (value == null || value === "") return null;
  if (rc.col.format) return rc.col.format(value as CellValue);
  if (rc.type) return formatValue(rc.type, value);
  return value as React.ReactNode;
}

// The longest candidates a column must fit: a numeric column's extremes (the
// widest number is the biggest or the most negative), otherwise the longest
// strings. Scans every row once; never formats more than a handful.
function showForWidth<Row>(rc: ResolvedColumn<Row>, v: unknown): string {
  if (v == null || v === "") return EMPTY;
  if (rc.col.format) return rc.col.format(v as CellValue);
  if (rc.type) return formatValue(rc.type, v);
  // Untyped: a `render` usually adds a symbol and separators, so size for money.
  return rc.col.render && typeof v === "number" ? formatValue("money", v) : String(v);
}

function widthSamples<Row>(rc: ResolvedColumn<Row>, rows: readonly Row[]): string[] {
  const show = (v: unknown) => showForWidth(rc, v);
  let min: unknown = undefined;
  let max: unknown = undefined;
  const longest: string[] = [];
  // Numbers and dates by value; ISO date strings compare as plain strings.
  const less = (a: unknown, b: unknown) =>
    typeof a === "number" && typeof b === "number"
      ? a < b
      : a instanceof Date && b instanceof Date
        ? a.getTime() < b.getTime()
        : String(a) < String(b);
  const consider = (v: unknown) => {
    if (v == null || v === "") return;
    const scalar = typeof v === "number" || v instanceof Date;
    if (scalar || rc.type === "date") {
      if (min === undefined || less(v, min)) min = v;
      if (max === undefined || less(max, v)) max = v;
      if (scalar) return;
    }
    const s = String(v);
    if (longest.length < 3) longest.push(s);
    else {
      let shortest = 0;
      for (let i = 1; i < longest.length; i++) if (longest[i].length < longest[shortest].length) shortest = i;
      if (s.length > longest[shortest].length) longest[shortest] = s;
    }
  };
  for (const row of rows) consider(accessor(rc.col, row));
  const out = longest.map(show);
  if (min !== undefined) out.push(show(min));
  if (max !== undefined) out.push(show(max));
  return out;
}

/** One entry of the virtual list: a group header, a row, or the detail panel under an expanded row. */
export type DataTableListItem<Row> = DataTableGroupItem<Row> | { kind: "detail"; row: Row; index: number };

export interface DataTableModel<Row> {
  props: DataTableProps<Row>;
  columns: ResolvedColumn<Row>[];
  /** The shown columns, in order. */
  visible: ResolvedColumn<Row>[];
  template: ResolvedTemplate;
  /** Left offset per rendered cell (selection first), `undefined` when not sticky. */
  stickyLeft: (number | undefined)[];
  /** Index (in rendered cells) of the last sticky cell, or -1. */
  lastSticky: number;
  /** Cells per row: the shown columns plus the selection column. */
  cellCount: number;

  query: string;
  setQuery: (q: string) => void;
  searching: boolean;
  filterValues: FilterValues;
  setFilterValues: (v: FilterValues) => void;
  activeTab: string;
  setActiveTab: (key: string) => void;
  tabCounts: Record<string, number>;
  sort: SortState;
  toggleSort: (key: string) => void;

  columnPicker: boolean;
  isVisible: (key: string) => boolean;
  setVisible: (key: string, visible: boolean) => void;

  runExport: (kind: "csv" | "pdf") => void;

  /** Rows in view (search, filters, tabs), sorted and pinned. */
  sorted: Row[];
  /** The rows on screen: `sorted`, or its first `rowCap` while capped. */
  shown: Row[];
  /** With a `rowCap` the rows exceed: whether all show, and the toggle. Null otherwise. */
  cap: { showingAll: boolean; toggle: () => void } | null;
  /** The virtual list when grouped or a row is expanded; null for the plain list of `shown`. */
  listItems: DataTableListItem<Row>[] | null;
  grouped: boolean;
  groupCount: number;
  toggleGroup: (key: string | null) => void;

  expandable: boolean;
  canExpandRow: (row: Row) => boolean;
  isExpanded: (row: Row) => boolean;
  toggleExpanded: (row: Row) => void;

  selectable: boolean;
  rowId: (row: Row) => string;
  isSelected: (row: Row) => boolean;
  /** Selected rows in view. */
  selectedRows: Row[];
  headerCheck: CheckState;
  toggleAllInView: () => void;
  toggleRow: (row: Row, on: boolean, range: boolean) => void;
  clearSelection: () => void;

  /** Totals over the rows in view, or null without `totals`. */
  totals: Record<string, unknown> | null;
  /** Index into `visible` where "Total" goes, or -1. */
  totalLabelAt: number;

  /** Content-sized columns (no `width`, not sticky) whose rendered cells the card measures. */
  growable: ReadonlySet<string>;
  /** Widens content-sized columns to what their rendered cells need (grow-only). */
  growColumns: (need: Readonly<Record<string, number>>) => void;
}

const useIsomorphicLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;
const NO_GROUPS: ReadonlySet<string | null> = new Set();

export function useDataTableModel<Row>(props: DataTableProps<Row>): DataTableModel<Row> {
  const {
    columns,
    rows,
    getRowId,
    initialSort,
    sort: sortProp,
    onSortChange,
    manualSort = false,
    searchKeys,
    query: queryProp,
    defaultQuery,
    onQueryChange,
    filters,
    filterValues: filterValuesProp,
    defaultFilterValues,
    onFilterValuesChange,
    tabs,
    defaultTab,
    tab: tabProp,
    onTabChange,
    exportFilename,
    pdfTitle,
    pdfSubtitle,
    columnPicker: columnPickerProp,
    tableId,
    columnVisibility,
    onColumnVisibilityChange,
    selectable = false,
    selected,
    defaultSelected,
    onSelectedChange,
    totals: totalsProp,
    groupBy,
    compareGroups,
    defaultCollapsedGroups,
    collapsedGroups,
    onCollapsedGroupsChange,
    searchActive = false,
    getRowPin,
    rowCap,
    renderExpanded,
    canExpand,
    expanded,
    defaultExpanded,
    onExpandedChange,
  } = props;

  // Each piece of view state is the table's own unless the caller passes it
  // (controlled); either way a change is reported.
  const [ownQuery, setOwnQuery] = React.useState(defaultQuery ?? "");
  const query = queryProp ?? ownQuery;
  const setQuery = (q: string) => {
    if (queryProp === undefined) setOwnQuery(q);
    onQueryChange?.(q);
  };
  const [ownSort, setOwnSort] = React.useState<SortState>(initialSort ?? null);
  const sort = sortProp !== undefined ? sortProp : ownSort;
  const [ownFilterValues, setOwnFilterValues] = React.useState<FilterValues>(defaultFilterValues ?? {});
  const filterValues = filterValuesProp ?? ownFilterValues;
  const setFilterValues = (v: FilterValues) => {
    if (filterValuesProp === undefined) setOwnFilterValues(v);
    onFilterValuesChange?.(v);
  };
  const [ownTab, setOwnTab] = React.useState(defaultTab ?? tabs?.[0]?.key ?? "");
  const activeTab = tabProp ?? ownTab;
  const setActiveTab = (key: string) => {
    if (tabProp === undefined) setOwnTab(key);
    onTabChange?.(key);
  };

  /* ---- columns ---- */

  // `exportOnly` columns never reach the screen: only search and export read them.
  const shownColumns = React.useMemo(() => columns.filter((c) => !c.exportOnly), [columns]);
  const resolved = React.useMemo<ResolvedColumn<Row>[]>(() => {
    const sample = rows.slice(0, 20);
    return shownColumns.map((col, i) => {
      const numericValues = looksNumeric(sample.map((r) => accessor(col, r)));
      const type = col.type;
      // `align` wins; then the type. Untyped, only a PLAIN numeric column (no
      // `render`) aligns right: a number shown as stars or a chip keeps left.
      const align = col.align ?? (type ? alignForType(type) : !col.render && numericValues ? "right" : "left");
      return {
        col,
        key: col.key,
        type,
        align,
        first: col.sortFirst ?? firstSortOrder(type, numericValues),
        sortable: isSortable(col),
        text: align === "left" && (type === undefined || type === "text"),
        locked: i === 0 || !!col.sticky || col.hideable === false,
      };
    });
  }, [shownColumns, rows]);
  const byKey = React.useMemo(() => new Map(resolved.map((c) => [c.key, c])), [resolved]);

  /* ---- column visibility ---- */

  const columnPicker = columnPickerProp ?? (tableId != null || columnVisibility != null);
  const [savedVisibility, setSavedVisibility] = React.useState<Record<string, boolean> | undefined>(undefined);
  // Read after mount, before paint: the server has no storage, so reading it
  // during render would mismatch hydration.
  useIsomorphicLayoutEffect(() => {
    if (!tableId) return;
    try {
      setSavedVisibility(parseVisibility(window.localStorage.getItem(visibilityStorageKey(tableId))));
    } catch {
      // Storage blocked (private mode, sandboxed frame): the defaults stand.
    }
  }, [tableId]);
  const visibilityState = columnVisibility ?? savedVisibility;
  const visibilityColumns = React.useMemo(
    () => resolved.map((c) => ({ key: c.key, locked: c.locked, defaultHidden: c.col.defaultHidden })),
    [resolved],
  );
  const shownKeys = React.useMemo(() => visibleColumnKeys(visibilityColumns, visibilityState), [visibilityColumns, visibilityState]);
  const visible = React.useMemo(() => resolved.filter((c) => shownKeys.has(c.key)), [resolved, shownKeys]);
  const setVisible = (key: string, show: boolean) => {
    const next = setColumnVisible(visibilityColumns, visibilityState, key, show);
    if (!columnVisibility) {
      setSavedVisibility(next);
      if (tableId) {
        try {
          window.localStorage.setItem(visibilityStorageKey(tableId), JSON.stringify(next));
        } catch {
          // Storage full or blocked: the choice lasts for this visit only.
        }
      }
    }
    onColumnVisibilityChange?.(next);
  };

  /* ---- search → facets → tab → sort ---- */

  const searchCols = React.useMemo(
    () => (searchKeys ? columns.filter((c) => searchKeys.includes(c.key)) : columns),
    [columns, searchKeys],
  );
  const matchSearch = props.matchSearch;
  const searched = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    if (matchSearch) return rows.filter((row) => matchSearch(row, query.trim()));
    return rows.filter((row) =>
      searchCols.some((c) => {
        const v = accessor(c, row);
        return v != null && String(v).toLowerCase().includes(q);
      }),
    );
  }, [rows, searchCols, query, matchSearch]);
  const faceted = React.useMemo(() => {
    if (!filters || filters.length === 0) return searched;
    return searched.filter((r) => rowMatchesFilters(r, filters, filterValues));
  }, [searched, filters, filterValues]);
  // Tab counts reflect search + facets.
  const tabCounts = React.useMemo(() => {
    const out: Record<string, number> = {};
    if (tabs) for (const t of tabs) out[t.key] = t.filter ? faceted.filter(t.filter).length : faceted.length;
    return out;
  }, [tabs, faceted]);
  const tabbed = React.useMemo(() => {
    const t = tabs?.find((x) => x.key === activeTab);
    return t?.filter ? faceted.filter(t.filter) : faceted;
  }, [faceted, tabs, activeTab]);
  const ordered = React.useMemo(() => {
    if (!sort || manualSort) return tabbed;
    const rc = byKey.get(sort.key);
    if (!rc) return tabbed;
    const value = rc.col.sortValue ?? ((row: Row) => accessor(rc.col, row));
    return sortRows(tabbed, value, sort.order);
  }, [tabbed, sort, byKey, manualSort]);
  // Pinned rows hold the top or the bottom whatever the sort.
  const sorted = React.useMemo(() => {
    if (!getRowPin) return ordered;
    const top: Row[] = [];
    const middle: Row[] = [];
    const bottom: Row[] = [];
    for (const row of ordered) {
      const pin = getRowPin(row);
      (pin === "top" ? top : pin === "bottom" ? bottom : middle).push(row);
    }
    return top.length || bottom.length ? [...top, ...middle, ...bottom] : ordered;
  }, [ordered, getRowPin]);

  const toggleSort = (key: string) => {
    const first = byKey.get(key)?.first ?? "asc";
    const next = nextSort(sort, key, first);
    if (sortProp === undefined) setOwnSort(next);
    onSortChange?.(next);
  };

  /* ---- the row cap ---- */

  const [showAll, setShowAll] = React.useState(false);
  const overCap = rowCap != null && rowCap >= 0 && sorted.length > rowCap;
  const shown = React.useMemo(() => (overCap && !showAll ? sorted.slice(0, rowCap) : sorted), [overCap, showAll, sorted, rowCap]);
  const cap = overCap ? { showingAll: showAll, toggle: () => setShowAll((v) => !v) } : null;

  /* ---- grouping ---- */

  const [collapsed, setCollapsed] = React.useState<ReadonlySet<string | null>>(() => new Set(defaultCollapsedGroups));
  const controlledSet = React.useMemo(() => (collapsedGroups ? new Set(collapsedGroups) : undefined), [collapsedGroups]);
  // While a search is active every match shows, collapsed or not: the saved set
  // is set aside and the toggles rest until it ends.
  const searching = query.trim() !== "" || searchActive;
  const shownCollapsed = collapsedFor(searching, controlledSet ?? collapsed, NO_GROUPS);
  const groupedItems = React.useMemo(
    () => (groupBy ? groupItems(shown, groupBy, shownCollapsed, compareGroups) : null),
    [shown, groupBy, shownCollapsed, compareGroups],
  );
  const groupCount = React.useMemo(() => (groupedItems ? groupedItems.filter((i) => i.kind === "group").length : 0), [groupedItems]);
  const toggleGroup = React.useCallback(
    (key: string | null) => {
      if (searching) return;
      if (controlledSet) onCollapsedGroupsChange?.([...toggled(controlledSet, key)]);
      else setCollapsed((prev) => toggled(prev, key));
    },
    [searching, controlledSet, onCollapsedGroupsChange],
  );

  /* ---- selection ---- */

  // Ids are fixed per row object (its index in `rows` when there's no getRowId),
  // so sorting and filtering never reassign them.
  const getRowIdRef = React.useRef(getRowId);
  getRowIdRef.current = getRowId;
  const expandable = renderExpanded != null;
  const ids = React.useMemo(() => {
    const m = new Map<Row, string>();
    if (!selectable && !expandable) return m;
    rows.forEach((r, i) => m.set(r, getRowIdRef.current ? getRowIdRef.current(r, i) : String(i)));
    return m;
  }, [rows, selectable, expandable]);
  const rowId = React.useCallback((row: Row) => ids.get(row) ?? "", [ids]);

  /* ---- expanded rows ---- */

  const [ownExpanded, setOwnExpanded] = React.useState<ReadonlySet<string>>(() => new Set(defaultExpanded));
  const expandedSet = React.useMemo<ReadonlySet<string>>(() => (expanded ? new Set(expanded) : ownExpanded), [expanded, ownExpanded]);
  const canExpandRow = (row: Row) => expandable && (canExpand ? canExpand(row) : true);
  const isExpanded = (row: Row) => expandable && expandedSet.has(ids.get(row) ?? "") && (canExpand ? canExpand(row) : true);
  const toggleExpanded = (row: Row) => {
    const next = toggled(expandedSet, ids.get(row) ?? "");
    if (!expanded) setOwnExpanded(next);
    onExpandedChange?.([...next]);
  };
  // The virtual list: group headers and rows, and a detail panel after each expanded row.
  const canExpandRef = React.useRef(canExpand);
  canExpandRef.current = canExpand;
  const listItems = React.useMemo<DataTableListItem<Row>[] | null>(() => {
    if (!expandable || expandedSet.size === 0) return groupedItems;
    const base: DataTableGroupItem<Row>[] = groupedItems ?? shown.map((row, index) => ({ kind: "row", row, index }));
    const out: DataTableListItem<Row>[] = [];
    for (const item of base) {
      out.push(item);
      if (item.kind !== "row") continue;
      const open = expandedSet.has(ids.get(item.row) ?? "") && (canExpandRef.current ? canExpandRef.current(item.row) : true);
      if (open) out.push({ kind: "detail", row: item.row, index: item.index });
    }
    return out;
  }, [expandable, expandedSet, groupedItems, shown, ids]);
  const [ownSelection, setOwnSelection] = React.useState<ReadonlySet<string>>(() => new Set(defaultSelected));
  const selectedSet = React.useMemo<ReadonlySet<string>>(() => (selected ? new Set(selected) : ownSelection), [selected, ownSelection]);
  const commitSelection = (next: Set<string>) => {
    if (!selected) setOwnSelection(next);
    onSelectedChange?.([...next]);
  };
  const viewIds = React.useMemo(() => (selectable ? sorted.map((r) => ids.get(r) ?? "") : []), [selectable, sorted, ids]);
  // Shift-click ranges follow what's on screen: collapsed groups are skipped.
  const orderIds = React.useMemo(() => {
    if (!selectable) return [];
    if (!listItems) return shown === sorted ? viewIds : shown.map((r) => ids.get(r) ?? "");
    const out: string[] = [];
    for (const item of listItems) if (item.kind === "row") out.push(ids.get(item.row) ?? "");
    return out;
  }, [selectable, listItems, viewIds, ids, shown, sorted]);
  const selectedRows = React.useMemo(
    () => (selectable && selectedSet.size ? sorted.filter((r) => selectedSet.has(ids.get(r) ?? "")) : []),
    [selectable, selectedSet, sorted, ids],
  );
  const headerCheck = selectable ? checkState(viewIds, selectedSet) : "none";
  const anchor = React.useRef<string | null>(null);
  const toggleRow = (row: Row, on: boolean, range: boolean) => {
    const id = ids.get(row) ?? "";
    commitSelection(range ? selectRange(orderIds, anchor.current, id, on, selectedSet) : toggleOne(id, on, selectedSet));
    anchor.current = id;
  };
  const toggleAllInView = () => commitSelection(toggleAll(viewIds, selectedSet));
  const clearSelection = () => {
    anchor.current = null;
    commitSelection(new Set());
  };

  /* ---- totals ---- */

  const totalDefs = React.useMemo(() => {
    if (!totalsProp) return null;
    return resolved
      .filter((c) => totalsProp[c.key])
      .map((c) => ({ key: c.key, total: totalsProp[c.key], value: (row: Row) => accessor(c.col, row) }));
  }, [resolved, totalsProp]);
  const totals = React.useMemo(() => (totalDefs ? computeTotals(totalDefs, sorted) : null), [totalDefs, sorted]);
  const totalLabelAt = totals
    ? totalLabelIndex(visible.map((c) => ({ text: c.text, hasTotal: c.key in totals })))
    : -1;

  /* ---- the one column template ---- */

  // A content-sized track is estimated from the formatted values, but a
  // `render` can show more (cents, a unit, stars and a count). The card
  // measures the rendered cells and reports what they need: tracks only ever
  // grow, so a number never loses a digit to the estimate and the columns
  // never jitter.
  const [grown, setGrown] = React.useState<Readonly<Record<string, number>>>({});
  const growColumns = React.useCallback((need: Readonly<Record<string, number>>) => {
    setGrown((prev) => {
      let next: Record<string, number> | null = null;
      for (const [key, px] of Object.entries(need)) if (px > (prev[key] ?? 0)) (next ??= { ...prev })[key] = px;
      return next ?? prev;
    });
  }, []);
  const contentSized = (rc: ResolvedColumn<Row>) => rc.align === "right" || rc.type === "date" || rc.type === "status";
  // Keyed by the joined keys: a fresh `columns` array each render keeps the same set.
  const growableKeys = visible
    .filter((rc) => contentSized(rc) && rc.col.width == null && !rc.col.sticky)
    .map((rc) => rc.key)
    .join("\u0000");
  const growable = React.useMemo<ReadonlySet<string>>(() => new Set(growableKeys ? growableKeys.split("\u0000") : []), [growableKeys]);

  const grouped = !!groupBy;
  // What sizes the columns. Callers often pass a fresh `columns` array each
  // render; keyed on this instead, the template (which scans every row) is
  // only rebuilt when something that sizes it changes.
  const sizingKey = JSON.stringify([
    visible.map((c) => [c.key, c.col.header, c.type, c.align, c.sortable, c.col.width, c.col.minWidth, c.col.maxWidth, c.col.headerSuffix != null, !!c.col.render, !!c.col.format]),
    totalsProp ? Object.keys(totalsProp).filter((k) => totalsProp[k] === "sum") : null,
    grouped,
    selectable,
    expandable,
    grown,
  ]);
  const template = React.useMemo(() => {
    // The widest a sum gets is over every row; sizing from it keeps the column
    // from jumping as filters change the total.
    const sums = totalDefs ? computeTotals(totalDefs.filter((d) => d.total === "sum"), rows) : null;
    const specs: TrackSpec[] = visible.map((rc, i) => {
      const sizing: TrackSpec["sizing"] = contentSized(rc) ? "content" : "flex";
      const measured = sizing === "content" ? grown[rc.key] : undefined;
      return {
        label: rc.col.header,
        sortable: rc.sortable,
        hasSuffix: rc.col.headerSuffix != null,
        width: rc.col.width,
        minWidth: measured != null ? Math.max(rc.col.minWidth ?? 0, measured) : rc.col.minWidth,
        maxWidth: rc.col.maxWidth,
        sizing,
        samples: sizing === "content" ? widthSamples(rc, rows) : undefined,
        strongSamples: sums && rc.key in sums ? [showForWidth(rc, sums[rc.key])] : undefined,
        weight: i === 0 ? 500 : 400,
        // A rendered status is a badge: 8px of padding each side.
        extra: rc.type === "status" && rc.col.render ? 16 : rc.type === "date" ? 6 : 0,
        // Grouped rows sit under the group label, and an expandable row's text
        // after its chevron: 16 + chevron + gap = 36.
        indent: i === 0 ? (grouped && !selectable ? 20 : 0) + (expandable ? 20 : 0) : 0,
      };
    });
    return resolveTemplate(specs, { selection: selectable });
    // `visible` and `totalDefs` are read through `sizingKey`.
  }, [sizingKey, rows]);

  const { stickyLeft, lastSticky } = React.useMemo(() => {
    const anySticky = visible.some((c) => c.col.sticky);
    // With a pinned identity column the checkbox column pins too, or the
    // checkboxes would scroll away from the rows they select.
    const flags = [...(selectable ? [anySticky] : []), ...visible.map((c) => !!c.col.sticky)];
    const left = stickyOffsets(flags, template.fixed);
    let last = -1;
    left.forEach((l, i) => {
      if (l !== undefined) last = i;
    });
    return { stickyLeft: left, lastSticky: last };
  }, [visible, selectable, template]);

  /* ---- export ---- */

  // The shown columns plus the export-only ones, in the order given, less any
  // `exportable: false`; each with its export header and value.
  const runExport = (kind: "csv" | "pdf") => {
    const shownByKey = new Map(visible.map((c) => [c.key, c]));
    const out = exportColumns(columns, new Set(shownByKey.keys()))
      .map((col) => ({ col, align: shownByKey.get(col.key)?.align ?? (col.align ?? (col.type ? alignForType(col.type) : "left")) }));
    const headers = out.map((c) => c.col.exportHeader ?? c.col.header);
    const data = sorted.map((row) => out.map((c) => (c.col.exportValue ? c.col.exportValue(row) : accessor(c.col, row))));
    const align = out.map((c) => c.align);
    if (kind === "csv") downloadCsv(headers, data, exportFilename ?? "export");
    else void downloadPdf(headers, data, { filename: exportFilename ?? "export", title: pdfTitle, subtitle: pdfSubtitle, align });
  };

  return {
    props,
    columns: resolved,
    visible,
    template,
    stickyLeft,
    lastSticky,
    cellCount: visible.length + (selectable ? 1 : 0),
    query,
    setQuery,
    searching,
    filterValues,
    setFilterValues,
    activeTab,
    setActiveTab,
    tabCounts,
    sort,
    toggleSort,
    columnPicker,
    isVisible: (key) => shownKeys.has(key),
    setVisible,
    runExport,
    sorted,
    shown,
    cap,
    listItems,
    grouped,
    groupCount,
    toggleGroup,
    expandable,
    canExpandRow,
    isExpanded,
    toggleExpanded,
    selectable,
    rowId,
    isSelected: (row) => selectedSet.has(ids.get(row) ?? ""),
    selectedRows,
    headerCheck,
    toggleAllInView,
    toggleRow,
    clearSelection,
    totals,
    totalLabelAt,
    growable,
    growColumns,
  };
}

/* ---------- context ---------- */

// The context is untyped by row: the pieces never touch a row's fields.
export const DataTableContext = React.createContext<DataTableModel<any> | null>(null);

/** The surrounding table's model. Toolbar pieces call it; outside a table it throws. */
export function useDataTableModelContext(component: string): DataTableModel<unknown> {
  const model = React.useContext(DataTableContext);
  if (!model) throw new Error(`<${component}> must sit inside a <DataTableProvider> (or a <DataTable>).`);
  return model;
}
