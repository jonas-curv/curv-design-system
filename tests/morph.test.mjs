import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as morph from '../dist/morph.js';
const h = React.createElement;
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const css = read('morph.css');
const imports = source => [...source.matchAll(/^(?:import|export)[^;]*?from\s+["']([^"']+)["']/gm)].map(m => m[1]);

const people = [
 { id: 'a', label: 'Sam Rivera', meta: 'Time off · Aug 4–8', aside: '71d', asideTone: 'hot' },
 { id: 'b', label: 'Priya Shah', meta: 'Expense · $84.20', aside: '2d' },
 { id: 'c', label: 'Alex Kim', avatarUrl: 'https://example.com/a.jpg' },
 { id: 'd', label: 'Jordan Lee' },
];

test('morph entry stands alone: React only, client, desktop entry untouched', () => {
 assert.deepEqual([...new Set(imports(read('dist/morph.js')))].sort(), ['react', 'react/jsx-runtime']);
 assert.match(read('dist/morph.js'), /^"use client";/);
 assert.doesNotMatch(read('dist/index.js'), /morph-stack|MorphStack/);
 assert.doesNotMatch(read('dist/home.js'), /MorphStack/);
});

test('package exports resolve to built files', () => {
 const pkg = JSON.parse(read('package.json'));
 assert.equal(pkg.exports['./morph'].import, './dist/morph.js');
 assert.equal(pkg.exports['./morph'].types, './dist/morph.d.ts');
 assert.equal(pkg.exports['./morph.css'], './morph.css');
 assert.ok(pkg.files.includes('morph.css'));
 for (const name of ['MorphStack', 'MorphStackButton']) assert.equal(typeof morph[name], 'function', name);
 assert.equal(typeof morph.MorphStackInput, 'object'); // forwardRef
 assert.deepEqual([morph.MORPH_OPEN_MS, morph.MORPH_CLOSE_MS, morph.MORPH_EXIT_MS], [280, 200, 180]);
});

test('collapsed: a real button with the summary and at most three faces', () => {
 const html = renderToStaticMarkup(h(morph.MorphStack, { items: people, summary: h('strong', null, '4 waiting'), title: 'Approvals', tone: 'island' }));
 assert.match(html, /class="morph" data-tone="island" data-anchor="end" data-overlay="" data-phase="closed"/);
 assert.match(html, /<button type="button" class="morph-trigger" aria-expanded="false">/);
 assert.equal((html.match(/data-morph-slot=/g) ?? []).length, 3);
 assert.match(html, />SR<\/span>/);                          // initials from the label
 assert.match(html, /<strong>4 waiting<\/strong>/);
 assert.doesNotMatch(html, /morph-panel/);                   // nothing opens on the server
});

test('open: header, count, rows with meta, hot aside, photo and actions', () => {
 const html = renderToStaticMarkup(h(morph.MorphStack, {
  items: people.map(p => ({ ...p, actions: h(morph.MorphStackButton, { variant: 'primary' }, 'Approve') })),
  summary: '4 waiting', title: 'Approvals', headerAction: h('a', { href: '/approvals' }, 'View all'), defaultOpen: true,
 }));
 assert.match(html, /data-phase="open"/);
 assert.match(html, /role="region" aria-labelledby="[^"]+"/);
 assert.match(html, /class="morph-title">Approvals<\/span><span class="morph-count">4<\/span>/);
 assert.match(html, /aria-label="Collapse" aria-expanded="true"/);
 assert.equal((html.match(/data-morph-avatar=/g) ?? []).length, 4);
 assert.match(html, /<span class="morph-aside" data-tone="hot">71d<\/span>/);
 assert.match(html, /<img src="https:\/\/example.com\/a.jpg" alt=""/);
 assert.match(html, /<button type="button" class="morph-btn" data-variant="primary">Approve<\/button>/);
 assert.match(html, /<a href="\/approvals">View all<\/a>/);
});

test('rows with href and no actions are links; count null hides the count', () => {
 const html = renderToStaticMarkup(h(morph.MorphStack, { tone: 'row', items: [{ id: 'x', label: 'Northwind', href: '/deals/1' }], summary: 's', title: 'Design assigned', count: null, defaultOpen: true }));
 assert.match(html, /<a class="morph-row-body morph-row-link morph-fade" href="\/deals\/1">/);
 assert.doesNotMatch(html, /morph-count/);
 assert.doesNotMatch(html, /data-overlay/);                  // the row tone opens in flow
});

test('empty list: the cleared line when labelled, nothing otherwise', () => {
 const cleared = renderToStaticMarkup(h(morph.MorphStack, { items: [], summary: 's', title: 't', clearedLabel: 'All clear' }));
 assert.match(cleared, /data-cleared=""/);
 assert.match(cleared, /aria-disabled="true"/);            // stays focusable when focus lands on it
 assert.match(cleared, /<span class="morph-summary">All clear<\/span>/);
 assert.equal(renderToStaticMarkup(h(morph.MorphStack, { items: [], summary: 's', title: 't' })), '');
});

test('dismiss shows on the pill and in the open header', () => {
 const html = renderToStaticMarkup(h(morph.MorphStack, { items: people, summary: 's', title: 't', onDismiss: () => {}, defaultOpen: true }));
 assert.equal((html.match(/aria-label="Dismiss"/g) ?? []).length, 2);
});

test('css: layered under utilities, every tone defined, reduced motion drops movement', () => {
 assert.match(css, /^@layer theme, base, components, utilities;/m);
 for (const tone of ['dark', 'island', 'light', 'row']) assert.match(css, new RegExp(`\\.morph\\[data-tone="${tone}"\\] \\{`));
 assert.match(css, /\.morph-row\[data-leaving\] \{/);
 assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
 assert.doesNotMatch(css, /cubic-bezier\([^)]*1\.[1-9]/);  // no overshoot curves
 assert.match(css, /\.morph-pill \{\s*max-width: calc\(100vw - 24px\);/);   // the line never runs off a phone
 assert.match(css, /@media \(max-width: 480px\)[\s\S]*?\.morph-actions \{\s*flex-basis: 100%;/); // actions wrap on phones
});
