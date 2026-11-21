// DataTable's 0.6.0 additions for the app kits' adapters (TABLE-KITS.md), in a
// real (happy-dom) DOM built from dist/: controlled and manual sort, a column's
// first direction and sort value, controlled search / filters / tab, row
// classes, pinned rows, a row cap with "Show all", expandable rows and the
// export columns. The 0.5 API is covered by data-table-dom.test.mjs, unchanged.
import './dom-setup.mjs';
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { createRoot } from 'react-dom/client';
import * as ds from '../dist/index.js';
import { exportColumns } from '../src/components/data-table/layout.ts';

const h = React.createElement;
const { act } = React;

Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get() { return 600; } });
Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get() { return 1000; } });

const mounted = [];
async function mount(node) {
 const container = document.createElement('div');
 document.body.append(container);
 const root = createRoot(container);
 await act(async () => { root.render(node); });
 const view = { container, root, render: async (next) => { await act(async () => { root.render(next); }); } };
 mounted.push(view);
 return view;
}
afterEach(async () => {
 for (const view of mounted.splice(0)) await act(async () => { view.root.unmount(); });
 document.body.innerHTML = '';
 localStorage.clear();
});
const click = async (el) => { await act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); }); };
const type = async (input, value) => {
 await act(async () => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
 });
};

const ROWS = [
 { id: 'a', deal: 'Keychains', stage: 'Proposal', rank: 3, quarter: 'Q4 2026', qd: 20264, value: 48200, owner: 'ana@x.co' },
 { id: 'b', deal: 'Wallets', stage: 'Sampling', rank: 1, quarter: 'Q1 2027', qd: 20271, value: 31750, owner: 'ben@x.co' },
 { id: 'c', deal: 'Lanyards', stage: 'Late', rank: 4, quarter: 'Q3 2026', qd: 20263, value: 22400, owner: 'cy@x.co' },
 { id: 'd', deal: 'Bottle openers', stage: 'Proposal', rank: 2, quarter: 'Q2 2027', qd: 20272, value: 7450, owner: 'di@x.co' },
];
const COLUMNS = [
 { key: 'deal', header: 'Deal', minWidth: 240 },
 { key: 'stage', header: 'Stage', type: 'status' },
 { key: 'rank', header: 'Rank', type: 'number', sortFirst: 'asc' },
 { key: 'quarter', header: 'Quarter', sortValue: (r) => r.qd, sortFirst: 'desc' },
 { key: 'value', header: 'Value', type: 'money' },
];
const table = (props = {}) => h(ds.DataTable, { columns: COLUMNS, rows: ROWS, getRowId: (r) => r.id, 'aria-label': 'Deals', unit: 'deals', ...props });

const q = (c, sel) => c.querySelector(sel);
const qa = (c, sel) => [...c.querySelectorAll(sel)];
const headers = (c) => qa(c, '[role=columnheader]');
const header = (c, name) => headers(c).find((el) => el.textContent.trim() === name);
const bodyRows = (c) => qa(c, '[role=rowgroup] > [role=row]').filter((r) => !r.id.includes('-detail-'));
const firstCells = (c) => bodyRows(c).map((r) => qa(r, '[role=cell]').find((cell) => !q(cell, '[role=checkbox]')).textContent);
const footer = (c) => q(c, '[role=status]').textContent;
const button = (c, text) => qa(c, 'button').find((b) => b.textContent.trim() === text);

/* ---------- sort ---------- */

test('controlled sort: the table shows `sort` and reports the next state, first direction, flipped, cleared', async () => {
 const seen = [];
 const onSortChange = (s) => seen.push(s);
 const { container, render } = await mount(table({ sort: { key: 'value', order: 'desc' }, onSortChange }));
 assert.equal(header(container, 'Value').getAttribute('aria-sort'), 'descending');
 assert.deepEqual(firstCells(container), ['Keychains', 'Wallets', 'Lanyards', 'Bottle openers']);
 await click(q(header(container, 'Value'), 'button'));
 assert.deepEqual(seen.at(-1), { key: 'value', order: 'asc' });
 assert.equal(header(container, 'Value').getAttribute('aria-sort'), 'descending', 'nothing moves until the owner passes it back');
 await render(table({ sort: { key: 'value', order: 'asc' }, onSortChange }));
 await click(q(header(container, 'Value'), 'button'));
 assert.equal(seen.at(-1), null, 'the third click clears');
 await render(table({ sort: null, onSortChange }));
 assert.equal(header(container, 'Value').getAttribute('aria-sort'), 'none');
 assert.deepEqual(firstCells(container), ['Keychains', 'Wallets', 'Lanyards', 'Bottle openers']);
});

test('manualSort: rows stay in the order given (the server sorted them), the header still shows the sort', async () => {
 const { container } = await mount(table({ sort: { key: 'deal', order: 'asc' }, manualSort: true }));
 assert.equal(header(container, 'Deal').getAttribute('aria-sort'), 'ascending');
 assert.deepEqual(firstCells(container), ['Keychains', 'Wallets', 'Lanyards', 'Bottle openers']);
});

test('uncontrolled sort still works, and onSortChange reports it', async () => {
 const seen = [];
 const { container } = await mount(table({ onSortChange: (s) => seen.push(s) }));
 await click(q(header(container, 'Value'), 'button'));
 assert.deepEqual(seen, [{ key: 'value', order: 'desc' }]);
 assert.equal(header(container, 'Value').getAttribute('aria-sort'), 'descending');
 assert.equal(firstCells(container)[0], 'Keychains');
});

test('a column sortFirst overrides the type (a rank sorts 1 first); sortValue sorts by another value', async () => {
 const { container } = await mount(table());
 await click(q(header(container, 'Rank'), 'button'));
 assert.equal(header(container, 'Rank').getAttribute('aria-sort'), 'ascending');
 assert.deepEqual(firstCells(container), ['Wallets', 'Bottle openers', 'Keychains', 'Lanyards']);
 await click(q(header(container, 'Quarter'), 'button'));
 assert.equal(header(container, 'Quarter').getAttribute('aria-sort'), 'descending');
 assert.deepEqual(firstCells(container), ['Bottle openers', 'Wallets', 'Keychains', 'Lanyards'], 'by the quarter date, not the label');
});

/* ---------- search, filters, tab ---------- */

test('controlled search: `query` filters, typing reports it; defaultQuery seeds it; searchLabel names the box', async () => {
 const seen = [];
 const { container, render } = await mount(table({ searchable: true, query: 'wall', onQueryChange: (v) => seen.push(v), searchLabel: 'Search deals' }));
 const input = q(container, 'input[placeholder]');
 assert.equal(input.getAttribute('aria-label'), 'Search deals');
 assert.equal(input.value, 'wall');
 assert.deepEqual(firstCells(container), ['Wallets']);
 await type(input, 'key');
 assert.deepEqual(seen, ['key']);
 assert.deepEqual(firstCells(container), ['Wallets'], 'held until the owner passes it back');
 await render(table({ searchable: true, query: 'key', onQueryChange: (v) => seen.push(v) }));
 assert.deepEqual(firstCells(container), ['Keychains']);
 const other = await mount(table({ searchable: true, defaultQuery: 'lany' }));
 assert.deepEqual(firstCells(other.container), ['Lanyards']);
 assert.equal(q(other.container, 'input[placeholder]').getAttribute('aria-label'), 'Search…', 'the placeholder by default');
});

test('matchSearch replaces the built-in match (every word, any order)', async () => {
 const words = (r, query) => query.toLowerCase().split(/\s+/).every((w) => `${r.deal} ${r.stage}`.toLowerCase().includes(w));
 const { container } = await mount(table({ searchable: true, query: 'proposal bottle', matchSearch: words }));
 assert.deepEqual(firstCells(container), ['Bottle openers']);
 const plain = await mount(table({ searchable: true, query: 'proposal bottle' }));
 assert.equal(bodyRows(plain.container).length, 0, 'the built-in match takes the query as one piece');
});

test('controlled filter values and tab', async () => {
 const filters = [{ key: 'stage', label: 'Stage', get: (r) => r.stage, options: [{ value: 'Proposal', label: 'Proposal' }, { value: 'Late', label: 'Late' }] }];
 const tabs = [{ key: 'all', label: 'All' }, { key: 'big', label: 'Over $20k', filter: (r) => r.value > 20000 }];
 const seenTabs = [];
 const { container } = await mount(table({ filters, filterValues: { stage: ['Proposal'] }, tabs, tab: 'big', onTabChange: (k) => seenTabs.push(k) }));
 assert.deepEqual(firstCells(container), ['Keychains'], 'Proposal and over $20k');
 await click(qa(container, '[role=radio]').find((r) => r.textContent.startsWith('All')));
 assert.deepEqual(seenTabs, ['all']);
 assert.deepEqual(firstCells(container), ['Keychains'], 'the tab is the owner’s');
 const own = await mount(table({ filters, defaultFilterValues: { stage: ['Late'] } }));
 assert.deepEqual(firstCells(own.container), ['Lanyards']);
});

/* ---------- rows ---------- */

test('getRowClassName adds classes to a row; the row keeps its own', async () => {
 const { container } = await mount(table({ getRowClassName: (r) => (r.stage === 'Late' ? 'text-muted-foreground' : undefined) }));
 const late = bodyRows(container).find((r) => r.textContent.includes('Lanyards'));
 assert.ok(late.className.includes('text-muted-foreground'));
 assert.ok(late.className.includes('absolute') && late.className.includes('grid') && late.className.includes('group'), 'the row DOM is unchanged');
 assert.ok(!bodyRows(container)[0].className.includes('text-muted-foreground'));
});

test('getRowPin holds rows at the top or the bottom whatever the sort', async () => {
 const getRowPin = (r) => (r.id === 'd' ? 'top' : r.id === 'a' ? 'bottom' : null);
 const { container } = await mount(table({ getRowPin }));
 assert.deepEqual(firstCells(container), ['Bottle openers', 'Wallets', 'Lanyards', 'Keychains']);
 await click(q(header(container, 'Value'), 'button'));
 assert.deepEqual(firstCells(container), ['Bottle openers', 'Wallets', 'Lanyards', 'Keychains']);
 await click(q(header(container, 'Value'), 'button'));
 assert.deepEqual(firstCells(container), ['Bottle openers', 'Lanyards', 'Wallets', 'Keychains']);
});

test('rowCap shows the first N with "Show all" in the footer; totals, select-all and the count cover every row', async () => {
 const { container } = await mount(table({ rowCap: 2, totals: { value: 'sum' }, selectable: true }));
 assert.deepEqual(firstCells(container), ['Keychains', 'Wallets']);
 assert.equal(footer(container), '2 of 4 deals');
 const totalsRow = qa(container, '[role=table] > [role=row]').at(-1);
 assert.match(totalsRow.textContent, /\$109,800/, 'the total is over all four');
 await click(q(headers(container)[0], '[role=checkbox]'));
 assert.equal(footer(container), '4 of 4 selected', 'select-all covers the capped rows too');
 await click(button(container, 'Clear'));
 await click(button(container, 'Show all'));
 assert.equal(bodyRows(container).length, 4);
 assert.equal(footer(container), '4 deals');
 await click(button(container, 'Show fewer'));
 assert.equal(bodyRows(container).length, 2);
});

test('rowCap: no button when the rows fit', async () => {
 const { container } = await mount(table({ rowCap: 10 }));
 assert.equal(button(container, 'Show all'), undefined);
 assert.equal(footer(container), '4 deals');
});

test('expandable rows: a chevron in the first cell, aria-expanded and aria-controls, the panel under its row', async () => {
 const seen = [];
 const { container } = await mount(table({
  renderExpanded: (r) => h('p', { 'data-panel': r.id }, `Lines for ${r.deal}`),
  canExpand: (r) => r.id !== 'c',
  onExpandedChange: (ids) => seen.push(ids),
 }));
 const toggles = qa(container, '[role=rowgroup] button[aria-expanded]');
 assert.equal(toggles.length, 3, 'no chevron where canExpand is false');
 const [first] = toggles;
 assert.equal(first.getAttribute('aria-label'), 'Details for Keychains');
 assert.equal(first.getAttribute('aria-expanded'), 'false');
 assert.equal(q(container, '[data-panel]'), null);
 await click(first);
 assert.deepEqual(seen, [['a']]);
 const open = qa(container, '[role=rowgroup] button[aria-expanded]')[0];
 assert.equal(open.getAttribute('aria-expanded'), 'true');
 const panelRow = container.querySelector(`#${CSS.escape(open.getAttribute('aria-controls'))}`);
 assert.ok(panelRow && panelRow.getAttribute('role') === 'row', 'aria-controls names the panel row');
 assert.equal(q(panelRow, '[role=cell]').getAttribute('aria-colspan'), '5');
 assert.equal(q(panelRow, '[data-panel]').textContent, 'Lines for Keychains');
 const order = qa(container, '[role=rowgroup] > [role=row]');
 assert.equal(order.indexOf(panelRow), order.findIndex((r) => r.textContent.includes('Keychains') && r !== panelRow) + 1, 'right under its row');
 const lanyards = bodyRows(container).find((r) => r.textContent.includes('Lanyards'));
 assert.ok(q(lanyards, '[role=cell] span[aria-hidden]'), 'a spacer keeps the text aligned');
 await click(open);
 assert.equal(q(container, '[data-panel]'), null);
});

test('expandable rows: controlled `expanded`, and defaultExpanded', async () => {
 const render = (r) => h('p', { 'data-panel': r.id }, r.deal);
 const { container } = await mount(table({ renderExpanded: render, expanded: ['b'] }));
 assert.deepEqual(qa(container, '[data-panel]').map((p) => p.dataset.panel), ['b']);
 await click(qa(container, 'button[aria-expanded]')[0]);
 assert.deepEqual(qa(container, '[data-panel]').map((p) => p.dataset.panel), ['b'], 'the owner decides');
 const other = await mount(table({ renderExpanded: render, defaultExpanded: ['a', 'd'] }));
 assert.deepEqual(qa(other.container, '[data-panel]').map((p) => p.dataset.panel), ['a', 'd']);
});

/* ---------- export ---------- */

test('exportOnly columns never render (header, cells, Columns picker, phone cards)', async () => {
 const columns = [...COLUMNS, { key: 'owner', header: 'Owner email', exportOnly: true }];
 const { container } = await mount(table({ columns, tableId: 'deals' }));
 assert.ok(!headers(container).some((x) => x.textContent === 'Owner email'));
 assert.equal(qa(bodyRows(container)[0], '[role=cell]').length, 5);
 assert.ok(!container.textContent.includes('ana@x.co'), 'not on the phone cards either');
});

test('exportColumns: shown plus export-only, in column order, less exportable: false', () => {
 const cols = [
  { key: 'deal' },
  { key: 'actions', exportable: false },
  { key: 'owner', exportOnly: true },
  { key: 'hidden' },
  { key: 'value' },
 ];
 const shown = new Set(['deal', 'actions', 'value']);
 assert.deepEqual(exportColumns(cols, shown).map((c) => c.key), ['deal', 'owner', 'value']);
});

test('the export carries exportHeader, exportValue and export-only columns', async () => {
 const blobs = [];
 const RealBlob = globalThis.Blob;
 const createObjectURL = URL.createObjectURL;
 globalThis.Blob = class extends RealBlob { constructor(parts, opts) { super(parts, opts); blobs.push(parts.join('')); } };
 URL.createObjectURL = () => 'blob:x';
 URL.revokeObjectURL = () => {};
 try {
  const columns = [
   { key: 'deal', header: 'Deal', exportValue: (r) => r.id, exportHeader: 'Deal id' },
   { key: 'value', header: 'Value', type: 'money' },
   { key: 'act', header: '', exportable: false, render: () => h('button', null, 'Edit') },
   { key: 'owner', header: 'Owner email', exportOnly: true },
  ];
  const { container } = await mount(table({ columns, exportFilename: 'deals' }));
  await click(button(container, 'Export'));
  const csv = qa(document.body, '[role=menuitem]').find((el) => el.textContent.includes('CSV'));
  assert.ok(csv, 'the menu opens');
  await click(csv);
  assert.equal(blobs.length, 1);
  const lines = blobs[0].replace(/^﻿/, '').split('\r\n');
  assert.equal(lines[0], 'Deal id,Value,Owner email');
  assert.equal(lines[1], 'a,48200,ana@x.co');
 } finally {
  globalThis.Blob = RealBlob;
  URL.createObjectURL = createObjectURL;
 }
});
