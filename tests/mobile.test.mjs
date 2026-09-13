import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DataTable, MobileBottomNav, AppFrame, TopBar } from '../dist/index.js';
const h = React.createElement;
const columns = [
  { key: 'name', header: 'Name', mobilePriority: 'primary' },
  { key: 'status', header: 'Status', render: row => h('a', { href: `/status/${row.id}` }, row.status) },
  { key: 'amount', header: 'Amount' },
  { key: 'date', header: 'Date' },
  { key: 'note', header: 'Note', mobilePriority: 'hidden' },
];
const rows = Array.from({ length: 51 }, (_, id) => ({ id, name: `Record ${id}`, status: 'Ready', amount: id, date: 'Today', note: 'Preserved detail' }));
test('mobile list bounds rendered records and preserves details and independent links', () => {
 const html = renderToStaticMarkup(h(DataTable, { columns, rows, getRowHref: row => `/records/${row.id}` }));
 assert.equal((html.match(/aria-label="Open Record /g) || []).length, 25);
 assert.match(html, /<details><summary/);
 assert.match(html, /Preserved detail/);
 assert.match(html, /href="\/status\/0"/);
 assert.match(html, /href="\/records\/0"/);
 assert.match(html, /Sort records/);
 assert.match(html, /1 \/ 3/);
});
test('report opt-out keeps scroll table rather than rendering mobile cards', () => {
 const html = renderToStaticMarkup(h(DataTable, { columns, rows, mobileLayout: 'scroll' }));
 assert.doesNotMatch(html, /Sort records|More details/);
});
test('navigation caps slots including search and menu and names active destination', () => {
 const html = renderToStaticMarkup(h(MobileBottomNav, { items: Array.from({length:8}, (_,id)=>({id:String(id), label:`Page ${id}`,href:`/${id}`,active:id===0,icon:'•'})), onSearch(){}, onMenu(){} }));
 assert.equal((html.match(/<a /g)||[]).length, 3);
 assert.equal((html.match(/<button /g)||[]).length, 2);
 assert.match(html, /aria-current="page"/);
});
test('frame reserves safe-area space only when mobile navigation is supplied', () => {
 assert.match(renderToStaticMarkup(h(AppFrame,{topBar:null,sidebar:null,mobileNav:'Nav'},'Content')), /safe-area-inset-bottom/);
 assert.doesNotMatch(renderToStaticMarkup(h(AppFrame,{topBar:null,sidebar:null},'Content')), /safe-area-inset-bottom/);
});

test("top chrome includes top and landscape safe areas", () => {
 const html = renderToStaticMarkup(h(TopBar, {logo:"Product OS"}));
 for (const edge of ["top", "left", "right"]) assert.ok(html.includes(`safe-area-inset-${edge}`));
});

test('externally sorted lists do not expose an empty mobile sort control', () => {
 const html = renderToStaticMarkup(h(DataTable, { columns: columns.map(column => ({ ...column, sortable: false })), rows, searchable: false }));
 assert.doesNotMatch(html, /Sort records|Choose column/);
 assert.match(html, /Preserved detail/);
});

test('additive mobile entry exposes mobile controls without replacing charts', async () => {
 const entry = await import('../dist/mobile.js');
 assert.equal(typeof entry.DataTable, 'function');
 assert.equal(typeof entry.MobileBottomNav, 'function');
 assert.equal('LineChart' in entry, false);
 const html = renderToStaticMarkup(h(entry.DataTable, { columns, rows }));
 assert.match(html, /Preserved detail/);
});

test('chart renders server-side with values drawn in and no fixed pixel height', async () => {
 const { MobileChart } = await import('../dist/mobile.js');
 const points = [
   { label: 'Mon', value: 12 }, { label: 'Tue', value: 30 },
   { label: 'Wed', value: 18 }, { label: 'Thu', value: null },
 ];
 const html = renderToStaticMarkup(h(MobileChart, { points, label: 'Orders by day', headline: '60' }));
 assert.match(html, /viewBox="0 0 260 108"/);        // scales to its box, never a px height
 assert.doesNotMatch(html, /<svg[^>]*height=/);       // no measured or hard-coded plot height
 assert.doesNotMatch(html, /x="-/);                   // every mark inside the viewBox
 assert.match(html, />30</);                          // the peak is drawn, not hovered
 assert.match(html, /role="img" aria-label="Orders by day"/);
 assert.doesNotMatch(html, /type="range"/);           // bars print their values; nothing to scrub
});
test('a line scrubs instead of hovering, and crowded bars fall back to peak and latest', async () => {
 const { MobileChart } = await import('../dist/mobile.js');
 const wide = Array.from({ length: 7 }, (_, i) => ({ label: `W${32 + i}`, value: [41200, 38600, 52800, 47300, 61400, 55900, 29100][i] }));
 const usd = value => '$' + value.toLocaleString();
 const bars = renderToStaticMarkup(h(MobileChart, { points: wide, variant: 'bars', format: usd, label: 'Revenue by week' }));
 assert.equal((bars.match(/font-weight="600"/g) || []).length, 2);  // peak and latest only, no collision
 assert.doesNotMatch(bars, /x="-|x="2[7-9]\d/);                    // every label inside the viewBox
 const line = renderToStaticMarkup(h(MobileChart, { points: wide, variant: 'line', format: usd, label: 'Revenue by week' }));
 assert.match(line, /type="range"/);
 assert.match(line, /aria-valuetext="W38: \$29,100"/);
});
test('chart says so when a period has nothing, instead of drawing a flat line', async () => {
 const { MobileChart } = await import('../dist/mobile.js');
 const html = renderToStaticMarkup(h(MobileChart, { points: [{ label: 'Mon', value: null }], label: 'Orders' }));
 assert.match(html, /No data for this period/);
 assert.doesNotMatch(html, /<svg/);
});
