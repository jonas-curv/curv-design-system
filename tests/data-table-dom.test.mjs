// DataTable in a real (happy-dom) DOM, built from dist/: the shared template,
// ARIA roles, sorting, selection, totals, columns and the external toolbar.
import './dom-setup.mjs';
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { createRoot } from 'react-dom/client';
import * as ds from '../dist/index.js';

const h = React.createElement;
const { act } = React;

// happy-dom lays nothing out, so the virtualizer would see a 0px viewport and
// render no rows. Give elements a size, the way a browser would.
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
const click = async (el, init = {}) => { await act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...init })); }); };
const key = async (el, name) => { await act(async () => { el.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true })); }); };

const ROWS = [
 { id: 'a', deal: 'Keychains', stage: 'Proposal', close: '2026-12-04', value: 48200, gp: 12000 },
 { id: 'b', deal: 'Wallets', stage: 'Sampling', close: '2026-12-11', value: 31750, gp: -1240 },
 { id: 'c', deal: 'Lanyards', stage: 'Late', close: null, value: 22400, gp: null },
 { id: 'd', deal: 'Bottle openers', stage: 'Proposal', close: '2026-11-28', value: 7450, gp: 0 },
];
const COLUMNS = [
 { key: 'deal', header: 'Deal', minWidth: 240 },
 { key: 'stage', header: 'Stage', type: 'status', render: (r) => h('span', { className: 'badge' }, r.stage) },
 { key: 'close', header: 'Close date', type: 'date' },
 { key: 'gp', header: 'GP', type: 'money' },
 // A money column with a render still aligns right.
 { key: 'value', header: 'Value', type: 'money', render: (r) => h('b', null, `$${r.value}`) },
];
const table = (props = {}) => h(ds.DataTable, { columns: COLUMNS, rows: ROWS, getRowId: (r) => r.id, 'aria-label': 'Deals', unit: 'deals', ...props });

const q = (c, sel) => c.querySelector(sel);
const qa = (c, sel) => [...c.querySelectorAll(sel)];
const headers = (c) => qa(c, '[role=columnheader]');
const header = (c, name) => headers(c).find((el) => el.textContent.trim() === name);
const bodyRows = (c) => qa(c, '[role=rowgroup] > [role=row]');
const firstCells = (c) => bodyRows(c).map((r) => qa(r, '[role=cell]').find((cell) => !q(cell, '[role=checkbox]')).textContent);
const footer = (c) => q(c, '[role=status]').textContent;

test('one template on the scroll area; header, rows and totals all read it; ARIA table roles', async () => {
 const { container } = await mount(table({ totals: { value: 'sum' } }));
 const scroller = q(container, '.overflow-auto');
 const template = scroller.style.getPropertyValue('--dt-cols');
 assert.ok(template.length > 0);
 assert.ok(!/content|auto/.test(template), template);
 const grids = qa(container, '[role=table] [role=row]').filter((r) => r.style.gridTemplateColumns);
 assert.ok(grids.length >= 6, 'header, 4 rows, totals');
 for (const g of grids) assert.equal(g.style.gridTemplateColumns, 'var(--dt-cols)');
 assert.equal(q(container, '[role=table]').getAttribute('aria-label'), 'Deals');
 assert.equal(headers(container).length, 5);
 assert.equal(qa(bodyRows(container)[0], '[role=cell]').length, 5);
});

test('header: whole cell is the sort button, named by its label, aria-sort, sort slot reserved', async () => {
 const { container } = await mount(table());
 const value = header(container, 'Value');
 const button = q(value, 'button');
 assert.equal(button.getAttribute('aria-label'), null, 'no aria-label overriding the visible name');
 assert.equal(value.getAttribute('aria-sort'), 'none');
 assert.ok(button.className.includes('w-full'), 'the button fills the cell');
 assert.ok(q(button, 'svg').getAttribute('class').includes('opacity-0'), 'idle arrow hidden, slot kept');
 assert.ok(button.className.includes('justify-end'), 'right column: arrow before the label');
 assert.equal(button.textContent, 'Value');
});

test('numbers and dates sort high to low first, text A to Z, third click clears', async () => {
 const { container } = await mount(table());
 const sortBy = (name) => click(q(header(container, name), 'button'));
 await sortBy('Value');
 assert.equal(header(container, 'Value').getAttribute('aria-sort'), 'descending');
 assert.deepEqual(firstCells(container), ['Keychains', 'Wallets', 'Lanyards', 'Bottle openers']);
 await sortBy('Value');
 assert.equal(header(container, 'Value').getAttribute('aria-sort'), 'ascending');
 assert.equal(firstCells(container)[0], 'Bottle openers');
 await sortBy('Value');
 assert.equal(header(container, 'Value').getAttribute('aria-sort'), 'none');
 await sortBy('Deal');
 assert.equal(header(container, 'Deal').getAttribute('aria-sort'), 'ascending');
 assert.equal(firstCells(container)[0], 'Bottle openers');
 await sortBy('Close date');
 assert.equal(header(container, 'Close date').getAttribute('aria-sort'), 'descending');
 assert.deepEqual(firstCells(container).slice(0, 2), ['Wallets', 'Keychains']);
 assert.equal(firstCells(container).at(-1), 'Lanyards', 'no date sorts last');
});

test('cells: type alignment even with a render, default formats, a muted dash for nothing', async () => {
 const { container } = await mount(table());
 const cells = qa(bodyRows(container)[1], '[role=cell]');
 const [deal, , close, gp, value] = cells;
 assert.ok(value.className.includes('text-right') && value.className.includes('tabular-nums'));
 assert.ok(gp.className.includes('text-right'));
 assert.ok(deal.className.includes('font-medium'), 'the first column is 500');
 assert.equal(gp.textContent, '−$1,240');
 assert.match(close.textContent, /^Dec 11/);
 const empty = qa(bodyRows(container)[2], '[role=cell]')[3];
 assert.equal(empty.textContent, '—');
 assert.ok(q(empty, 'span').className.includes('text-muted-foreground'));
 assert.equal(qa(bodyRows(container)[3], '[role=cell]')[3].textContent, '$0');
 // Header padding: 16 on the outer edges, 12 inside, the same as the cells.
 assert.ok(q(header(container, 'Deal'), 'button').className.includes('pl-4'));
 assert.ok(q(header(container, 'Value'), 'button').className.includes('pr-4'));
 assert.ok(deal.className.includes('pl-4') && value.className.includes('pr-4'));
});

test('selection: select-all covers every row in view, bulk bar, footer, Escape clears', async () => {
 const seen = [];
 const { container } = await mount(table({
  selectable: true,
  onSelectedChange: (ids) => seen.push(ids),
  bulkActions: (rows) => h(ds.DataTableBulkAction, null, `Assign ${rows.length}`),
  tabs: [{ key: 'all', label: 'All' }, { key: 'open', label: 'Open', filter: (r) => r.stage !== 'Late' }],
 }));
 assert.equal(headers(container)[0].querySelector('[role=checkbox]').getAttribute('aria-label'), 'Select all deals');
 // Narrow to the Open tab, then select all: 3 rows, not 4.
 await click([...container.querySelectorAll('[role=radio]')].find((r) => r.textContent.startsWith('Open')));
 await click(q(headers(container)[0], '[role=checkbox]'));
 const bar = q(container, '[role=toolbar][aria-label="Bulk actions"]');
 assert.ok(bar, 'the bulk bar replaces the header');
 assert.match(bar.textContent, /3 selected/);
 assert.match(bar.textContent, /Assign 3/);
 assert.equal(footer(container), '3 of 3 selected');
 assert.deepEqual([...seen.at(-1)].sort(), ['a', 'b', 'd']);
 assert.equal(bodyRows(container)[0].getAttribute('aria-selected'), 'true');
 // One off: the bar's checkbox is mixed.
 await click(q(bodyRows(container)[0], '[role=checkbox]'));
 assert.equal(q(bar, '[role=checkbox]').getAttribute('aria-checked'), 'mixed');
 assert.equal(footer(container), '2 of 3 selected');
 await key(q(bodyRows(container)[1], '[role=checkbox]'), 'Escape');
 assert.equal(q(container, '[role=toolbar][aria-label="Bulk actions"]'), null);
 assert.deepEqual(seen.at(-1), []);
 assert.equal(footer(container), '3 deals');
});

test('shift-click selects the range from the last row clicked', async () => {
 const { container } = await mount(table({ selectable: true }));
 const box = (i) => q(bodyRows(container)[i], '[role=checkbox]');
 await click(box(0));
 await click(box(3), { shiftKey: true });
 assert.equal(footer(container), '4 of 4 selected');
 assert.equal(q(container, '[role=toolbar] [role=checkbox]').getAttribute('aria-checked'), 'true');
});

test('totals: a 44 row, sticky at the bottom, over the rows in view, "Total" in the first text column', async () => {
 const { container } = await mount(table({ totals: { value: 'sum', gp: 'sum' }, searchable: true }));
 const totalsRow = () => qa(container, '[role=table] > [role=row]').at(-1);
 assert.ok(totalsRow().className.includes('sticky') && totalsRow().className.includes('bottom-0') && totalsRow().className.includes('h-11'));
 const cells = () => qa(totalsRow(), '[role=cell]').map((c) => c.textContent);
 assert.deepEqual(cells(), ['Total', '', '', '$10,760', '$109,800']);
 const input = q(container, 'input[placeholder]');
 await act(async () => {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  set.call(input, 'wall');
  input.dispatchEvent(new Event('input', { bubbles: true }));
 });
 assert.deepEqual(cells(), ['Total', '', '', '−$1,240', '$31,750']);
});

test('columns: controlled visibility hides a column everywhere; the identity column stays', async () => {
 const { container } = await mount(table({ columnVisibility: { stage: false, deal: false }, totals: { value: 'sum' } }));
 assert.deepEqual(headers(container).map((x) => x.textContent), ['Deal', 'Close date', 'GP', 'Value']);
 assert.equal(qa(bodyRows(container)[0], '[role=cell]').length, 4);
 assert.ok(q(container, 'button[aria-label="Columns"]'), 'a Columns button shows');
});

test('columns: a tableId restores the saved choice', async () => {
 localStorage.setItem('curv.data-table.deals.columns', JSON.stringify({ close: false }));
 const { container } = await mount(table({ tableId: 'deals' }));
 assert.ok(!headers(container).some((x) => x.textContent === 'Close date'));
});

test('group rows are 36 tall; the footer counts rows and groups', async () => {
 const byStage = (r) => r.stage;
 const { container } = await mount(table({ groupBy: byStage }));
 const groupRow = qa(container, '[role=rowgroup] > [role=row]').find((r) => q(r, '[aria-expanded]'));
 assert.equal(groupRow.style.height, '36px');
 assert.equal(footer(container), '4 deals · 3 groups');
});

test('external toolbar: the pieces drive the table; the card shows no toolbar of its own', async () => {
 const { container } = await mount(
  h(ds.DataTableProvider, { columns: COLUMNS, rows: ROWS, getRowId: (r) => r.id, unit: 'deals', exportFilename: 'deals', tabs: [{ key: 'all', label: 'All' }] },
   h('div', { 'data-row': '' }, h(ds.DataTableViews), h(ds.DataTableSearch), h(ds.DataTableColumnsButton)),
   h(ds.DataTable, { toolbar: 'external' }),
  ),
 );
 const row = q(container, '[data-row]');
 assert.ok(Boolean(q(row, 'input[placeholder]') && q(row, '[role=radiogroup]') && q(row, 'button[aria-label="Columns"]')));
 const card = row.nextElementSibling;
 // Booleans, not nodes: a failing assert would try to print a whole DOM node.
 assert.ok(q(card, 'input[placeholder]') === null, 'no search inside the card');
 assert.ok(q(card, '[role=radiogroup]') === null && q(card, 'button[aria-label="Columns"]') === null, 'no toolbar inside the card');
 const input = q(row, 'input[placeholder]');
 await act(async () => {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  set.call(input, 'key');
  input.dispatchEvent(new Event('input', { bubbles: true }));
 });
 assert.equal(footer(container), '1 deals');
});

test('an untyped plain numeric column still aligns right; a rendered one stays left', async () => {
 const rows = [{ id: '1', name: 'A', qty: 3, rating: 4 }];
 const { container } = await mount(h(ds.DataTable, {
  rows,
  columns: [{ key: 'name', header: 'Name' }, { key: 'qty', header: 'Qty' }, { key: 'rating', header: 'Rating', render: (r) => '★'.repeat(r.rating) }],
 }));
 const [, qty, rating] = qa(bodyRows(container)[0], '[role=cell]');
 assert.ok(qty.className.includes('text-right'));
 assert.ok(!rating.className.includes('text-right'));
 assert.equal(qty.textContent, '3', 'untyped values are not reformatted');
});

test('a rendered cell wider than its estimate widens its column; an explicit width stays', async () => {
 // happy-dom lays nothing out: every cell is 1000 wide (above) and, here, every
 // cell's content 1200, as a `render` with cents or a unit would be.
 const original = Range.prototype.getBoundingClientRect;
 Range.prototype.getBoundingClientRect = function () {
  return { x: 0, y: 0, top: 0, left: 0, right: 1200, bottom: 20, width: 1200, height: 20 };
 };
 try {
  const { container } = await mount(h(ds.DataTable, {
   rows: ROWS,
   columns: [
    { key: 'deal', header: 'Deal' },
    { key: 'value', header: 'Value', align: 'right', render: (r) => `$${r.value}.00 USD` },
    { key: 'gp', header: 'GP', type: 'money', width: 120 },
   ],
  }));
  const tracks = q(container, '.overflow-auto').style.getPropertyValue('--dt-cols').split(' ');
  assert.equal(tracks[1], '1200px', 'the rendered money column grows to its content');
  assert.equal(tracks[2], '120px', 'a column with a width keeps it');
 } finally {
  Range.prototype.getBoundingClientRect = original;
 }
});

test('Checkbox: indeterminate is mixed, and a click reports checked', async () => {
 const seen = [];
 const { container } = await mount(h(ds.Checkbox, { indeterminate: true, onCheckedChange: (on) => seen.push(on), 'aria-label': 'All' }));
 const box = q(container, '[role=checkbox]');
 assert.equal(box.getAttribute('aria-checked'), 'mixed');
 await click(box);
 assert.deepEqual(seen, [true]);
});
