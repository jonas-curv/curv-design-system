// The table's pure rules: column types, alignment, sort order, the one shared
// column template, edge padding, selection, column visibility and totals.
// Unit-tested without rendering (tests/data-table-layout.test.mjs). Node's type
// stripping loads this file as-is: keep it erasable syntax only, and import
// types only (an `import type` is erased; a runtime import would not resolve).

import type { DataTableColumnType } from "./format";

export type ColumnAlign = "left" | "right";
export type SortOrder = "asc" | "desc";
export type SortState = { key: string; order: SortOrder } | null;

const NUMERIC: ReadonlySet<string> = new Set(["number", "money", "percent"]);

/** Numbers, money and percentages are numeric: right-aligned, tabular, descending first. */
export function isNumericType(type: DataTableColumnType | undefined): boolean {
  return type != null && NUMERIC.has(type);
}

/** Numbers right; text, status and dates left. */
export function alignForType(type: DataTableColumnType): ColumnAlign {
  return isNumericType(type) ? "right" : "left";
}

/**
 * The direction a first click sorts: numbers and dates high to low (the big
 * deal, the latest date), text A to Z. An untyped column follows its values.
 */
export function firstSortOrder(type: DataTableColumnType | undefined, numericValues = false): SortOrder {
  if (type) return isNumericType(type) || type === "date" ? "desc" : "asc";
  return numericValues ? "desc" : "asc";
}

/** First click sorts `first`, the second flips it, the third clears. */
export function nextSort(prev: SortState, key: string, first: SortOrder): SortState {
  if (prev?.key !== key) return { key, order: first };
  if (prev.order === first) return { key, order: first === "asc" ? "desc" : "asc" };
  return null;
}

/**
 * Whether a column gets a sort button. On by default, except a column with an
 * empty header (an icon or actions column): its button would have no name. It
 * sorts only with an explicit `sortable: true` and an `ariaLabel` to name it.
 */
export function isSortable(col: { header: string; sortable?: boolean; ariaLabel?: string }): boolean {
  if (col.header.trim() !== "") return col.sortable ?? true;
  return col.sortable === true && !!col.ariaLabel?.trim();
}

/** Whether most sampled non-empty values are numbers (an untyped column's guess). */
export function looksNumeric(values: readonly unknown[]): boolean {
  let seen = 0;
  let numeric = 0;
  for (const v of values) {
    if (v == null || v === "") continue;
    seen++;
    if (typeof v === "number") numeric++;
  }
  return seen > 0 && numeric >= seen * 0.7;
}

const isEmpty = (v: unknown) => v == null || v === "";

/** Numbers by value, dates by time, everything else as text with numeric collation. */
export function compareCells(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

/** A stable sort; empty values always last, whichever the direction. */
export function sortRows<Row>(rows: readonly Row[], value: (row: Row) => unknown, order: SortOrder): Row[] {
  const dir = order === "asc" ? 1 : -1;
  const keyed = rows.map((row, i) => ({ row, v: value(row), i }));
  keyed.sort((x, y) => {
    const xe = isEmpty(x.v);
    const ye = isEmpty(y.v);
    if (xe || ye) return xe === ye ? x.i - y.i : xe ? 1 : -1;
    return compareCells(x.v, y.v) * dir || x.i - y.i;
  });
  return keyed.map((k) => k.row);
}

/* ---------- widths ---------- */

// Inter advance widths in em, close enough to size a column without measuring
// the DOM (the template must be the same on the server and the client). Digits
// are tabular. Unknown glyphs count as 0.62em.
const EM: Record<string, number> = {
  a: 0.56, b: 0.6, c: 0.54, d: 0.6, e: 0.57, f: 0.35, g: 0.6, h: 0.59, i: 0.25, j: 0.26,
  k: 0.54, l: 0.25, m: 0.88, n: 0.59, o: 0.59, p: 0.6, q: 0.6, r: 0.38, s: 0.51, t: 0.36,
  u: 0.59, v: 0.54, w: 0.79, x: 0.53, y: 0.54, z: 0.51,
  A: 0.68, B: 0.65, C: 0.71, D: 0.71, E: 0.59, F: 0.57, G: 0.73, H: 0.74, I: 0.28, J: 0.51,
  K: 0.65, L: 0.54, M: 0.87, N: 0.74, O: 0.75, P: 0.63, Q: 0.75, R: 0.65, S: 0.62, T: 0.61,
  U: 0.72, V: 0.67, W: 0.98, X: 0.66, Y: 0.64, Z: 0.61,
  " ": 0.27, ".": 0.27, ",": 0.27, ":": 0.28, ";": 0.28, "'": 0.21, '"': 0.4, "!": 0.29,
  "?": 0.51, "-": 0.42, "−": 0.62, "–": 0.62, "—": 1, "$": 0.62, "%": 0.84,
  "/": 0.38, "(": 0.34, ")": 0.34, "&": 0.69, "#": 0.67, "+": 0.62, "·": 0.28, "…": 0.8,
};
for (let d = 0; d <= 9; d++) EM[String(d)] = 0.62;

/** Estimated rendered width of `text` in Inter at `size` px (500 runs a touch wider). */
export function textWidth(text: string, size: number, weight = 400): number {
  let em = 0;
  for (const ch of text) em += EM[ch] ?? 0.62;
  const bold = weight >= 600 ? 1.06 : weight >= 500 ? 1.03 : 1;
  return Math.ceil(em * size * bold * 1.04);
}

/** Cell padding: 12 per side, 16 on the table's outer edges. */
export function edgePadding(index: number, count: number): { left: number; right: number; className: string } {
  const first = index === 0;
  const last = index === count - 1;
  if (first && last) return { left: 16, right: 16, className: "px-4" };
  if (first) return { left: 16, right: 12, className: "pl-4 pr-3" };
  if (last) return { left: 12, right: 16, className: "pl-3 pr-4" };
  return { left: 12, right: 12, className: "px-3" };
}

/** Width of the selection (checkbox) column. */
export const SELECT_COLUMN_WIDTH = 40;
/** The sort arrow's reserved slot: a 12px icon and a 4px gap. */
export const SORT_SLOT = 16;
/** Room for a `headerSuffix` (an info trigger, a drag handle). */
const SUFFIX_SLOT = 20;
/** The floor of a text column that sets no `minWidth`. */
const TEXT_FLOOR = 120;

export interface TrackSpec {
  /** The column's header label (12px / 500). The track is never narrower than it. */
  label: string;
  sortable: boolean;
  hasSuffix?: boolean;
  /** The caller's width: px, or a CSS track (`"240px"`, `"1.5fr"`, `"minmax(220px,1.6fr)"`). */
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  /**
   * Without a `width`: `content` is a fixed px track wide enough for the longest
   * `samples` (numbers, dates, statuses); `flex` shares the slack (text).
   */
  sizing: "content" | "flex";
  /** The longest formatted cell texts (13px). */
  samples?: readonly string[];
  /** Texts set in 600 (the totals row), measured at that weight. */
  strongSamples?: readonly string[];
  /** Weight of the cell text. Default 400. */
  weight?: number;
  /** Px a cell needs beyond its text (a badge's own padding). */
  extra?: number;
  /** Extra left padding on body cells (the indent under a group header). */
  indent?: number;
}

export interface ResolvedTemplate {
  /** One track per column, the selection column first when present. */
  tracks: string[];
  /** `tracks` joined: the `grid-template-columns` every row shares. */
  template: string;
  /** The sum of every track's minimum: below it the table scrolls sideways. */
  minWidth: number;
  /** Px width of each fixed track, `undefined` for a flexible one (sticky offsets need it). */
  fixed: (number | undefined)[];
}

type Parsed = { px: number } | { min: number; fr: number } | { min: number; max: number } | { fr: number } | null;

function parseTrack(width: number | string | undefined): Parsed {
  if (typeof width === "number") return Number.isFinite(width) ? { px: width } : null;
  if (typeof width !== "string") return null;
  const w = width.replace(/\s+/g, "");
  let m = /^(\d+(?:\.\d+)?)px$/.exec(w);
  if (m) return { px: Number(m[1]) };
  m = /^(\d+(?:\.\d+)?)fr$/.exec(w);
  if (m) return { fr: Number(m[1]) };
  m = /^minmax\((\d+(?:\.\d+)?)px,(\d+(?:\.\d+)?)fr\)$/.exec(w);
  if (m) return { min: Number(m[1]), fr: Number(m[2]) };
  m = /^minmax\((\d+(?:\.\d+)?)px,(\d+(?:\.\d+)?)px\)$/.exec(w);
  if (m) return { min: Number(m[1]), max: Number(m[2]) };
  // Content-sized tracks (auto, max-content, fit-content) would let each row's
  // grid resolve its own widths, and the columns would drift. Ignored.
  return null;
}

/**
 * One column template for the header, every row, the skeleton, group rows and
 * totals: px or `minmax(px, fr)` only, never a content-sized track, so every
 * grid resolves the same widths. Numbers size to their longest formatted value
 * (they never truncate); text shares the slack and truncates past its floor;
 * no column is narrower than its header label.
 */
export function resolveTemplate(specs: readonly TrackSpec[], options: { selection?: boolean } = {}): ResolvedTemplate {
  const lead = options.selection ? 1 : 0;
  const count = specs.length + lead;
  const tracks: string[] = [];
  const fixed: (number | undefined)[] = [];
  let minWidth = 0;
  if (lead) {
    tracks.push(`${SELECT_COLUMN_WIDTH}px`);
    fixed.push(SELECT_COLUMN_WIDTH);
    minWidth += SELECT_COLUMN_WIDTH;
  }
  specs.forEach((spec, i) => {
    const pad = edgePadding(i + lead, count);
    const padX = pad.left + pad.right;
    const labelMin =
      textWidth(spec.label, 12, 500) + (spec.sortable ? SORT_SLOT : 0) + (spec.hasSuffix ? SUFFIX_SLOT : 0) + padX;
    const fix = (px: number) => {
      const w = Math.ceil(px);
      tracks.push(`${w}px`);
      fixed.push(w);
      minWidth += w;
    };
    const flex = (min: number, max: string) => {
      const lo = Math.ceil(min);
      tracks.push(`minmax(${lo}px,${max})`);
      fixed.push(undefined);
      minWidth += lo;
    };
    const parsed = parseTrack(spec.width);
    if (parsed && "px" in parsed) return fix(Math.max(parsed.px, labelMin));
    if (parsed && "min" in parsed && "fr" in parsed) return flex(Math.max(parsed.min, labelMin), `${parsed.fr}fr`);
    if (parsed && "max" in parsed) {
      const lo = Math.max(parsed.min, labelMin);
      return flex(lo, `${Math.ceil(Math.max(parsed.max, lo))}px`);
    }
    if (parsed && "fr" in parsed) return flex(Math.max(spec.minWidth ?? TEXT_FLOOR, labelMin), `${parsed.fr}fr`);
    if (spec.sizing === "content") {
      let content = 0;
      for (const s of spec.samples ?? []) content = Math.max(content, textWidth(s, 13, spec.weight ?? 400));
      for (const s of spec.strongSamples ?? []) content = Math.max(content, textWidth(s, 13, 600));
      const cell = content + (spec.extra ?? 0) + padX + (spec.indent ?? 0);
      return fix(Math.max(spec.minWidth ?? 0, labelMin, cell));
    }
    const lo = Math.max(spec.minWidth ?? TEXT_FLOOR, labelMin);
    return flex(lo, spec.maxWidth != null ? `${Math.ceil(Math.max(spec.maxWidth, lo))}px` : "1fr");
  });
  return { tracks, template: tracks.join(" "), minWidth, fixed };
}

/**
 * Left offsets for sticky columns: each one sits after the fixed widths of the
 * sticky columns before it. A sticky column after a flexible one has no known
 * offset (`undefined`) and is left in the flow.
 */
export function stickyOffsets(sticky: readonly boolean[], fixed: readonly (number | undefined)[]): (number | undefined)[] {
  let acc: number | undefined = 0;
  return sticky.map((isSticky, i) => {
    if (!isSticky) return undefined;
    const left = acc;
    const w = fixed[i];
    acc = acc === undefined || w === undefined ? undefined : acc + w;
    return left;
  });
}

/* ---------- selection ---------- */

export type CheckState = "none" | "some" | "all";

/** The select-all checkbox over the rows in view. */
export function checkState(ids: readonly string[], selected: ReadonlySet<string>): CheckState {
  let n = 0;
  for (const id of ids) if (selected.has(id)) n++;
  if (n === 0) return "none";
  return n === ids.length ? "all" : "some";
}

/** Select-all covers every row in view (filtered, not just rendered); a second click clears them. */
export function toggleAll(ids: readonly string[], selected: ReadonlySet<string>): Set<string> {
  const next = new Set(selected);
  if (checkState(ids, selected) === "all") for (const id of ids) next.delete(id);
  else for (const id of ids) next.add(id);
  return next;
}

/** One row on or off. */
export function toggleOne(id: string, on: boolean, selected: ReadonlySet<string>): Set<string> {
  const next = new Set(selected);
  if (on) next.add(id);
  else next.delete(id);
  return next;
}

/**
 * Shift-click: every row between the anchor (the last row clicked) and the
 * target takes the target's new state. Without a usable anchor it is a plain toggle.
 */
export function selectRange(
  order: readonly string[],
  anchor: string | null,
  target: string,
  on: boolean,
  selected: ReadonlySet<string>,
): Set<string> {
  const a = anchor == null ? -1 : order.indexOf(anchor);
  const b = order.indexOf(target);
  if (a < 0 || b < 0) return toggleOne(target, on, selected);
  const next = new Set(selected);
  for (let i = Math.min(a, b); i <= Math.max(a, b); i++) {
    if (on) next.add(order[i]);
    else next.delete(order[i]);
  }
  return next;
}

/* ---------- column visibility ---------- */

export interface VisibilityColumn {
  key: string;
  /** The identity column and sticky columns can never be hidden. */
  locked?: boolean;
  defaultHidden?: boolean;
}

/** Shown column keys: a saved choice wins, then `defaultHidden`; locked columns always show. */
export function visibleColumnKeys(columns: readonly VisibilityColumn[], state: Readonly<Record<string, boolean>> | undefined): Set<string> {
  const out = new Set<string>();
  for (const c of columns) {
    const choice = state?.[c.key];
    if (c.locked || (choice ?? !c.defaultHidden)) out.add(c.key);
  }
  return out;
}

/** The next visibility state after a toggle. Locked columns don't move. */
export function setColumnVisible(
  columns: readonly VisibilityColumn[],
  state: Readonly<Record<string, boolean>> | undefined,
  key: string,
  visible: boolean,
): Record<string, boolean> {
  const col = columns.find((c) => c.key === key);
  const next = { ...(state ?? {}) };
  if (!col || col.locked) return next;
  next[key] = visible;
  return next;
}

/** Reads a stored visibility state; anything malformed reads as nothing saved. */
export function parseVisibility(raw: string | null | undefined): Record<string, boolean> | undefined {
  if (!raw) return undefined;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    const out: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) if (typeof v === "boolean") out[k] = v;
    return out;
  } catch {
    return undefined;
  }
}

/** The localStorage key a table's column choices live under. */
export function visibilityStorageKey(tableId: string): string {
  return `curv.data-table.${tableId}.columns`;
}

/* ---------- export ---------- */

export interface ExportColumnSpec {
  key: string;
  /** Default true: false leaves the column out of the export (row actions). */
  exportable?: boolean;
  /** Never on screen, always in the export (a raw id, an email). */
  exportOnly?: boolean;
}

/** The export's columns: the shown ones plus the export-only ones, in column order, less `exportable: false`. */
export function exportColumns<C extends ExportColumnSpec>(columns: readonly C[], shown: ReadonlySet<string>): C[] {
  return columns.filter((c) => c.exportable !== false && (c.exportOnly === true || shown.has(c.key)));
}

/* ---------- totals ---------- */

/** `"sum"` adds the column's numeric values; a function computes its own from the rows. */
export type TotalSpec<Row> = "sum" | ((rows: readonly Row[]) => unknown);

/** Sums the numbers; `null` when there are none (the cell then shows "—"). */
export function sumValues(values: Iterable<unknown>): number | null {
  let sum = 0;
  let any = false;
  for (const v of values) {
    if (typeof v === "number" && Number.isFinite(v)) {
      sum += v;
      any = true;
    }
  }
  return any ? sum : null;
}

/** Each column's total over `rows` (the filtered set, so totals follow search, filters and tabs). */
export function computeTotals<Row>(
  columns: readonly { key: string; total?: TotalSpec<Row>; value: (row: Row) => unknown }[],
  rows: readonly Row[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of columns) {
    if (!c.total) continue;
    out[c.key] = c.total === "sum" ? sumValues(rows.map(c.value)) : c.total(rows);
  }
  return out;
}

/** Where "Total" goes: the first text column that has no total of its own; -1 if none. */
export function totalLabelIndex(columns: readonly { text: boolean; hasTotal: boolean }[]): number {
  return columns.findIndex((c) => c.text && !c.hasTotal);
}
