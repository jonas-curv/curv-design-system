import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DataTable, MobileBottomNav, AppFrame } from '../dist/index.js';
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
 assert.match(html, /aria-label="Sort records"/);
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
