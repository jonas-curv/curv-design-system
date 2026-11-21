// The desktop shell standard (0.5.0): page container, top bar, wordmark, sidebar, page header and toolbar, KPI,
// and the type tokens in theme.css. Static markup from the built entry; the numbers are the approved standard.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as ds from '../dist/index.js';

const h = React.createElement;
const render = (component, props, ...children) => renderToStaticMarkup(h(component, props, ...children));
const count = (html, pattern) => (html.match(pattern) || []).length;
const classOf = (html, tag) => html.match(new RegExp(`<${tag}[^>]*class="([^"]*)"`))?.[1] ?? '';
const Icon = ({ size, className }) => h('svg', { 'data-icon': '', 'data-size': size, className });

test('every new shell piece is exported, and every older one still is', () => {
  assert.equal(typeof ds.curvTailwindMergeConfig, 'object');
  for (const name of ['Wordmark', 'PageToolbar', 'SidebarToggle', 'PageHeader', 'PageContainer', 'TopBar', 'Sidebar', 'SidebarSection', 'SidebarItem', 'AppFrame', 'StatCard']) {
    assert.equal(typeof ds[name], 'function', name);
  }
});

// ── Page container ──────────────────────────────────────────────────────────

test('PageContainer: 1280 by default, 720 narrow, 1600 wide, full width when bleed; sides 24 and top 28 (16 and 20 on a phone)', () => {
  const box = props => classOf(render(ds.PageContainer, props), 'div');
  assert.match(box({}), /max-w-\[1280px\]/);
  assert.match(box({ size: 'narrow' }), /max-w-\[720px\]/);
  assert.match(box({ size: 'wide' }), /max-w-\[1600px\]/);
  const bleed = box({ bleed: true });
  assert.doesNotMatch(bleed, /max-w-/);
  assert.match(bleed, /\bw-full\b/);
  for (const cls of ['px-4', 'py-5', 'sm:px-6', 'sm:py-7']) assert.ok(box({}).split(' ').includes(cls), cls);
  assert.doesNotMatch(box({}), /sm:py-8|max-w-\[1200px\]|max-w-3xl/);
});

// ── Top bar ─────────────────────────────────────────────────────────────────

test('TopBar: the search sits at the true center from md, the phone grid is unchanged, the slots and safe areas stay', () => {
  const html = render(ds.TopBar, { logo: h('span', null, 'logo'), center: h('span', null, 'search'), actions: h('span', null, 'actions') });
  const header = classOf(html, 'header');
  assert.match(header, /md:grid-cols-\[minmax\(max-content,1fr\)_minmax\(0,35rem\)_minmax\(max-content,1fr\)\]/, 'equal 1fr sides: the search is at the true center');
  assert.match(header, /(^| )grid-cols-\[auto_1fr_auto\]/, 'below md the bar keeps its phone layout');
  assert.match(header, /h-\[calc\(3\.5rem\+env\(safe-area-inset-top\)\)\]/);
  assert.match(header, /pt-\[env\(safe-area-inset-top\)\]/);
  assert.match(header, /pl-\[max\(0\.75rem,env\(safe-area-inset-left\)\)\]/);
  assert.match(header, /pr-\[max\(0\.75rem,env\(safe-area-inset-right\)\)\]/);
  assert.ok(html.indexOf('logo') < html.indexOf('search') && html.indexOf('search') < html.indexOf('actions'), 'logo, center, actions in order');
  const phone = render(ds.TopBar, { logo: 'L', center: 'C', actions: 'A', mobileTitle: h('span', { id: 'phone' }, 'Deals') });
  assert.match(phone, /curv-mobile-adaptive-header/);
  assert.match(phone, /data-mobile-breakpoint="md"/);
  assert.equal(count(phone, /hidden md:flex/g), 2, 'logo and search hide on a phone when the app passes a phone title');
});

// ── Wordmark ────────────────────────────────────────────────────────────────

test('Wordmark: lowercase name with a superscript "os" at 0.55em, 16 / 600, tracking -0.02em, and a spoken name', () => {
  const html = render(ds.Wordmark, { name: 'Sales OS' });
  assert.match(html, /<span aria-hidden="true">sales<sup [^>]*>os<\/sup><\/span>/);
  assert.match(html, /<span class="sr-only">Sales OS<\/span>/);
  const outer = classOf(html, 'span');
  for (const cls of ['text-section', 'font-semibold', 'tracking-[-0.02em]', 'text-topbar-foreground']) assert.ok(outer.split(' ').includes(cls), cls);
  assert.doesNotMatch(outer, /font-bold|uppercase/);
  assert.match(classOf(html, 'sup'), /text-\[0\.55em\].*text-topbar-foreground\/60/);
  assert.match(render(ds.Wordmark, { name: 'customs' }), /customs<sup/);
  assert.match(render(ds.Wordmark, { name: 'curv', label: 'Curv OS home' }), />Curv OS home</);
});

// ── Sidebar ─────────────────────────────────────────────────────────────────

const nav = ({ collapsed = false, renderLink } = {}) =>
  render(
    ds.Sidebar,
    { collapsed, renderLink, header: h('input', { 'aria-label': 'Search nav' }), footer: h(ds.SidebarToggle, { collapsed, onCollapsedChange() {} }) },
    h(
      ds.SidebarSection,
      null,
      h(ds.SidebarItem, { icon: Icon, label: 'Home', href: '/' }),
      h(
        ds.SidebarItem,
        { icon: Icon, label: 'Flow', href: '/flow' },
        h(ds.SidebarItem, { icon: Icon, label: 'Inbox', href: '/flow/inbox', badge: 3, active: true }),
        h(ds.SidebarItem, { icon: Icon, label: 'Goals', href: '/flow/goals' }),
      ),
    ),
    h(
      ds.SidebarSection,
      { label: 'Pipeline', collapsible: true },
      h(ds.SidebarItem, { icon: Icon, label: 'Deals', href: '/deals', badge: 0 }),
      h(ds.SidebarItem, { icon: Icon, label: 'Quotes', comingSoon: true }),
    ),
  );

test('Sidebar: 240 wide, rows a fixed 32, 13px text, 16px icons on every row (indented ones too)', () => {
  const html = nav();
  assert.match(classOf(html, 'aside'), /\bw-60\b/);
  assert.match(html, /<nav aria-label="Main"/);
  assert.equal(count(html, /<a /g), 5, 'Home, Flow, Inbox, Goals, Deals');
  for (const row of html.match(/<a [^>]*class="[^"]*"/g)) {
    assert.match(row, /\bh-8\b/);
    assert.match(row, /\btext-body\b/);
    assert.doesNotMatch(row, /\bpy-1\.5\b/, 'height is fixed, not padding-derived');
  }
  const sizes = [...html.matchAll(/data-size="(\d+)"/g)].map(m => m[1]);
  assert.ok(sizes.length >= 5);
  assert.ok(sizes.every(size => size === '16'), 'every icon is 16px');
  assert.match(html, /href="\/flow\/inbox" class="[^"]*\bpl-7\b/, 'a child row indents');
});

test('Sidebar: section labels are 12 / 500 at 70% ink, sentence case, 28 tall', () => {
  const html = nav();
  const label = html.match(/<button type="button" id="[^"]*-label"[^>]*class="([^"]*)"/)[1];
  for (const cls of ['h-7', 'text-caption', 'font-medium', 'text-foreground/70']) assert.ok(label.split(' ').includes(cls), cls);
  assert.doesNotMatch(label, /uppercase|tracking-wide/);
  assert.match(html, /aria-expanded="true"[^>]*>.*Pipeline/);
});

test('Sidebar: a parent opens while a child is active; its row navigates and a chevron beside it folds', () => {
  const html = nav();
  assert.match(html, /href="\/flow" class="[^"]*"/);
  assert.match(html, /aria-expanded="true" aria-controls="[^"]+" aria-label="Collapse Flow"/);
  assert.match(html, /href="\/flow\/inbox"[^>]*aria-current="page"/);
  const closed = render(ds.SidebarItem, { label: 'Flow', href: '/flow' }, h(ds.SidebarItem, { label: 'Inbox', href: '/flow/inbox' }));
  assert.match(closed, /aria-label="Expand Flow"/);
  assert.doesNotMatch(closed, /Inbox/, 'no active child: closed');
  const toggleOnly = render(ds.SidebarItem, { label: 'Reports', defaultOpen: true }, h(ds.SidebarItem, { label: 'P&amp;L', href: '/pnl' }));
  assert.match(toggleOnly, /<button type="button" aria-expanded="true"[^>]*>.*Reports/, 'without href the whole row folds');
});

test('Sidebar: a count renders as the neutral chip, 0 renders nothing, comingSoon stays muted', () => {
  const html = nav();
  assert.match(html, /<span class="[^"]*rounded-full[^"]*tabular-nums[^"]*">3<\/span>/);
  assert.doesNotMatch(html, />0<\/span>/);
  assert.match(html, /aria-disabled="true"[^>]*>.*Quotes.*Soon/);
});

test('Sidebar: header and footer slots, and renderLink for the router', () => {
  const links = [];
  const html = nav({ renderLink: props => { links.push(props.href); return h('a', { ...props, 'data-router': '' }); } });
  assert.match(html, /<div class="shrink-0 px-3 pt-3"><input aria-label="Search nav"/);
  assert.match(html, /border-t border-sidebar-border p-2"><button type="button" aria-label="Collapse sidebar"/);
  assert.deepEqual(links, ['/', '/flow', '/flow/inbox', '/flow/goals', '/deals']);
  assert.equal(count(html, /data-router=""/g), 5);
});

test('Sidebar: the collapsed rail is 56 wide, icon-only, labels kept for screen readers, a dot for a count', () => {
  const html = nav({ collapsed: true });
  assert.match(classOf(html, 'aside'), /\bw-14\b/);
  assert.match(html, /data-collapsed=""/);
  assert.match(html, /<span class="min-w-0 flex-1 truncate sr-only">Deals<\/span>/);
  assert.match(html, /<span id="[^"]+-label" class="sr-only">Pipeline<\/span><ul aria-labelledby="[^"]+-label"/, 'the section name stays for screen readers');
  assert.doesNotMatch(html, /aria-label="Collapse Flow"/, 'no chevron in the rail');
  assert.match(html, /size-1\.5 rounded-full bg-foreground/, 'the count becomes a dot');
  assert.match(html, /<span class="sr-only">, 3<\/span>/);
  assert.match(html, /aria-label="Expand sidebar"/);
  assert.doesNotMatch(html.match(/href="\/flow\/inbox" class="([^"]*)"/)[1], /\bpl-7\b/, 'no indent in the rail');
});

test('Sidebar: the API apps already use still renders as before', () => {
  const html = render(ds.SidebarSection, { label: 'Leads' }, h(ds.SidebarItem, { label: 'Raw leads', onClick() {}, indent: true, trailing: h('em', null, 'new') }));
  assert.match(html, /<button type="button" class="[^"]*\bpl-7\b[^"]*"><span class="min-w-0 flex-1 truncate">Raw leads<\/span><span class="shrink-0"><em>new<\/em><\/span><\/button>/);
});

// ── Page header, toolbar, KPI ───────────────────────────────────────────────

test('PageHeader: a detail-page title is 20 / 600; the older props still render', () => {
  const html = render(ds.PageHeader, { title: 'Northwind Co.', eyebrow: 'Customers', count: '12', description: 'Since 2021', actions: h('button', null, 'Edit') });
  const title = classOf(html, 'h1');
  for (const cls of ['text-xl', 'font-semibold', 'tracking-tight']) assert.ok(title.split(' ').includes(cls), cls);
  assert.doesNotMatch(title, /text-2xl/);
  for (const text of ['Customers', '12', 'Since 2021', 'Edit']) assert.match(html, new RegExp(`>${text}<`));
});

test('PageToolbar: a hidden h1 and ONE wrapping control row, controls left, actions right, 8 apart', () => {
  const html = render(ds.PageToolbar, { title: 'Deals', controls: h('span', null, 'views'), actions: h('span', null, 'New deal') });
  assert.match(html, /<h1 class="sr-only">Deals<\/h1>/);
  const row = classOf(html, 'div');
  for (const cls of ['flex', 'flex-wrap', 'items-center', 'gap-2', 'min-h-9']) assert.ok(row.split(' ').includes(cls), cls);
  assert.match(html, /<div class="ml-auto flex flex-wrap items-center gap-2"><span>New deal<\/span><\/div>/);
  assert.ok(html.indexOf('views') < html.indexOf('New deal'));
});

test('StatCard: value 24 / 600 tabular, label 12 / 500 muted, card padding 20 × 16', () => {
  const html = render(ds.StatCard, { label: 'Open pipeline', value: '$2.41M' });
  assert.match(html, /<span class="truncate text-caption font-medium text-muted-foreground">Open pipeline<\/span>/);
  assert.match(html, /<span class="text-figure font-semibold tracking-tight tabular-nums text-foreground">\$2\.41M<\/span>/);
  assert.doesNotMatch(html, /text-\[26px\]/);
  assert.match(classOf(html, 'div'), /\bpx-5 py-4\b/);
});

// ── Type tokens ─────────────────────────────────────────────────────────────

test('theme.css defines the seven type sizes as Tailwind theme tokens, and no color token changed name', () => {
  const css = readFileSync(new URL('../theme.css', import.meta.url), 'utf8');
  const scale = { display: [2, 2.5], figure: [1.5, 2], title: [1.25, 1.75], section: [1, 1.5], body: [0.8125, 1.25], caption: [0.75, 1], micro: [0.6875, 1] };
  for (const [name, [size, lineHeight]] of Object.entries(scale)) {
    assert.match(css, new RegExp(`--text-${name}: ${size}rem;`), name);
    assert.match(css, new RegExp(`--text-${name}--line-height: ${lineHeight}rem;`), `${name} line height`);
  }
  // 0.5.1 restored the readability-audit inks (tests/theme-contrast.test.mjs).
  for (const token of ['--background: #FCFCFD', '--foreground: #1B1B1B', '--muted-foreground: #66666A', '--sidebar: #F3F3F4', '--topbar: #1B1B1B', '--text-2: #66666A', '--text-3: #747478']) {
    assert.ok(css.includes(token), token);
  }
});

test('cn keeps a type token next to a text colour: tailwind-merge knows they are sizes', () => {
  assert.equal(ds.cn('text-body', 'text-foreground/80'), 'text-body text-foreground/80');
  assert.equal(ds.cn('text-section font-semibold', 'text-topbar-foreground'), 'text-section font-semibold text-topbar-foreground');
  assert.equal(ds.cn('text-body', 'text-caption'), 'text-caption', 'two sizes still merge to the last');
  assert.equal(ds.cn('text-[13px]', 'text-caption'), 'text-caption');
});
