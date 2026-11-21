// The table's pure rules, run from source with Node's type stripping (no build):
// the shared column template, type alignment, sort order, selection, column
// visibility, totals and the number formats.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
 alignForType,
 firstSortOrder,
 isSortable,
 nextSort,
 looksNumeric,
 sortRows,
 textWidth,
 edgePadding,
 resolveTemplate,
 stickyOffsets,
 checkState,
 toggleAll,
 toggleOne,
 selectRange,
 visibleColumnKeys,
 setColumnVisible,
 parseVisibility,
 visibilityStorageKey,
 sumValues,
 computeTotals,
 totalLabelIndex,
} from '../src/components/data-table/layout.ts';
import { MINUS, EMPTY, formatMoney, formatNumber, formatPercent, formatDate, formatValue } from '../src/components/data-table/format.ts';

/* ---------- the column template ---------- */

const text = (label, extra = {}) => ({ label, sortable: true, sizing: 'flex', ...extra });
const num = (label, samples, extra = {}) => ({ label, sortable: true, sizing: 'content', samples, ...extra });

test('every track is px or minmax(px, fr): never content-sized', () => {
 const { tracks, template } = resolveTemplate([
  text('Deal', { minWidth: 240 }),
  text('Customer', { width: 180 }),
  num('Value', ['$48,200', '$6,120']),
  text('Note', { width: 'max-content' }),
  text('Owner', { width: 'minmax(220px,1.6fr)' }),
  text('Region', { width: '2fr' }),
 ], { selection: true });
 for (const t of tracks) assert.match(t, /^(\d+px|minmax\(\d+px,(\d+(\.\d+)?fr|\d+px)\))$/, t);
 assert.equal(template, tracks.join(' '));
 assert.equal(tracks[0], '40px');
 assert.ok(!template.includes('content') && !template.includes('auto'));
});

test('a numeric column is as wide as its longest formatted value, never less', () => {
 const narrow = resolveTemplate([num('Value', ['$9'])]).fixed[0];
 const wide = resolveTemplate([num('Value', ['$1,234,567'])]).fixed[0];
 assert.ok(wide > narrow);
 // The cell text plus its padding fits inside the track.
 const { fixed } = resolveTemplate([text('Deal'), num('Value', ['$1,234,567']), text('Owner')]);
 assert.ok(fixed[1] >= textWidth('$1,234,567', 13) + 24);
 // A total in 600 widens it.
 const bold = resolveTemplate([text('Deal'), num('Value', ['$1,234,567'], { strongSamples: ['$12,345,678'] }), text('Owner')]).fixed[1];
 assert.ok(bold >= textWidth('$12,345,678', 13, 600) + 24);
});

test('no column is narrower than its header label (sort slot and padding included)', () => {
 const { tracks, fixed } = resolveTemplate([
  text('Deal'),
  num('Balance outstanding', ['$1']),
  text('Customer', { width: 40 }),
  text('A very long text column label', { minWidth: 60, maxWidth: 80 }),
 ]);
 const label = (s) => textWidth(s, 12, 500) + 16;
 assert.ok(fixed[1] >= label('Balance outstanding') + 24);
 assert.ok(fixed[2] >= label('Customer') + 24, 'an explicit width is raised to the label');
 const min = Number(/minmax\((\d+)px/.exec(tracks[3])[1]);
 assert.ok(min >= label('A very long text column label') + 28, 'the last column has 16 on its outer edge');
});

test('text columns share the slack; maxWidth caps them; minWidth floors them', () => {
 const { tracks, minWidth } = resolveTemplate([
  text('Deal', { minWidth: 280 }),
  text('Note', { maxWidth: 200 }),
  text('Tag'),
 ]);
 assert.equal(tracks[0], 'minmax(280px,1fr)');
 assert.match(tracks[1], /^minmax\(120px,200px\)$/);
 assert.equal(tracks[2], 'minmax(120px,1fr)');
 assert.equal(minWidth, 280 + 120 + 120);
});

test('edge padding: 16 on the outer edges, 12 inside', () => {
 assert.deepEqual([0, 1, 2].map((i) => edgePadding(i, 3).className), ['pl-4 pr-3', 'px-3', 'pl-3 pr-4']);
 assert.equal(edgePadding(0, 1).className, 'px-4');
 assert.deepEqual(edgePadding(0, 3), { left: 16, right: 12, className: 'pl-4 pr-3' });
});

test('sticky offsets add up the fixed widths before each pinned column', () => {
 assert.deepEqual(stickyOffsets([true, true, false], [40, 220, undefined]), [0, 40, undefined]);
 // After a flexible sticky column the next offset is unknown.
 assert.deepEqual(stickyOffsets([true, true], [undefined, 100]), [0, undefined]);
});

/* ---------- type → alignment and sort ---------- */

test('numbers, money and percent align right; text, status and dates left', () => {
 assert.deepEqual(['number', 'money', 'percent'].map(alignForType), ['right', 'right', 'right']);
 assert.deepEqual(['text', 'status', 'date'].map(alignForType), ['left', 'left', 'left']);
});

test('numbers and dates sort high to low first, text A to Z; untyped follows its values', () => {
 assert.deepEqual(['number', 'money', 'percent', 'date'].map((t) => firstSortOrder(t)), ['desc', 'desc', 'desc', 'desc']);
 assert.deepEqual(['text', 'status'].map((t) => firstSortOrder(t)), ['asc', 'asc']);
 assert.equal(firstSortOrder(undefined, true), 'desc');
 assert.equal(firstSortOrder(undefined, false), 'asc');
 assert.ok(looksNumeric([1, 2, null, 3]));
 assert.ok(!looksNumeric(['a', 2, 'b']));
 assert.ok(!looksNumeric([null, '']));
});

test('a header cycles first → opposite → cleared; another header starts over', () => {
 let s = null;
 s = nextSort(s, 'value', 'desc');
 assert.deepEqual(s, { key: 'value', order: 'desc' });
 s = nextSort(s, 'value', 'desc');
 assert.deepEqual(s, { key: 'value', order: 'asc' });
 assert.equal(nextSort(s, 'value', 'desc'), null);
 assert.deepEqual(nextSort({ key: 'value', order: 'asc' }, 'name', 'asc'), { key: 'name', order: 'asc' });
});

test('an empty header has no sort button unless it opts in with a name', () => {
 assert.equal(isSortable({ header: 'Deal' }), true);
 assert.equal(isSortable({ header: 'Deal', sortable: false }), false);
 assert.equal(isSortable({ header: '' }), false, 'a button with no name');
 assert.equal(isSortable({ header: '  ' }), false);
 assert.equal(isSortable({ header: '', ariaLabel: 'Flag' }), false, 'a name alone does not opt in');
 assert.equal(isSortable({ header: '', sortable: true }), false, 'opting in still needs a name');
 assert.equal(isSortable({ header: '', sortable: true, ariaLabel: ' ' }), false);
 assert.equal(isSortable({ header: '', sortable: true, ariaLabel: 'Flag' }), true);
});

test('sortRows: stable, numeric and natural, empties last in both directions', () => {
 const rows = [{ v: 10 }, { v: null }, { v: 2 }, { v: '' }, { v: 33 }, { v: 2, t: 'second' }];
 assert.deepEqual(sortRows(rows, (r) => r.v, 'asc').map((r) => r.v), [2, 2, 10, 33, null, '']);
 assert.deepEqual(sortRows(rows, (r) => r.v, 'desc').map((r) => r.v), [33, 10, 2, 2, null, '']);
 assert.equal(sortRows(rows, (r) => r.v, 'asc')[1].t, 'second', 'equal values keep their order');
 const names = [{ n: 'PO-10' }, { n: 'PO-9' }, { n: 'po-1' }];
 assert.deepEqual(sortRows(names, (r) => r.n, 'asc').map((r) => r.n), ['po-1', 'PO-9', 'PO-10']);
 const dates = [{ d: '2026-01-05' }, { d: '2025-12-31' }, { d: '2026-11-21' }];
 assert.deepEqual(sortRows(dates, (r) => r.d, 'desc').map((r) => r.d), ['2026-11-21', '2026-01-05', '2025-12-31']);
});

/* ---------- selection ---------- */

test('select-all covers every row in view and clears them on the second click', () => {
 const view = ['a', 'b', 'c'];
 assert.equal(checkState(view, new Set()), 'none');
 assert.equal(checkState(view, new Set(['b'])), 'some');
 assert.equal(checkState(view, new Set(['a', 'b', 'c', 'z'])), 'all');
 const all = toggleAll(view, new Set(['b', 'z']));
 assert.deepEqual([...all].sort(), ['a', 'b', 'c', 'z'], 'a row out of view keeps its selection');
 assert.deepEqual([...toggleAll(view, all)], ['z']);
 assert.equal(checkState([], new Set()), 'none');
});

test('one row on and off', () => {
 assert.deepEqual([...toggleOne('a', true, new Set())], ['a']);
 assert.deepEqual([...toggleOne('a', false, new Set(['a', 'b']))], ['b']);
});

test('shift-click sets every row between the anchor and the target, either direction', () => {
 const order = ['a', 'b', 'c', 'd', 'e'];
 assert.deepEqual([...selectRange(order, 'b', 'd', true, new Set(['b']))].sort(), ['b', 'c', 'd']);
 assert.deepEqual([...selectRange(order, 'e', 'c', true, new Set())].sort(), ['c', 'd', 'e']);
 assert.deepEqual([...selectRange(order, 'a', 'c', false, new Set(['a', 'b', 'c', 'd']))], ['d']);
 // No anchor (or one no longer in view): a plain toggle.
 assert.deepEqual([...selectRange(order, null, 'c', true, new Set())], ['c']);
 assert.deepEqual([...selectRange(order, 'gone', 'c', true, new Set())], ['c']);
});

/* ---------- column visibility ---------- */

const cols = [{ key: 'deal', locked: true }, { key: 'stage' }, { key: 'owner', defaultHidden: true }, { key: 'value' }];

test('visibility: saved choices win, then defaultHidden; the identity column always shows', () => {
 assert.deepEqual([...visibleColumnKeys(cols, undefined)], ['deal', 'stage', 'value']);
 assert.deepEqual([...visibleColumnKeys(cols, { owner: true, stage: false, deal: false })], ['deal', 'owner', 'value']);
 const next = setColumnVisible(cols, {}, 'deal', false);
 assert.deepEqual(next, {}, 'a locked column does not move');
 assert.deepEqual(setColumnVisible(cols, { stage: false }, 'value', false), { stage: false, value: false });
});

test('a stored visibility state is read defensively', () => {
 assert.deepEqual(parseVisibility('{"stage":false,"owner":true,"x":"yes"}'), { stage: false, owner: true });
 assert.equal(parseVisibility('not json'), undefined);
 assert.equal(parseVisibility('[1,2]'), undefined);
 assert.equal(parseVisibility(null), undefined);
 assert.equal(visibilityStorageKey('deals'), 'curv.data-table.deals.columns');
});

/* ---------- totals ---------- */

test('totals: "sum" adds the numbers in view; a function computes its own', () => {
 const rows = [{ v: 10, n: 'a' }, { v: null, n: 'b' }, { v: -2.5, n: 'c' }];
 const totals = computeTotals(
  [
   { key: 'v', total: 'sum', value: (r) => r.v },
   { key: 'n', total: (rs) => `${rs.length} rows`, value: (r) => r.n },
   { key: 'x', value: () => 1 },
  ],
  rows,
 );
 assert.deepEqual(totals, { v: 7.5, n: '3 rows' });
 assert.equal(sumValues([null, undefined, 'x']), null, 'no numbers → no total');
 assert.equal(sumValues([0, 0]), 0);
});

test('"Total" goes in the first text column without a total of its own', () => {
 assert.equal(totalLabelIndex([{ text: true, hasTotal: false }, { text: false, hasTotal: true }]), 0);
 assert.equal(totalLabelIndex([{ text: false, hasTotal: false }, { text: true, hasTotal: true }, { text: true, hasTotal: false }]), 2);
 assert.equal(totalLabelIndex([{ text: false, hasTotal: true }]), -1);
});

/* ---------- number formats ---------- */

test('money: whole dollars, a real minus sign, no parentheses, $0 for zero, — for nothing', () => {
 assert.equal(formatMoney(48200), '$48,200');
 assert.equal(formatMoney(48200.6), '$48,201');
 assert.equal(formatMoney(-1240), `${MINUS}$1,240`);
 assert.equal(MINUS, '−');
 assert.equal(formatMoney(0), '$0');
 assert.equal(formatMoney(-0.4), '$0', 'rounds to zero without a sign');
 assert.equal(formatMoney(null), EMPTY);
 assert.equal(formatMoney(undefined), '—');
 assert.equal(formatMoney(1234.5, { cents: true }), '$1,234.50');
 assert.ok(!formatMoney(-5).includes('('));
});

test('numbers and percentages', () => {
 assert.equal(formatNumber(1240), '1,240');
 assert.equal(formatNumber(-1240), `${MINUS}1,240`);
 assert.equal(formatNumber(0), '0');
 assert.equal(formatNumber(NaN), EMPTY);
 assert.equal(formatNumber(3.14159, { decimals: 2 }), '3.14');
 assert.equal(formatPercent(12.5), '12.5%');
 assert.equal(formatPercent(12), '12.0%');
 assert.equal(formatPercent(-3), `${MINUS}3.0%`);
 assert.equal(formatPercent(0), '0%');
 assert.equal(formatPercent(0.125, { ratio: true }), '12.5%');
 assert.equal(formatPercent(null), EMPTY);
});

test('dates: month and day this year, the year otherwise; a date-only ISO string is a calendar day', () => {
 const today = new Date(2026, 10, 21);
 assert.equal(formatDate('2026-11-21', { today }), 'Nov 21');
 assert.equal(formatDate('2025-12-09', { today }), 'Dec 9, 2025');
 assert.equal(formatDate(new Date(2027, 0, 6), { today }), 'Jan 6, 2027');
 assert.equal(formatDate(null, { today }), EMPTY);
 assert.equal(formatDate('soon', { today }), 'soon');
});

test('formatValue picks the format by type and leaves text alone', () => {
 assert.equal(formatValue('money', -5), `${MINUS}$5`);
 assert.equal(formatValue('percent', 50), '50.0%');
 assert.equal(formatValue('number', 7), '7');
 assert.equal(formatValue('status', 'Late'), 'Late');
 assert.equal(formatValue('text', 42), '42');
 assert.equal(formatValue('money', '$5'), '$5', 'a string passes through');
 assert.equal(formatValue(undefined, null), EMPTY);
});
