// Needs Node >= 22.18 (type stripping): it imports grouping.ts as-is, no build.
import test from 'node:test';
import assert from 'node:assert/strict';
// Node strips the types, so this runs the real helper, not a copy of it.
import { partitionRows, flattenGroups, groupItems, collapsedFor, toggled } from '../src/components/data-table/grouping.ts';

const line = (id, po, due) => ({ id, po, due });
// Already searched, filtered and sorted by due date — what DataTable hands over.
const rows = [
 line('a1', 'PO-2', '2026-10-01'),
 line('a2', 'PO-1', '2026-10-02'),
 line('a3', null, '2026-10-03'),
 line('a4', 'PO-2', '2026-10-04'),
 line('a5', 'PO-3', '2026-10-05'),
 line('a6', 'PO-1', '2026-10-06'),
];
const po = row => row.po;
const none = new Set();
const shape = items => items.map(i => (i.kind === 'group' ? `[${i.group.key}${i.group.collapsed ? ' closed' : ''}]` : i.row.id));

test('rows land in their group, in the order they came in', () => {
 const groups = partitionRows(rows, po, none);
 assert.deepEqual(groups.map(g => [g.key, g.rows.map(r => r.id)]), [
  ['PO-2', ['a1', 'a4']],
  ['PO-1', ['a2', 'a6']],
  ['PO-3', ['a5']],
  [null, ['a3']],
 ]);
 assert.ok(groups.every(g => g.collapsed === false));
});

test('default order is first appearance in the sorted rows, so due date orders the POs', () => {
 assert.deepEqual(partitionRows(rows, po, none).map(g => g.key), ['PO-2', 'PO-1', 'PO-3', null]);
 const latestFirst = [...rows].reverse();
 assert.deepEqual(partitionRows(latestFirst, po, none).map(g => g.key), ['PO-1', 'PO-3', 'PO-2', null]);
});

test('compareGroups sets the order', () => {
 const byKey = (a, b) => a.key.localeCompare(b.key);
 assert.deepEqual(partitionRows(rows, po, none, byKey).map(g => g.key), ['PO-1', 'PO-2', 'PO-3', null]);
 // Smallest first; the tie between PO-2 and PO-1 keeps first-appearance order.
 const fewestLines = (a, b) => a.rows.length - b.rows.length;
 assert.deepEqual(partitionRows(rows, po, none, fewestLines).map(g => g.key), ['PO-3', 'PO-2', 'PO-1', null]);
});

test('the null group is always last and never reaches the comparator', () => {
 const nullFirst = [line('n1', null, '2026-09-01'), ...rows];
 assert.deepEqual(partitionRows(nullFirst, po, none).map(g => g.key), ['PO-2', 'PO-1', 'PO-3', null]);
 const seen = [];
 const reversed = (a, b) => (seen.push(a.key, b.key), b.key.localeCompare(a.key));
 assert.deepEqual(partitionRows(nullFirst, po, none, reversed).map(g => g.key), ['PO-3', 'PO-2', 'PO-1', null]);
 assert.ok(!seen.includes(null));
 assert.equal(partitionRows(nullFirst, po, none).at(-1).rows.length, 2);
});

test('an empty string or undefined joins the null group; there is no blank-named group', () => {
 const blank = [line('b1', '', '2026-10-01'), line('b2', undefined, '2026-10-02'), line('b3', null, '2026-10-03'), line('b4', 'PO-1', '2026-10-04')];
 const groups = partitionRows(blank, po, none);
 assert.deepEqual(groups.map(g => [g.key, g.rows.map(r => r.id)]), [['PO-1', ['b4']], [null, ['b1', 'b2', 'b3']]]);
 // The collapse set keys on the normalised key, so null collapses all three.
 assert.equal(partitionRows(blank, po, new Set([null]))[1].collapsed, true);
});

test('a collapsed group contributes only its header', () => {
 const groups = partitionRows(rows, po, new Set(['PO-1', null]));
 assert.deepEqual(groups.map(g => g.collapsed), [false, true, false, true]);
 assert.deepEqual(shape(flattenGroups(groups)), ['[PO-2]', 'a1', 'a4', '[PO-1 closed]', '[PO-3]', 'a5', '[null closed]']);
 // Collapsed groups keep their rows, so a header can still summarise them.
 assert.deepEqual(groups[1].rows.map(r => r.id), ['a2', 'a6']);
});

test('collapsing one group leaves the others alone', () => {
 const open = shape(groupItems(rows, po, none));
 const one = shape(groupItems(rows, po, new Set(['PO-3'])));
 assert.deepEqual(open, ['[PO-2]', 'a1', 'a4', '[PO-1]', 'a2', 'a6', '[PO-3]', 'a5', '[null]', 'a3']);
 assert.deepEqual(one, ['[PO-2]', 'a1', 'a4', '[PO-1]', 'a2', 'a6', '[PO-3 closed]', '[null]', 'a3']);
});

test('collapse state is keyed by group, so it survives a re-sort and a group leaving the list', () => {
 const closed = new Set(['PO-1']);
 const resorted = [...rows].reverse();
 assert.deepEqual(shape(groupItems(resorted, po, closed)), ['[PO-1 closed]', '[PO-3]', 'a5', '[PO-2]', 'a4', 'a1', '[null]', 'a3']);
 const filtered = rows.filter(r => r.po !== 'PO-1');
 assert.deepEqual(shape(groupItems(filtered, po, closed)), ['[PO-2]', 'a1', 'a4', '[PO-3]', 'a5', '[null]', 'a3']);
 assert.deepEqual(shape(groupItems(rows, po, closed)).filter(s => s.includes('PO-1')), ['[PO-1 closed]']);
});

test('a column sort orders rows within each group', () => {
 const latestFirst = [...rows].sort((a, b) => b.due.localeCompare(a.due));
 const items = groupItems(latestFirst, po, none);
 assert.deepEqual(shape(items), ['[PO-1]', 'a6', 'a2', '[PO-3]', 'a5', '[PO-2]', 'a4', 'a1', '[null]', 'a3']);
});

test('empty groups never render', () => {
 assert.deepEqual(groupItems([], po, none), []);
 assert.deepEqual(partitionRows([], po, new Set(['PO-1'])), []);
 const onlyPo3 = rows.filter(r => r.po === 'PO-3');
 assert.deepEqual(shape(groupItems(onlyPo3, po, new Set(['PO-1']))), ['[PO-3]', 'a5']);
});

test('no groupBy is the plain list: one row item per row, in order, no headers', () => {
 const items = groupItems(rows, undefined, new Set(['PO-1']));
 assert.equal(items.length, rows.length);
 assert.ok(items.every((item, i) => item.kind === 'row' && item.row === rows[i] && item.index === i));
});

test('a row item carries its index in the sorted list, whatever is collapsed above it', () => {
 const indexes = items => items.filter(i => i.kind === 'row').map(i => [i.row.id, i.index]);
 assert.deepEqual(indexes(groupItems(rows, po, none)), [['a1', 0], ['a4', 3], ['a2', 1], ['a6', 5], ['a5', 4], ['a3', 2]]);
 // PO-2 and PO-1 collapse: the rows below keep the index they have in the flat list.
 assert.deepEqual(indexes(groupItems(rows, po, new Set(['PO-2', 'PO-1']))), [['a5', 4], ['a3', 2]]);
 // Each row's index points back at that row.
 assert.ok(groupItems(rows, po, none).every(i => i.kind === 'group' || rows[i.index] === i.row));
});

test('items carry the group itself for renderGroupHeader', () => {
 const [first] = groupItems(rows, po, none);
 assert.equal(first.kind, 'group');
 assert.deepEqual(first.group.rows.map(r => r.id), ['a1', 'a4']);
});

test('search sets the saved collapse aside: matches in a collapsed group show', () => {
 const saved = new Set(['PO-1', null]);
 const duringSearch = new Set();
 assert.equal(collapsedFor(false, saved, duringSearch), saved);
 assert.equal(collapsedFor(true, saved, duringSearch), duringSearch);
 const open = shape(groupItems(rows, po, collapsedFor(true, saved, duringSearch)));
 assert.deepEqual(open, ['[PO-2]', 'a1', 'a4', '[PO-1]', 'a2', 'a6', '[PO-3]', 'a5', '[null]', 'a3']);
});

test('a toggle made during a search stays out of the saved collapse', () => {
 const saved = new Set(['PO-1']);
 let duringSearch = new Set();
 duringSearch = toggled(duringSearch, 'PO-2');
 assert.deepEqual(shape(groupItems(rows, po, collapsedFor(true, saved, duringSearch))).slice(0, 4), ['[PO-2 closed]', '[PO-1]', 'a2', 'a6']);
 // The query clears: the search-only set goes, and the saved state is back as it was.
 assert.deepEqual([...saved], ['PO-1']);
 assert.deepEqual(shape(groupItems(rows, po, collapsedFor(false, saved, new Set()))).slice(0, 4), ['[PO-2]', 'a1', 'a4', '[PO-1 closed]']);
});

test('a controlled collapse is a key list: a toggle hands back the next list, null included', () => {
 const keys = ['PO-1', null];
 const saved = new Set(keys);
 assert.deepEqual([...toggled(saved, 'PO-2')], ['PO-1', null, 'PO-2']);
 assert.deepEqual([...toggled(saved, null)], ['PO-1']);
 assert.deepEqual(keys, ['PO-1', null]);
 // The same keys collapse the same groups as the table's own state would, ...
 assert.deepEqual(shape(groupItems(rows, po, collapsedFor(false, saved, new Set()))).filter(s => s.includes('closed')), ['[PO-1 closed]', '[null closed]']);
 // ... and a search sets them aside just the same (the consumer never hears of that toggle).
 assert.deepEqual(shape(groupItems(rows, po, collapsedFor(true, saved, new Set()))).filter(s => s.includes('closed')), []);
});

test('toggled flips one key and never mutates the set it was given', () => {
 const before = new Set(['a']);
 const added = toggled(before, 'b');
 assert.deepEqual([...before], ['a']);
 assert.deepEqual([...added], ['a', 'b']);
 assert.deepEqual([...toggled(added, 'a')], ['b']);
 assert.deepEqual([...toggled(new Set(), null)], [null]);
});
