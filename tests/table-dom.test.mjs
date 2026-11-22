// The Table parts (shadcn API, the standard look) and useTableSort, in a real
// (happy-dom) DOM, built from dist/. Plus the server-safe entry
// (@curvgroup/design-system/table) rendered with react-dom/server.
import './dom-setup.mjs';
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import * as ds from '../dist/index.js';
import * as server from '../dist/table.js';

const h = React.createElement;
const { act } = React;
const {
  Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption, TableNull, useTableSort,
} = ds;

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
});
const click = async (el) => { await act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); }); };
const q = (c, sel) => c.querySelector(sel);
const qa = (c, sel) => [...c.querySelectorAll(sel)];
const classes = (el) => el.getAttribute('class').split(/\s+/);
const has = (el, ...names) => names.every((n) => classes(el).includes(n));

const PARTS = ['Table', 'TableHeader', 'TableBody', 'TableFooter', 'TableRow', 'TableHead', 'TableCell', 'TableCaption', 'TableNull'];

test('the eight shadcn parts (and TableNull, useTableSort) are exported from the package root', () => {
 for (const name of PARTS) assert.ok(ds[name], name);
 assert.equal(typeof useTableSort, 'function');
});

test('the /table entry is server-safe: the same parts, no hooks or context, no "use client"', () => {
 for (const name of PARTS) assert.ok(server[name], name);
 assert.equal(server.useTableSort, undefined, 'the hook lives in the root only');
 assert.ok(server.tableHeaderRow && server.tableCellPadding && server.formatMoney, 'tokens and formats');
 const src = readFileSync(new URL('../dist/table.js', import.meta.url), 'utf8');
 assert.doesNotMatch(src, /createContext|useState|useEffect|useLayoutEffect|useRef|"use client"/);
 const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
 assert.deepEqual(pkg.exports['./table'], { types: './dist/table.d.ts', import: './dist/table.js', default: './dist/table.js' });
 const html = renderToStaticMarkup(
  h(server.Table, { 'aria-label': 'Lines' },
   h(server.TableHeader, null, h(server.TableRow, null, h(server.TableHead, null, 'Item'), h(server.TableHead, { numeric: true }, 'Value'))),
   h(server.TableBody, null, h(server.TableRow, null, h(server.TableCell, null, 'Box'), h(server.TableCell, { numeric: true }, server.formatMoney(-1240)))),
  ),
 );
 assert.match(html, /<table[^>]*aria-label="Lines"/);
 assert.match(html, /<th scope="col"/);
 assert.match(html, /−\$1,240/);
});

const lines = (props = {}, cellProps = {}) =>
 h(Table, { 'aria-label': 'Lines', ...props },
  h(TableHeader, null,
   h(TableRow, null, h(TableHead, null, 'Item'), h(TableHead, null, 'Due'), h(TableHead, { numeric: true }, 'Value')),
  ),
  h(TableBody, null,
   h(TableRow, null, h(TableCell, cellProps, 'Mailer box'), h(TableCell, null, h(TableNull)), h(TableCell, { numeric: true }, '$4,960')),
   h(TableRow, { selected: true }, h(TableCell, null, 'Tissue'), h(TableCell, null, 'Dec 4'), h(TableCell, { numeric: true }, '$1,800')),
  ),
  h(TableFooter, null, h(TableRow, null, h(TableCell, null, 'Total'), h(TableCell), h(TableCell, { numeric: true }, '$6,760'))),
 );

test('header: 36, solid muted, 12 / 500 muted, sentence case, never wraps, a hairline that travels when it sticks', async () => {
 const { container } = await mount(lines());
 const th = q(container, 'th');
 assert.equal(th.getAttribute('scope'), 'col');
 assert.ok(has(th, 'h-9', 'bg-muted', 'text-caption', 'font-medium', 'text-muted-foreground', 'whitespace-nowrap'));
 assert.ok(!classes(th).some((c) => /uppercase|tracking-wide|text-\[/.test(c)), 'no caps, no arbitrary size');
 assert.ok(has(th, 'shadow-[inset_0_-1px_0_var(--border)]'), 'the hairline is on the cell');
 assert.ok(has(th, 'px-3', 'first:pl-4', 'last:pr-4'), 'header padding identical to its cells');
 assert.ok(has(q(container, 'thead'), '[&>tr]:border-b-0'), 'no second hairline from the row');
});

test('rows and cells: 44, 13px, hairlines, body-only hover, no zebra, edge padding, the first column 500', async () => {
 const { container } = await mount(lines());
 const table = q(container, 'table');
 assert.ok(has(table, 'w-full', 'text-body', 'border-collapse'));
 assert.ok(identityToken(table), 'the identity column is 500');
 const tr = q(container, 'tbody tr');
 assert.ok(has(tr, 'border-b', 'border-border', '[tbody>&:not([data-state=selected])]:hover:bg-accent/30'));
 assert.ok(!classes(tr).some((c) => /even:|odd:/.test(c)), 'no zebra');
 const td = q(container, 'tbody td');
 assert.ok(has(td, 'h-11', 'px-3', 'first:pl-4', 'last:pr-4'));
 assert.ok(has(q(container, 'tbody'), '[&>tr:last-child]:border-b-0'));
});

// The identity rule's token, and the cells it reaches (its selector run on the
// DOM; happy-dom can't match inside :where, and :where only drops specificity).
const identityToken = (table) => classes(table).find((c) => c.startsWith('[:where(&>tbody>tr') && c.endsWith(')]:font-medium'));
const identityCells = (container) => {
 const table = q(container, 'table');
 table.id = 'identity-probe';
 const selector = identityToken(table).slice(':where('.length + 1, -')]:font-medium'.length).replace('&', '#identity-probe');
 return qa(container, selector).map((td) => td.textContent);
};

// Cells keep 6px above and below, 4 in a dense table (through a variable the
// table sets). Measured in Chromium: a row of text, a badge or a 28 control is
// 44 with its hairline, a dense row of text or a badge 36. py-2 made a 28
// control row 45 and every dense row 37; py-1.5 everywhere made a dense badge 37.
const CELL_PY = 'py-[var(--table-cell-py,calc(var(--spacing)*1.5))]';

test('heights: a 44 row includes its hairline: 6px above and below, 4 dense (rows 44 / 36, measured in Chromium)', async () => {
 const { container } = await mount(lines({ dense: true }));
 const td = q(container, 'tbody td');
 assert.ok(has(td, 'h-11', CELL_PY), 'a 44 minimum, 6px unless the table sets the variable');
 assert.ok(!classes(td).some((c) => /^py-\d/.test(c)), 'no fixed padding to fight the dense one');
 assert.ok(has(q(container, 'table'), '[&>tbody>tr>td]:h-9', '[--table-cell-py:var(--spacing)]'), 'dense: 36 rows, 4px');
 const th = q(container, 'thead th');
 assert.ok(has(th, 'h-9', 'py-0', 'shadow-[inset_0_-1px_0_var(--border)]'), 'the header hairline is a shadow: 36 includes it');
});

test('row alignment: the row is middle and its cells inherit it, so a row class lifts every cell', async () => {
 const { container, render } = await mount(lines());
 for (const tr of qa(container, 'tr')) assert.ok(has(tr, 'align-middle'), 'every row, head and foot too');
 for (const cell of qa(container, 'td, th')) assert.ok(!classes(cell).some((c) => /^align-/.test(c)), 'no cell forces its own alignment');
 await render(
  h(Table, null, h(TableBody, null,
   h(TableRow, { className: 'align-top' }, h(TableCell, null, 'A'), h(TableCell, { className: 'align-bottom' }, 'B')),
   h(TableRow, { className: '[&>td]:align-top' }, h(TableCell, null, 'C')),
  )),
 );
 const [top, workaround] = qa(container, 'tr');
 assert.ok(has(top, 'align-top') && !has(top, 'align-middle'), 'the row class replaces the default');
 assert.ok(has(top.children[1], 'align-bottom'), "a cell's own alignment still wins");
 assert.ok(has(workaround, '[&>td]:align-top', 'align-middle'), 'the 0.6.0 workaround still reaches the cells');
});

test('identity column: zero specificity, so a weight class on the cell wins; spans and opt-outs keep their own weight', async () => {
 const { container } = await mount(
  h(Table, null, h(TableBody, null,
   h(TableRow, null, h(TableCell, null, 'plain'), h(TableCell, null, 'x')),
   h(TableRow, null, h(TableCell, { colSpan: 2 }, 'span')),
   h(TableRow, null, h(TableCell, { colSpan: 1 }, 'one'), h(TableCell, null, 'x')),
   h(TableRow, { identity: false }, h(TableCell, null, 'row-off'), h(TableCell, null, 'x')),
   h(TableRow, null, h(TableCell, { identity: false }, 'cell-off'), h(TableCell, null, 'x')),
   h(TableRow, { className: 'font-semibold' }, h(TableCell, null, 'Total'), h(TableCell, null, 'x')),
   h(TableRow, { className: 'hover:font-semibold' }, h(TableCell, null, 'variant'), h(TableCell, null, 'x')),
  )),
 );
 const token = identityToken(q(container, 'table'));
 assert.ok(token.startsWith('[:where('), 'all of it inside :where, so font-normal / font-semibold on a cell beats it');
 assert.deepEqual(identityCells(container), ['plain', 'one', 'variant']);
 const [, , , rowOff, cellOff] = qa(container, 'tr');
 assert.equal(rowOff.getAttribute('data-identity'), 'false');
 assert.equal(cellOff.firstElementChild.getAttribute('data-identity'), 'false');
 assert.equal(rowOff.getAttribute('identity'), null, 'the prop never reaches the DOM');
 assert.equal(q(container, 'tr').getAttribute('data-identity'), null, 'nothing set by default');
 assert.equal(q(container, 'td').getAttribute('data-identity'), null);
});

test('identity on a cell: true sets it 500 wherever it sits; it merges with a weight class', async () => {
 const { container } = await mount(
  h(Table, { identityColumn: false }, h(TableBody, null,
   h(TableRow, null, h(TableCell, null, 'Nov 4'), h(TableCell, { identity: true }, 'Acme'), h(TableCell, { identity: true, className: 'font-semibold' }, 'Globex')),
  )),
 );
 assert.equal(identityToken(q(container, 'table')), undefined, 'identityColumn={false} drops the rule');
 const [date, acme, globex] = qa(container, 'td');
 assert.ok(!has(date, 'font-medium'));
 assert.ok(has(acme, 'font-medium'));
 assert.ok(has(globex, 'font-semibold') && !has(globex, 'font-medium'), 'the caller wins');
});

test('numbers: align right with tabular figures on head and cell; align="right" does the same', async () => {
 const { container } = await mount(lines());
 const [, , value] = qa(container, 'thead th');
 assert.ok(has(value, 'text-right'));
 const cell = qa(container, 'tbody tr')[0].children[2];
 assert.ok(has(cell, 'text-right', 'tabular-nums', 'whitespace-nowrap'));
 const { container: c2 } = await mount(h(Table, null, h(TableBody, null, h(TableRow, null, h(TableCell, { align: 'right' }, '12d')))));
 assert.ok(has(q(c2, 'td'), 'text-right', 'tabular-nums'));
 assert.equal(q(c2, 'td').getAttribute('align'), null, 'the prop never reaches the DOM');
});

test('null cell: TableNull is a muted em dash', async () => {
 const { container } = await mount(lines());
 const dash = qa(container, 'tbody tr')[0].children[1].firstElementChild;
 assert.equal(dash.textContent, '—');
 assert.ok(has(dash, 'text-muted-foreground/60'));
});

test('selected row: bg-accent/50, data-state and aria-selected, as shadcn', async () => {
 const { container } = await mount(lines());
 const [plain, picked] = qa(container, 'tbody tr');
 assert.equal(picked.getAttribute('data-state'), 'selected');
 assert.equal(picked.getAttribute('aria-selected'), 'true');
 assert.ok(has(picked, 'data-[state=selected]:bg-accent/50'));
 assert.equal(plain.getAttribute('data-state'), null);
 assert.equal(plain.getAttribute('aria-selected'), null);
});

test('totals footer: bg-muted, a hairline above, semibold, 44; sticky on request', async () => {
 const { container, render } = await mount(lines());
 const tfoot = q(container, 'tfoot');
 assert.ok(has(tfoot, 'font-semibold', '[&>tr>*]:bg-muted', '[&>tr>*]:h-11', '[&>tr>*]:shadow-[inset_0_1px_0_var(--border)]'));
 assert.ok(!has(tfoot, 'sticky'));
 await render(h(Table, { maxHeight: 320 }, h(TableHeader, { sticky: true }), h(TableFooter, { sticky: true })));
 assert.ok(has(q(container, 'thead'), 'sticky', 'top-0', 'z-20'));
 assert.ok(has(q(container, 'tfoot'), 'sticky', 'bottom-0', 'z-20'));
});

test('container: the scroll area, capped by maxHeight; card draws the standard card', async () => {
 const { container, render } = await mount(lines());
 const box = q(container, '[data-slot=table-container]');
 assert.ok(has(box, 'overflow-auto', 'w-full'));
 assert.equal(box.style.maxHeight, '');
 assert.ok(!has(box, 'shadow-card'));
 await render(lines({ maxHeight: '60vh', card: true, containerClassName: 'mt-4' }));
 const capped = q(container, '[data-slot=table-container]');
 assert.equal(capped.style.maxHeight, '60vh');
 assert.ok(has(capped, 'rounded-lg', 'bg-card', 'shadow-card', 'mt-4'));
});

test('dense: rows 36, the header stays 36; identityColumn={false} drops the 500', async () => {
 const { container } = await mount(lines({ dense: true, identityColumn: false }));
 const table = q(container, 'table');
 assert.equal(table.getAttribute('data-density'), 'compact');
 assert.ok(has(table, '[&>tbody>tr>td]:h-9', '[--table-cell-py:var(--spacing)]'));
 const plain = await mount(lines());
 assert.ok(!has(q(plain.container, 'table'), '[--table-cell-py:var(--spacing)]'), 'only dense sets it');
 assert.equal(identityToken(table), undefined);
 assert.ok(!classes(table).some((c) => c.endsWith(':font-medium')));
 assert.ok(has(q(container, 'th'), 'h-9'));
});

test("a cell's own padding replaces the default, dense too (the variable never outranks it)", async () => {
 const { container } = await mount(
  h(Table, { dense: true }, h(TableBody, null, h(TableRow, null,
   h(TableCell, { className: 'p-0' }, 'A'), h(TableCell, { className: 'py-3' }, 'B'), h(TableCell, null, 'C'),
  ))),
 );
 const [a, b, c] = qa(container, 'td');
 assert.ok(has(a, 'p-0') && !has(a, CELL_PY), 'p-0 drops the default');
 assert.ok(has(b, 'py-3') && !has(b, CELL_PY));
 assert.ok(has(c, CELL_PY));
 assert.ok(!classes(q(container, 'table')).some((c) => /td\]:p[ytb]?-/.test(c)), 'the table sets no padding on its cells');
});

test('className merges onto every part (tailwind-merge), refs reach the element', async () => {
 const ref = React.createRef();
 const { container } = await mount(
  h(Table, { ref, className: 'min-w-[640px]' },
   h(TableBody, null, h(TableRow, { className: 'opacity-70' }, h(TableCell, { className: 'h-14 px-5' }, 'A'))),
   h(TableCaption, { className: 'sr-only' }, 'PO lines'),
  ),
 );
 assert.equal(ref.current, q(container, 'table'));
 assert.ok(has(q(container, 'table'), 'min-w-[640px]'));
 assert.ok(has(q(container, 'tr'), 'opacity-70'));
 const td = q(container, 'td');
 assert.ok(has(td, 'h-14', 'px-5') && !has(td, 'h-11') && !has(td, 'px-3'), 'the caller wins a conflict');
 assert.ok(has(q(container, 'caption'), 'sr-only', 'text-muted-foreground'));
});

test('priority hides a column below md (2) or xl (3); sticky pins left or right with an edge hairline', async () => {
 const { container } = await mount(
  h(Table, null,
   h(TableHeader, null, h(TableRow, null, h(TableHead, { sticky: true }, 'Item'), h(TableHead, { priority: 2 }, 'Supplier'), h(TableHead, { priority: 3 }, 'Notes'), h(TableHead, { sticky: 'right', numeric: true }, 'Total'))),
   h(TableBody, null, h(TableRow, null, h(TableCell, { sticky: true }, 'Box'), h(TableCell, { priority: 2 }, 'Hanzhou'), h(TableCell, { priority: 3 }, 'x'), h(TableCell, { sticky: 'right', numeric: true }, '$1'))),
  ),
 );
 const [item, supplier, notes, total] = qa(container, 'th');
 assert.ok(has(supplier, 'hidden', 'md:table-cell'));
 assert.ok(has(notes, 'hidden', 'xl:table-cell'));
 assert.ok(has(item, 'sticky', 'left-0', 'z-10', 'bg-muted'));
 assert.ok(has(total, 'sticky', 'right-0'));
 const [cItem, cSupplier, , cTotal] = qa(container, 'td');
 assert.ok(has(cSupplier, 'hidden', 'md:table-cell'));
 assert.ok(has(cItem, 'sticky', 'left-0', 'z-10', 'bg-card', 'shadow-[1px_0_0_0_var(--border)]'), 'opaque, with its edge');
 const tints = classes(cItem).filter((c) => c.includes('linear-gradient'));
 assert.equal(tints.length, 2, 'it carries the row hover and selected tints itself');
 assert.ok(tints.some((c) => c.startsWith('[tbody>tr:not([data-state=selected]):hover>&]:') && c.includes('_30%')), 'hover: 30%, not on a selected row');
 assert.ok(tints.some((c) => c.startsWith('[tr[data-state=selected]>&]:') && c.includes('_50%')), 'selected: 50%');
 assert.ok(has(cTotal, 'sticky', 'right-0', 'shadow-[-1px_0_0_0_var(--border)]'));
});

/* ---------- sortable head ---------- */

const sortTable = (heads) => h(Table, null, h(TableHeader, null, h(TableRow, null, ...heads)));

test('sortable head: the whole cell is the button, named by its label, aria-sort on the cell, focus ring', async () => {
 const { container } = await mount(sortTable([h(TableHead, { key: 'a', sort: null, onSort: () => {} }, 'Customer'), h(TableHead, { key: 'b' }, 'Notes')]));
 const [customer, notes] = qa(container, 'th');
 assert.equal(customer.getAttribute('aria-sort'), 'none');
 assert.ok(has(customer, 'p-0'), 'the button carries the padding');
 const button = q(customer, 'button');
 assert.equal(button.getAttribute('type'), 'button');
 assert.equal(button.getAttribute('aria-label'), null, 'its visible label names it');
 assert.equal(button.textContent, 'Customer');
 assert.ok(has(button, 'w-full', 'h-9', 'px-3', '[th:first-child>&]:pl-4', '[th:last-child>&]:pr-4', 'hover:bg-accent/60'));
 assert.ok(has(q(button, 'span'), 'group-focus-visible/sort:ring-2', 'group-focus-visible/sort:ring-ring'), 'visible focus ring');
 assert.equal(q(button, 'svg').getAttribute('aria-hidden'), 'true');
 assert.equal(q(notes, 'button'), null, 'a head without onSort is not a button');
 assert.equal(notes.getAttribute('aria-sort'), null);
});

test('sortable head: arrow slot reserved; hidden idle, muted on hover and focus, foreground when sorted', async () => {
 const { container, render } = await mount(sortTable([h(TableHead, { key: 'a', sort: null, onSort: () => {} }, 'Customer')]));
 const idle = q(container, 'th svg');
 assert.ok(has(idle, 'opacity-0', 'group-hover/sort:opacity-100', 'group-focus-visible/sort:opacity-100'));
 assert.ok(!has(q(container, 'th'), 'text-foreground'), 'idle reads muted');
 await render(sortTable([h(TableHead, { key: 'a', sort: 'asc', onSort: () => {} }, 'Customer')]));
 const th = q(container, 'th');
 assert.equal(th.getAttribute('aria-sort'), 'ascending');
 assert.ok(has(th, 'text-foreground'), 'label and arrow foreground');
 assert.ok(has(q(th, 'svg'), 'opacity-100'));
 await render(sortTable([h(TableHead, { key: 'a', sort: 'desc', onSort: () => {} }, 'Customer')]));
 assert.equal(q(container, 'th').getAttribute('aria-sort'), 'descending');
});

test('sortable head: arrow after the label on left columns, before it on right ones; the idle arrow previews the first click', async () => {
 const down = 'M12 5v14M19 12l-7 7-7-7';
 const up = 'M12 19V5M5 12l7-7 7 7';
 const { container } = await mount(sortTable([
  h(TableHead, { key: 'a', sort: null, onSort: () => {} }, 'Customer'),
  h(TableHead, { key: 'b', sort: null, onSort: () => {}, numeric: true }, 'Value'),
  h(TableHead, { key: 'c', sort: null, onSort: () => {}, sortFirst: 'desc' }, 'Close date'),
 ]));
 const [customer, value, close] = qa(container, 'th').map((th) => q(th, 'button > span'));
 assert.equal(customer.lastElementChild.tagName.toLowerCase(), 'svg', 'left: after the label');
 assert.equal(value.firstElementChild.tagName.toLowerCase(), 'svg', 'right: before the label');
 assert.ok(has(q(qa(container, 'th')[1], 'button'), 'justify-end'));
 assert.equal(q(customer, 'path').getAttribute('d'), up, 'text sorts A to Z first');
 assert.equal(q(value, 'path').getAttribute('d'), down, 'numbers high to low first');
 assert.equal(q(close, 'path').getAttribute('d'), down, 'sortFirst for a date');
});

test('sortable head: a click calls onSort', async () => {
 let n = 0;
 const { container } = await mount(sortTable([h(TableHead, { key: 'a', sort: null, onSort: () => { n++; } }, 'Customer')]));
 await click(q(container, 'th button'));
 assert.equal(n, 1);
});

/* ---------- head suffix and definitions ---------- */

const funnel = (label = 'Filter value') => h('button', { type: 'button', 'aria-label': label, className: 'size-7' }, 'f');

test('suffix: a control after the label, outside the sort button; the button is then the label alone (as DataTable headerSuffix)', async () => {
 const { container } = await mount(sortTable([
  h(TableHead, { key: 'a', suffix: funnel('Filter customer') }, 'Customer'),
  h(TableHead, { key: 'b', sort: 'desc', onSort: () => {}, numeric: true, suffix: funnel() }, 'Value'),
  h(TableHead, { key: 'c', sort: null, onSort: () => {} }, 'Due'),
 ]));
 const [customer, value, due] = qa(container, 'th');
 const row = customer.firstElementChild;
 assert.ok(has(row, 'flex', 'h-9', 'items-center'));
 assert.ok(!classes(row).some((c) => c.startsWith('gap-')), "no gap: DataTable's headerSuffix sits flush too");
 assert.ok(has(customer, 'px-3', 'first:pl-4', 'last:pr-4'), 'a plain head keeps its padding');
 assert.equal(row.textContent, 'Customerf');
 assert.equal(row.lastElementChild.getAttribute('aria-label'), 'Filter customer');
 assert.ok(has(value, 'px-3') && !has(value, 'p-0'), 'beside a suffix the cell carries the padding');
 assert.ok(has(value.firstElementChild, 'justify-end'), 'a right column keeps its label at the right');
 const [sortButton, control] = value.firstElementChild.children;
 assert.equal(sortButton.textContent, 'Value');
 assert.ok(!has(sortButton, 'w-full') && !has(sortButton, 'px-3'), 'the sort button is the label alone');
 assert.equal(control.getAttribute('aria-label'), 'Filter value');
 assert.equal(q(sortButton, 'button'), null, 'no control inside the sort button');
 assert.equal(value.getAttribute('aria-sort'), 'descending');
 assert.equal(due.firstElementChild.tagName.toLowerCase(), 'button', 'without a suffix the DOM is as before');
 assert.ok(has(due.firstElementChild, 'w-full', 'px-3'));
});

test('description (package root): a dotted underline on the label; the label, or the sort button, is the tooltip trigger and is described by it', async () => {
 const { container } = await mount(sortTable([
  h(TableHead, { key: 'a', numeric: true, description: 'Gross profit ÷ revenue' }, 'GP margin'),
  h(TableHead, { key: 'b', sort: null, onSort: () => {}, description: 'Days since the order' }, 'Age'),
  h(TableHead, { key: 'c', description: '' }, 'Notes'),
 ]));
 const [gp, age, notes] = qa(container, 'th');
 const trigger = gp.firstElementChild;
 assert.equal(trigger.getAttribute('tabindex'), '0', 'a head that does not sort gets a focus stop for its definition');
 assert.ok(has(trigger, 'focus-visible:ring-2', 'focus-visible:ring-ring'));
 assert.ok(has(trigger.firstElementChild, 'underline', 'decoration-dotted', 'underline-offset-4'));
 assert.equal(gp.getAttribute('description'), null, 'the prop never reaches the DOM');
 const button = q(age, 'button');
 assert.equal(q(button, '[tabindex]'), null, 'no focus stop inside the sort button');
 assert.ok(has(q(button, 'span > span'), 'decoration-dotted'));
 assert.equal(q(notes, 'span'), null, 'an empty description draws nothing');
 // Screen readers: the trigger names a hidden copy of the definition.
 const described = (el) => document.getElementById(el.getAttribute('aria-describedby'));
 assert.equal(described(trigger).textContent, 'Gross profit ÷ revenue');
 assert.ok(described(trigger).hidden, 'hidden: a description, never part of the column name');
 assert.equal(described(button).textContent, 'Days since the order');
 assert.notEqual(trigger.getAttribute('aria-describedby'), button.getAttribute('aria-describedby'));
 assert.equal(q(notes, '[aria-describedby]'), null);
 const shown = () => document.body.textContent.split('Gross profit ÷ revenue').length - 1;
 assert.equal(shown(), 1, 'only the hidden copy until focus');
 await act(async () => { trigger.focus(); });
 await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
 assert.equal(shown(), 2, 'focus opens the definition');
});

test('the /table entry has no description: its TableHead stays server-safe and draws no underline', async () => {
 const html = renderToStaticMarkup(
  h(server.Table, null, h(server.TableHeader, null, h(server.TableRow, null,
   h(server.TableHead, { suffix: h('span', null, 'Nov') }, 'Revenue'),
  ))),
 );
 assert.match(html, /<th[^>]*><div class="flex h-9 items-center">Revenue<span>Nov<\/span><\/div><\/th>/);
 assert.doesNotMatch(html, /decoration-dotted/);
 const src = readFileSync(new URL('../dist/table.js', import.meta.url), 'utf8');
 assert.doesNotMatch(src, /@base-ui|Tooltip/, 'no tooltip in the server entry');
 assert.notEqual(ds.TableHead, server.TableHead, 'the root TableHead is the client one');
});

/* ---------- useTableSort ---------- */

const ROWS = [
 { id: 'a', item: 'Wallets', due: '2026-12-11', value: 31750 },
 { id: 'b', item: 'Bottle openers', due: '2026-11-28', value: 7450 },
 { id: 'c', item: 'Lanyards', due: null, value: 22400 },
 { id: 'd', item: 'Keychains', due: '2026-12-04', value: null },
];
const COLUMNS = { item: (r) => r.item, due: { value: (r) => r.due, type: 'date' }, value: (r) => r.value };

function Sorted({ options = {}, onState }) {
 const s = useTableSort(ROWS, { columns: COLUMNS, ...options });
 onState?.(s);
 return h(Table, { 'aria-label': 'Lines' },
  h(TableHeader, null, h(TableRow, null,
   h(TableHead, s.getHeadProps('item'), 'Item'),
   h(TableHead, s.getHeadProps('due'), 'Due'),
   h(TableHead, { ...s.getHeadProps('value'), numeric: true }, 'Value'),
  )),
  h(TableBody, null, s.rows.map((r) => h(TableRow, { key: r.id }, h(TableCell, null, r.item)))),
 );
}
const order = (c) => qa(c, 'tbody td').map((td) => td.textContent);
const head = (c, name) => qa(c, 'th').find((th) => th.textContent === name);

test('useTableSort: numbers and dates high to low first, text A to Z, the third click clears; empties last', async () => {
 const { container } = await mount(h(Sorted));
 const original = ['Wallets', 'Bottle openers', 'Lanyards', 'Keychains'];
 assert.deepEqual(order(container), original);
 await click(q(head(container, 'Value'), 'button'));
 assert.equal(head(container, 'Value').getAttribute('aria-sort'), 'descending');
 assert.deepEqual(order(container), ['Wallets', 'Lanyards', 'Bottle openers', 'Keychains']);
 await click(q(head(container, 'Value'), 'button'));
 assert.equal(head(container, 'Value').getAttribute('aria-sort'), 'ascending');
 assert.deepEqual(order(container), ['Bottle openers', 'Lanyards', 'Wallets', 'Keychains'], 'empty still last');
 await click(q(head(container, 'Value'), 'button'));
 assert.equal(head(container, 'Value').getAttribute('aria-sort'), 'none');
 assert.deepEqual(order(container), original);
 await click(q(head(container, 'Item'), 'button'));
 assert.equal(head(container, 'Item').getAttribute('aria-sort'), 'ascending');
 assert.deepEqual(order(container), ['Bottle openers', 'Keychains', 'Lanyards', 'Wallets']);
 await click(q(head(container, 'Due'), 'button'));
 assert.equal(head(container, 'Due').getAttribute('aria-sort'), 'descending', 'a date sorts newest first');
 assert.deepEqual(order(container), ['Wallets', 'Keychains', 'Bottle openers', 'Lanyards']);
 assert.equal(head(container, 'Item').getAttribute('aria-sort'), 'none', 'one sorted column at a time');
});

test('useTableSort: initialSort, getHeadProps.sortFirst, and a first direction inferred from values', async () => {
 let state;
 const { container } = await mount(h(Sorted, { options: { initialSort: { key: 'item', order: 'desc' } }, onState: (s) => { state = s; } }));
 assert.deepEqual(order(container), ['Wallets', 'Lanyards', 'Keychains', 'Bottle openers']);
 assert.equal(state.getHeadProps('value').sortFirst, 'desc', 'numbers');
 assert.equal(state.getHeadProps('due').sortFirst, 'desc', 'type date');
 assert.equal(state.getHeadProps('item').sortFirst, 'asc', 'text');
 assert.equal(state.getHeadProps('item').sort, 'desc');
 assert.equal(state.getHeadProps('value').sort, null);
});

test('useTableSort: controlled sort reports the next state and shows the one it is given', async () => {
 const seen = [];
 const { container, render } = await mount(h(Sorted, { options: { sort: null, onSortChange: (s) => seen.push(s) } }));
 await click(q(head(container, 'Value'), 'button'));
 assert.deepEqual(seen, [{ key: 'value', order: 'desc' }]);
 assert.equal(head(container, 'Value').getAttribute('aria-sort'), 'none', 'nothing moves until the owner passes it back');
 await render(h(Sorted, { options: { sort: { key: 'value', order: 'desc' }, onSortChange: (s) => seen.push(s) } }));
 assert.equal(head(container, 'Value').getAttribute('aria-sort'), 'descending');
 assert.equal(order(container)[0], 'Wallets');
 await click(q(head(container, 'Value'), 'button'));
 assert.deepEqual(seen.at(-1), { key: 'value', order: 'asc' });
});

test('useTableSort never mutates the rows it is given', async () => {
 const before = ROWS.map((r) => r.id).join();
 const { container } = await mount(h(Sorted));
 await click(q(head(container, 'Item'), 'button'));
 assert.equal(ROWS.map((r) => r.id).join(), before);
});
