// Row grouping for DataTable — pure, so the order and collapse rules are
// unit-tested without rendering (tests/data-table-grouping.test.mjs). Type
// stripping loads this file as-is: keep it erasable-syntax only, no imports.

/** One group of rows under a header row. `key: null` is the catch-all group. */
export type DataTableGroup<Row> = { key: string | null; rows: readonly Row[]; collapsed: boolean };

/**
 * The flat virtual list: a header row per group, then (if open) its rows. A row
 * item carries `index`, its place in the sorted list — what `getRowId` is given
 * — so an id stays put when a group above it collapses.
 */
export type DataTableGroupItem<Row> =
  | { kind: "group"; group: DataTableGroup<Row> }
  | { kind: "row"; row: Row; index: number };

// A group plus where each of its rows sat in the sorted list. `indexes` is ours:
// consumers see a `DataTableGroup`, and never need it.
export type IndexedGroup<Row> = DataTableGroup<Row> & { indexes: readonly number[] };

// Partitions rows that are already searched, filtered and sorted. Groups are
// born from rows, so an empty group never exists; rows keep their incoming
// order inside a group, which is how a column sort applies within groups.
export function partitionRows<Row>(
  rows: readonly Row[],
  groupBy: (row: Row) => string | null | undefined,
  collapsed: ReadonlySet<string | null>,
  compareGroups?: (a: DataTableGroup<Row>, b: DataTableGroup<Row>) => number,
): IndexedGroup<Row>[] {
  const byKey = new Map<string | null, { key: string | null; rows: Row[]; collapsed: boolean; indexes: number[] }>();
  rows.forEach((row, index) => {
    // "" and undefined mean "no parent" just like null: a nameless header would
    // be useless, and the catch-all is where those rows belong.
    const key = groupBy(row) || null;
    let group = byKey.get(key);
    if (!group) {
      group = { key, rows: [], collapsed: collapsed.has(key), indexes: [] };
      byKey.set(key, group);
    }
    group.rows.push(row);
    group.indexes.push(index);
  });
  // Map keeps insertion order, so the default is "first appearance in the
  // sorted rows" — sort by due date and POs order by their earliest line. The
  // catch-all always trails and is never handed to the comparator.
  const ungrouped = byKey.get(null);
  byKey.delete(null);
  const groups: IndexedGroup<Row>[] = [...byKey.values()];
  if (compareGroups) groups.sort(compareGroups);
  if (ungrouped) groups.push(ungrouped);
  return groups;
}

// A collapsed group contributes only its header, so the virtualizer never
// measures or renders the rows it hides.
export function flattenGroups<Row>(groups: readonly IndexedGroup<Row>[]): DataTableGroupItem<Row>[] {
  const items: DataTableGroupItem<Row>[] = [];
  for (const group of groups) {
    items.push({ kind: "group", group });
    if (!group.collapsed) group.rows.forEach((row, i) => items.push({ kind: "row", row, index: group.indexes[i] }));
  }
  return items;
}

// No `groupBy` is the plain list — one row item per row, nothing else.
export function groupItems<Row>(
  rows: readonly Row[],
  groupBy: ((row: Row) => string | null | undefined) | undefined,
  collapsed: ReadonlySet<string | null>,
  compareGroups?: (a: DataTableGroup<Row>, b: DataTableGroup<Row>) => number,
): DataTableGroupItem<Row>[] {
  if (!groupBy) return rows.map((row, index) => ({ kind: "row", row, index }));
  return flattenGroups(partitionRows(rows, groupBy, collapsed, compareGroups));
}

// Search reveals its matches: a hit inside a collapsed group would read as "no
// result". While a query is active the saved collapse is set aside for a set of
// its own (empty to start), and toggles made meanwhile land in that one, so the
// saved state is untouched when the query clears.
export function collapsedFor<Key>(
  searching: boolean,
  saved: ReadonlySet<Key>,
  duringSearch: ReadonlySet<Key>,
): ReadonlySet<Key> {
  return searching ? duringSearch : saved;
}

// Never mutates: React state holds the previous set, and a memo keyed on it
// must see a new one.
export function toggled<Key>(set: ReadonlySet<Key>, key: Key): Set<Key> {
  const next = new Set(set);
  if (!next.delete(key)) next.add(key);
  return next;
}
