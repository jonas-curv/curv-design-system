import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as mobile from '../dist/mobile.js';

const h = React.createElement;
const render = node => renderToStaticMarkup(node);
const count = (html, pattern) => (html.match(pattern) || []).length;
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('the content components are exported from the mobile entry', () => {
  for (const name of [
    'MobileFlatList', 'MobileListSection', 'MobileListRow', 'MobileException', 'MobileListToolbar', 'MobileViewChips',
    'MobileSwipeRow', 'MobileActivityCards', 'MobileHeroPanel', 'MobileHeroAction', 'MobileStageBoard', 'MobileKeyValueList', 'MobileGallery',
    'MobileStatusPill', 'MobileMoveSheet', 'MobileChartCard', 'mobileButtonClassName', 'MobileOptionList',
  ]) assert.equal(typeof mobile[name], 'function', name);
  // Components that forward a ref are React objects, not plain functions.
  for (const name of ['MobileButton', 'MobileOptionRow']) assert.equal(typeof mobile[name], 'object', name);
});

test('every class the content components use is styled in mobile.css', () => {
  const dir = 'src/components/shell/mobile-content';
  const source = readdirSync(new URL(`../${dir}`, import.meta.url)).filter(file => file.endsWith('.tsx')).map(file => read(`${dir}/${file}`)).join('\n')
    + read('src/components/shell/mobile-chart.tsx');
  const css = read('mobile.css');
  // Classes built from a template (`...-pill-${tone}`) end in a dash here and are covered by the tone tests below.
  // A custom property (`--curv-mobile-gutter`, named in a comment) is not a class.
  const used = [...new Set(source.match(/(?<!-)curv-mobile-[a-z0-9-]+/g))].filter(name => !name.endsWith('-'));
  const missing = used.filter(name => !css.includes(`.${name}`));
  assert.deepEqual(missing, []);
});

// ── Flat list ───────────────────────────────────────────────────────────────

test('a list row is one real link, with a thumbnail image or a placeholder, and its status pill carries the tone', () => {
  const html = render(h(mobile.MobileFlatList, { label: 'Products' },
    h(mobile.MobileListRow, {
      title: 'Ocean Mist throw', thumbnail: '/photos/ocean.jpg', thumbnailAlt: 'Ocean Mist throw',
      meta: h(React.Fragment, null, '1,182 sellable'), status: { label: 'Healthy', tone: 'positive' }, href: '/products/ocean',
    }),
    h(mobile.MobileListRow, { title: 'No photo yet', thumbnail: null, status: { label: 'Launching', tone: 'special' }, href: '/products/new' }),
    h(mobile.MobileListRow, { title: 'Plain row', meta: 'No thumbnail' }),
  ));
  assert.match(html, /role="list" aria-label="Products"/);
  assert.equal(count(html, /role="listitem"/g), 3);
  assert.equal(count(html, /<a /g), 2);                                   // one link per linked row, nothing nested
  assert.match(html, /<img src="\/photos\/ocean.jpg" alt="Ocean Mist throw"/);
  assert.match(html, /width="48" height="48"/);
  assert.match(html, /data-empty="true"[^>]*><svg/);                      // null thumbnail: the neutral box placeholder
  assert.equal(count(html, /<img /g), 1);
  assert.equal(count(html, /data-thumb="true"/g), 2);                     // the plain row has no thumbnail and a 20px inset
  assert.match(html, /curv-mobile-flat-pill curv-mobile-flat-pill-positive">Healthy</);
  assert.match(html, /curv-mobile-flat-pill-special">Launching</);
});

test('every status tone has its own pill class', () => {
  for (const tone of ['positive', 'critical', 'warning', 'info', 'special', 'neutral']) {
    const html = render(h(mobile.MobileListRow, { title: 'x', status: { label: tone, tone } }));
    assert.match(html, new RegExp(`curv-mobile-flat-pill curv-mobile-flat-pill-${tone}">${tone}<`));
    assert.ok(read('mobile.css').includes(`.curv-mobile-flat-pill-${tone}`), tone);
  }
});

test('a problem is red text inside the meta line, not a second badge', () => {
  const html = render(h(mobile.MobileListRow, {
    title: 'Dune rug', href: '/p/1', status: { label: 'Low stock', tone: 'critical' },
    meta: h(React.Fragment, null, h(mobile.MobileException, null, '0 sellable'), ' · 14 on order'),
  }));
  assert.match(html, /<span class="curv-mobile-flat-meta"><span class="curv-mobile-flat-exception">0 sellable<\/span> · 14 on order<\/span>/);
  assert.equal(count(html, /curv-mobile-flat-pill /g), 1);                // one pill per row
});

test('an unread row says so in text, and the dot itself is hidden from assistive tech', () => {
  const html = render(h(mobile.MobileListRow, { title: 'Sam replied', unread: true, href: '/inbox/1' }));
  assert.match(html, /curv-mobile-flat-unread" aria-hidden="true"/);
  assert.match(html, /<span class="curv-mobile-content-vh">Unread<\/span>/);
  assert.match(render(h(mobile.MobileListRow, { title: 'x', unread: true, unreadLabel: 'Ulesen', onClick() {} })), />Ulesen</);
  assert.doesNotMatch(render(h(mobile.MobileListRow, { title: 'Read row', href: '/r' })), /Unread|curv-mobile-flat-unread/);
});

test('a trailing button sits beside the row link, never inside it', () => {
  const html = render(h(mobile.MobileListRow, {
    title: 'Approval: 40 units', href: '/approvals/9', trailing: h('button', { type: 'button' }, 'Approve'), status: { label: 'Waiting', tone: 'info' },
  }));
  const link = html.match(/<a [^>]*>[\s\S]*?<\/a>/)[0];
  assert.doesNotMatch(link, /<button/);
  assert.match(html, /<\/a><span class="curv-mobile-flat-trailing"><button type="button">Approve<\/button><\/span>/);
  assert.equal(count(html, /<button /g), 1);
});

test('a row with onClick is a button; one with neither is plain; renderLink supplies the app router link', () => {
  assert.match(render(h(mobile.MobileListRow, { title: 'Open', onClick() {} })), /<button type="button" class="curv-mobile-flat-target curv-mobile-flat-link"/);
  const plain = render(h(mobile.MobileListRow, { title: 'Static' }));
  assert.doesNotMatch(plain, /<a |<button/);
  assert.doesNotMatch(plain, /curv-mobile-flat-link/);
  const routed = render(h(mobile.MobileListRow, {
    title: 'Routed', href: '/x',
    renderLink: ({ href, className, children }) => h('a', { href, className, 'data-router': 'yes' }, children),
  }));
  assert.match(routed, /<a href="\/x" class="curv-mobile-flat-target curv-mobile-flat-link" data-router="yes">/);
});

test('a list section labels its list with its heading', () => {
  const html = render(h(mobile.MobileListSection, { title: 'Today', trailing: '3 new' }, h(mobile.MobileFlatList, { label: 'Today' }, h(mobile.MobileListRow, { title: 'A' }))));
  const id = html.match(/<h2 id="([^"]+)"/)[1];
  assert.ok(html.includes(`aria-labelledby="${id}"`));
  assert.match(html, /<h2[^>]*>Today<\/h2>/);
  assert.match(html, /curv-mobile-flat-section-trailing">3 new</);
});

// ── Toolbar and view chips ──────────────────────────────────────────────────

test('the toolbar is a labelled search field plus Sort and Filter buttons, with a filter badge', () => {
  const html = render(h(mobile.MobileListToolbar, {
    search: { value: 'rug', onChange() {}, placeholder: 'Search products', label: 'Search products' },
    onSort() {}, sortLabel: 'Sort products', onFilter() {}, filterLabel: 'Filter products', filterCount: 3,
  }));
  assert.match(html, /<input type="search" aria-label="Search products" placeholder="Search products"[^>]* value="rug"\/>/);
  assert.match(html, /aria-label="Sort products"/);
  assert.match(html, /aria-label="Filter products \(3\)"/);
  assert.match(html, /curv-mobile-toolbar-badge" aria-hidden="true">3</);
  const bare = render(h(mobile.MobileListToolbar, { search: { value: '', onChange() {}, label: 'Search' } }));
  assert.doesNotMatch(bare, /<button/);                                    // no handler, no dead button
  assert.doesNotMatch(render(h(mobile.MobileListToolbar, { search: { value: '', onChange() {}, label: 'S' }, onFilter() {}, filterCount: 0 })), /badge/);
});

test('view chips mark the active chip: aria-pressed on buttons, aria-current on links', () => {
  const items = [{ id: 'all', label: 'All', count: 1182, active: true }, { id: 'low', label: 'Low stock', count: 14 }, { id: 'new', label: 'Launching' }];
  const buttons = render(h(mobile.MobileViewChips, { label: 'Saved views', items, onSelect() {} }));
  assert.match(buttons, /role="group" aria-label="Saved views"/);
  assert.equal(count(buttons, /aria-pressed="true"/g), 1);
  assert.equal(count(buttons, /aria-pressed="false"/g), 2);
  assert.match(buttons, /curv-mobile-view-chip-count">1,182</);
  assert.match(buttons, /data-active="true"/);
  const links = render(h(mobile.MobileViewChips, { label: 'Saved views', items: items.map(item => ({ ...item, href: `/p?view=${item.id}` })) }));
  assert.equal(count(links, /<a /g), 3);
  assert.equal(count(links, /aria-current="page"/g), 1);
  assert.doesNotMatch(links, /aria-pressed/);
});

// ── Swipe row ───────────────────────────────────────────────────────────────

test('a swipe row always offers its actions without swiping, and caps them at two', () => {
  const action = (id, tone) => ({ id, label: id[0].toUpperCase() + id.slice(1), tone, onAction() {} });
  const html = render(h(mobile.MobileSwipeRow, {
    actionsLabel: 'Row actions', actions: [action('reply', 'primary'), action('done', 'positive'), action('extra', 'neutral')],
  }, h(mobile.MobileListRow, { title: 'Project update', href: '/inbox/1' })));
  assert.match(html, /<button type="button" class="curv-mobile-swipe-trigger" aria-label="Row actions" aria-expanded="false" aria-controls="[^"]+">/);
  assert.match(html, /role="group" aria-label="Row actions"/);
  assert.match(html, /curv-mobile-swipe-action curv-mobile-swipe-action-primary"><span>Reply</);
  assert.match(html, /curv-mobile-swipe-action-positive"><span>Done</);
  assert.doesNotMatch(html, /Extra/);
  assert.match(html, /--curv-swipe-width:144px/);                          // two 72px actions
  assert.match(html, /data-open="false"/);
  assert.equal(count(html, /<a /g), 1);                                    // the row's own link still works
});

test('a swipe row with no actions is just its child', () => {
  const html = render(h(mobile.MobileSwipeRow, { actions: [], actionsLabel: 'Actions' }, h('p', null, 'Row')));
  assert.equal(html, '<p>Row</p>');
});

// ── Activity cards ──────────────────────────────────────────────────────────

test('activity cards are links, and a critical count is marked', () => {
  const html = render(h(mobile.MobileActivityCards, {
    title: "Here's what needs you",
    items: [
      { id: 'late', label: 'Late POs', value: 4, tone: 'critical', href: '/pos?late=1', icon: h('svg') },
      { id: 'reviews', label: 'Reviews to answer', value: 12, href: '/reviews' },
    ],
  }));
  assert.match(html, /<h2 id="[^"]+" class="curv-mobile-activity-title">Here&#x27;s what needs you<\/h2>/);
  assert.equal(count(html, /<a /g), 2);
  assert.match(html, /href="\/pos\?late=1" class="curv-mobile-activity-card"/);
  assert.match(html, /curv-mobile-activity-value" data-tone="critical">4</);
  assert.match(html, /curv-mobile-activity-value">12</);
  assert.equal(count(html, /data-tone="critical"/g), 1);
  assert.match(html, /curv-mobile-activity-icon" aria-hidden="true"/);
  assert.match(html, /<ul class="curv-mobile-activity-rail" role="list">/);
  assert.doesNotMatch(render(h(mobile.MobileActivityCards, { items: [] })), /<h2/);
});

// ── Hero panel and the dark chart ───────────────────────────────────────────

const kpis = [
  { id: 'revenue', label: 'Revenue', value: '$48,200', delta: { label: '+4.2%', tone: 'positive' } },
  { id: 'orders', label: 'Orders', value: '1,204', delta: { label: '-3.1%', tone: 'critical' } },
  { id: 'units', label: 'Units', value: '2,930' },
];

test('the hero panel marks the active KPI and hosts the chart and the buttons it is given', () => {
  const html = render(h(mobile.MobileHeroPanel, {
    kpis, activeKpiId: 'orders', onKpiChange() {}, label: 'Overview',
    chart: h('div', { id: 'chart-slot' }, 'chart'),
    actions: h(React.Fragment, null, h(mobile.MobileHeroAction, null, 'Report'), h(mobile.MobileHeroAction, { href: '/inventory', icon: h('svg') }, 'Inventory')),
  }));
  assert.equal(count(html, /aria-pressed="true"/g), 1);
  assert.match(html, /aria-pressed="true"[^>]*><span class="curv-mobile-hero-kpi-body" data-active="true"><span class="curv-mobile-hero-kpi-label">Orders/);
  assert.equal(count(html, /aria-pressed="false"/g), 2);
  assert.match(html, /curv-mobile-hero-kpi-delta" data-tone="positive">\+4.2%</);
  assert.match(html, /curv-mobile-hero-kpi-delta" data-tone="critical">-3.1%</);
  assert.match(html, /id="chart-slot"/);
  assert.match(html, /<button type="button" class="curv-mobile-hero-action"><span>Report<\/span>/);
  assert.match(html, /<a href="\/inventory" class="curv-mobile-hero-action"><span class="curv-mobile-hero-action-icon" aria-hidden="true">/);
  assert.doesNotMatch(render(h(mobile.MobileHeroPanel, { kpis, activeKpiId: 'units', chart: null })), /curv-mobile-hero-actions/);
});

test('hero KPIs with an href are links and the active one is current', () => {
  const html = render(h(mobile.MobileHeroPanel, { kpis: kpis.map(kpi => ({ ...kpi, href: `/?kpi=${kpi.id}` })), activeKpiId: 'revenue', chart: null }));
  assert.equal(count(html, /<a /g), 3);
  assert.equal(count(html, /aria-current="true"/g), 1);
  assert.doesNotMatch(html, /aria-pressed/);
});

const days = Array.from({ length: 6 }, (_, i) => ({ label: `Oct ${i + 1}`, value: [2100, 2400, 2250, 2600, 2380, 1200][i] }));

test('the dark chart tone adds gridlines, a comparison line, a dashed partial point and room for future days', () => {
  const { MobileChart } = mobile;
  const html = render(h(MobileChart, {
    points: days.map((p, i) => (i === 5 ? { ...p, partial: true } : p)), variant: 'line', tone: 'dark',
    referenceLine: { value: 2332, label: 'Sep avg' }, futureSlots: 25, endLabel: 'Oct 31', label: 'Revenue, October 1 to 6',
  }));
  assert.match(html, /<figure class="curv-mobile-chart curv-mobile-chart-dark">/);
  assert.equal(count(html, /<line class="curv-mobile-chart-grid"/g), 3);
  assert.match(html, /curv-mobile-chart-ref-label"[^>]*>Sep avg 2,332</);
  assert.match(html, /aria-label="Revenue, October 1 to 6. Sep avg 2,332. Latest period, Oct 6 so far"/);   // the summary names the comparison and that the last point is not final
  assert.match(html, /curv-mobile-chart-line curv-mobile-chart-line-partial"[^>]*stroke-dasharray="3 4"/);
  assert.match(html, /curv-mobile-chart-dot curv-mobile-chart-dot-partial"/);   // hollow: so far, not final
  assert.match(html, />Oct 31</);
  assert.match(html, />Oct 1</);
  // 6 of 31 slots: the last real point sits in the left fifth of the plot, with the rest left empty.
  const lastDotX = Number(html.match(/curv-mobile-chart-dot-partial" cx="([\d.]+)"/)[1]);
  assert.ok(lastDotX < 260 * 0.25, `last point x=${lastDotX}`);
  assert.doesNotMatch(html, /x="-/);
});

test('MobileChart without the new props renders as before', () => {
  const { MobileChart } = mobile;
  const html = render(h(MobileChart, { points: days, variant: 'line', label: 'Orders' }));
  assert.doesNotMatch(html, /curv-mobile-chart-dark|curv-mobile-chart-grid|curv-mobile-chart-ref-label|dot-partial|line-partial/);
  assert.match(html, /role="img" aria-label="Orders"/);
  assert.match(html, /viewBox="0 0 260 108"/);
  assert.match(html, />Oct 6</);                                            // the last label is still the right axis end
  const bars = render(h(MobileChart, { points: [{ label: 'A', value: 3 }, { label: 'B', value: 5, partial: true }], label: 'Bars' }));
  assert.match(bars, /stroke-dasharray="3 2"/);                            // a partial bar is outlined, not solid
});

// ── Stage board ─────────────────────────────────────────────────────────────

const columns = [
  { id: 'todo', label: 'To do', shortLabel: 'To do', count: 2, cards: [
    { id: 'c1', title: 'Spring catalog', href: '/projects/1', cover: { src: '/c1.jpg', alt: 'Catalog cover' }, avatar: { initials: 'JJ', color: '#7a5af8', label: 'Jonas Johansson' }, date: { label: 'Oct 12', late: true }, badge: { label: 'At risk', tone: 'warning' } },
    { id: 'c2', title: 'Packaging review', href: '/projects/2', date: { label: 'Nov 3' } },
  ] },
  { id: 'doing', label: 'In production', shortLabel: 'Making', count: 128, cards: [
    { id: 'c3', title: 'Dune rug v2', href: '/projects/3', badge: { label: 'Off track', tone: 'critical' } },
  ] },
  { id: 'done', label: 'Done', count: 0, cards: [] },
];

test('the board shows stage chips with counts, the active column, and every card as a link', () => {
  const html = render(h(mobile.MobileStageBoard, { label: 'Projects by stage', columns, activeColumnId: 'doing', emptyLabel: 'Nothing here' }));
  assert.match(html, /<section class="curv-mobile-board" aria-label="Projects by stage">/);
  assert.equal(count(html, /curv-mobile-board-chip"/g), 3);
  assert.equal(count(html, /aria-pressed="true"/g), 1);
  assert.match(html, /aria-pressed="true" aria-label="In production, 128"[^>]*><span>Making<\/span><span class="curv-mobile-board-chip-count">128</);
  assert.match(html, /<span>To do<\/span><span class="curv-mobile-board-chip-count">2</);
  assert.equal(count(html, /data-active="true"/g), 1);
  assert.match(html, /<section class="curv-mobile-board-column" aria-labelledby="[^"]+" data-active="true"><div class="curv-mobile-board-column-inner"><h3[^>]*><span>In production</);
  assert.equal(count(html, /curv-mobile-board-card-link"/g), 3);
  assert.match(html, /href="\/projects\/1" class="curv-mobile-board-card-link"/);
  assert.match(html, /<img class="curv-mobile-board-cover" src="\/c1.jpg" alt="Catalog cover"/);
  assert.equal(count(html, /curv-mobile-board-cover/g), 1);                // a cover only when one exists
  assert.match(html, /role="img" aria-label="Jonas Johansson" style="background:#7a5af8">JJ</);
  assert.match(html, /curv-mobile-board-badge curv-mobile-board-badge-warning">At risk</);
  assert.match(html, /curv-mobile-board-badge-critical">Off track</);
  assert.match(html, /Nothing here/);                                       // the empty column says so
  assert.equal(count(html, /curv-mobile-board-empty/g), 1);
});

test('a late date is marked in markup, not only in colour; an on-time date is not', () => {
  const html = render(h(mobile.MobileStageBoard, { label: 'Board', columns, activeColumnId: 'todo' }));
  assert.equal(count(html, /data-late="true"/g), 1);
  assert.match(html, /data-late="true"><span class="curv-mobile-content-vh">Late: <\/span>Oct 12</);
  assert.match(html, /curv-mobile-board-date">Nov 3</);
});

test('move controls exist only when the app can handle a move', () => {
  const without = render(h(mobile.MobileStageBoard, { label: 'Board', columns, activeColumnId: 'todo' }));
  assert.doesNotMatch(without, /Move to|curv-mobile-board-move|data-movable/);
  const withMove = render(h(mobile.MobileStageBoard, { label: 'Board', columns, activeColumnId: 'todo', onMove() {} }));
  assert.equal(count(withMove, /curv-mobile-board-move"/g), 3);             // one per card
  assert.match(withMove, /aria-label="Move to…: Spring catalog"/);
  assert.equal(count(withMove, /data-movable="true"/g), 3);
  const localised = render(h(mobile.MobileStageBoard, { label: 'Board', columns, activeColumnId: 'todo', onMove() {}, moveLabel: name => `Flytt til ${name}` }));
  assert.match(localised, /aria-label="Flytt til…: Packaging review"/);
  assert.doesNotMatch(localised, /Move to/);
  assert.doesNotMatch(withMove, /curv-mobile-sheet|role="dialog"/);         // the sheet mounts only when opened
});

// ── Key-value list ──────────────────────────────────────────────────────────

test('key-value rows put the label left and a tabular value right, with a chevron only on links', () => {
  const html = render(h(mobile.MobileKeyValueList, {
    title: 'Money, last 30 days', trailing: 'as of 9:41',
    rows: [
      { id: 'rev', label: 'Revenue', sub: 'After refunds', value: '$48,200', valueSub: '+4.2% vs prior', valueTone: 'positive' },
      { id: 'ret', label: 'Returns', value: '$2,100', valueTone: 'critical', href: '/returns' },
      { id: 'cost', label: 'Landed cost', value: '$9.40', valueTone: 'neutral' },
    ],
  }));
  assert.match(html, /<h2 id="[^"]+">Money, last 30 days<\/h2>/);
  assert.match(html, /curv-mobile-kv-trailing">as of 9:41</);
  assert.match(html, /<ul class="curv-mobile-kv-card" role="list" aria-labelledby="/);
  assert.equal(count(html, /<li /g), 3);
  assert.match(html, /<span>Revenue<\/span><span class="curv-mobile-kv-sub">After refunds</);
  assert.match(html, /curv-mobile-kv-value" data-tone="positive"><span>\$48,200<\/span><span class="curv-mobile-kv-sub">\+4.2% vs prior</);
  assert.match(html, /data-tone="critical"/);
  assert.equal(count(html, /data-tone=/g), 2);                              // neutral carries no tone
  assert.equal(count(html, /<a /g), 1);
  assert.equal(count(html, /curv-mobile-kv-chevron/g), 1);
  assert.match(html, /<a href="\/returns" class="curv-mobile-kv-line curv-mobile-kv-link">/);
});

// ── Gallery ─────────────────────────────────────────────────────────────────

test('the gallery renders every photo, a thumbnail button for each, and the pager text', () => {
  const images = [{ src: '/a.jpg', alt: 'Front' }, { src: '/b.jpg', alt: 'Side' }, { src: '/c.jpg', alt: 'Detail' }];
  const html = render(h(mobile.MobileGallery, { images, label: 'Product photos' }));
  assert.match(html, /role="group" aria-label="Product photos" tabindex="0"/);
  assert.equal(count(html, /curv-mobile-gallery-slide"/g), 3);
  assert.equal(count(html, /<img /g), 6);                                   // three photos, three thumbnails
  assert.match(html, /<img src="\/a.jpg" alt="Front" loading="eager"/);
  assert.match(html, /<img src="\/b.jpg" alt="Side" loading="lazy"/);
  assert.equal(count(html, /<button /g), 3);
  assert.match(html, /aria-label="Photo 2: Side"/);
  assert.equal(count(html, /aria-current="true"/g), 1);                     // the current thumbnail, once
  assert.match(html, /aria-live="polite" aria-atomic="true">Photo 1 of 3</);
  assert.equal(count(html, /curv-mobile-gallery-dot"/g), 3);
  assert.equal(count(html, /curv-mobile-gallery-dot" data-current="true"/g), 1);
});

test('one photo needs no pager or thumbnails, and no photos renders nothing', () => {
  const single = render(h(mobile.MobileGallery, { images: [{ src: '/a.jpg', alt: 'Front' }], label: 'Photos' }));
  assert.doesNotMatch(single, /pager|thumb|<button/);
  assert.equal(count(single, /<img /g), 1);
  assert.equal(render(h(mobile.MobileGallery, { images: [], label: 'Photos' })), '');
});

// ── Review fixes ────────────────────────────────────────────────────────────

test('a hero KPI with neither an href nor a panel handler is plain text; with either it stays a control', () => {
  const info = [{ id: 'rev', label: 'Revenue', value: '$48,200' }, { id: 'per', label: 'Per day', value: '$1,606' }];
  const text = render(h(mobile.MobileHeroPanel, { kpis: info, activeKpiId: 'rev', chart: null }));
  assert.doesNotMatch(text, /<button|<a |aria-pressed|aria-current/);
  assert.equal(count(text, /<div class="curv-mobile-hero-kpi">/g), 2);
  assert.match(text, /<div class="curv-mobile-hero-kpi"><span class="curv-mobile-hero-kpi-body" data-active="true"><span class="curv-mobile-hero-kpi-label">Revenue/);
  const buttons = render(h(mobile.MobileHeroPanel, { kpis: info, activeKpiId: 'rev', chart: null, onKpiChange() {} }));
  assert.equal(count(buttons, /<button type="button" class="curv-mobile-hero-kpi" aria-pressed/g), 2);
  assert.doesNotMatch(buttons, /<div class="curv-mobile-hero-kpi"/);
  // A selectable link beside an informational chip: the URL holds the selection, the chip only informs.
  const mixed = render(h(mobile.MobileHeroPanel, { kpis: [{ ...info[0], href: '/?kpi=rev' }, info[1]], activeKpiId: 'rev', chart: null }));
  assert.equal(count(mixed, /<a href="\/\?kpi=rev" class="curv-mobile-hero-kpi" aria-current="true">/g), 1);
  assert.equal(count(mixed, /<div class="curv-mobile-hero-kpi">/g), 1);
});

test('the hero panel owns its rounded bottom corners, 18px like the surface', () => {
  assert.match(read('mobile.css'), /\.curv-mobile-hero \{[^}]*border-radius: 0 0 18px 18px/);
  assert.match(read('mobile.css'), /\.curv-mobile-hero-kpi:not\(a, button\) \{ cursor: default; \}/);
});

test('a line chart with future slots does not scrub by default; an explicit scrub is sized to the plotted part', () => {
  const { MobileChart } = mobile;
  const base = { points: days, variant: 'line', label: 'Revenue', futureSlots: 25 };
  assert.doesNotMatch(render(h(MobileChart, base)), /type="range"/);
  assert.match(render(h(MobileChart, { points: days, variant: 'line', label: 'Revenue' })), /type="range"/);
  const html = render(h(MobileChart, { ...base, scrub: true }));
  const width = Number(html.match(/class="curv-mobile-chart-scrub"[^>]*style="width:([\d.]+)%"/)[1]);
  assert.ok(width > 15 && width < 30, `scrub width ${width}%`);       // 6 of 31 slots: about a fifth, not the full width
  assert.doesNotMatch(render(h(MobileChart, { points: days, variant: 'line', label: 'Revenue', scrub: true })), /class="curv-mobile-chart-scrub"[^>]*style=/);
});

test('a partial point says "so far" in the readout, the slider text and the chart summary', () => {
  const { MobileChart } = mobile;
  const points = days.map((p, i) => (i === 5 ? { ...p, partial: true } : p));
  const html = render(h(MobileChart, { points, variant: 'line', label: 'Revenue', scrub: true }));
  assert.match(html, /aria-valuetext="Oct 6 so far: 1,200"/);
  assert.match(html, /<span>Oct 6 so far<\/span><strong>1,200<\/strong>/);
  assert.match(html, /role="img" aria-label="Revenue. Latest period, Oct 6 so far"/);
  assert.match(render(h(MobileChart, { points, variant: 'line', label: 'Revenue', scrub: true, partialLabel: 'hittil' })), /<span>Oct 6 hittil<\/span>/);
  assert.doesNotMatch(render(h(MobileChart, { points: days, variant: 'line', label: 'Revenue' })), /so far/);
});

test('board ids built from app ids with spaces never split aria-labelledby', () => {
  const spaced = [{ id: 'in production', label: 'In production', count: 1, cards: [] }, { id: 'done', label: 'Done', count: 0, cards: [] }];
  const html = render(h(mobile.MobileStageBoard, { label: 'Board', columns: spaced, activeColumnId: 'done' }));
  const ids = [...html.matchAll(/aria-labelledby="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, 2);
  for (const id of ids) { assert.doesNotMatch(id, /\s/); assert.ok(html.includes(`id="${id}"`)); }
});

test('light-only surfaces carry their own ink and the move sheet follows the theme', () => {
  const css = read('mobile.css');
  const rules = [...css.matchAll(/(^|\n)([^\n{}@/][^\n{]*) \{([^}]*)\}/g)].map(match => ({ selector: match[2], body: match[3] }));
  const light = rules.filter(({ selector, body }) => /background: var\(--curv-mobile-surface,/.test(body) && /^\.curv-mobile-(flat|toolbar|view-chips|swipe|activity|board|kv|chart-card)/.test(selector) && !/::|:active|:hover|:focus/.test(selector));
  assert.ok(light.length >= 9);   // the chips left this list when they took their own grey fill (see the chip test)
  const bare = light.filter(({ body }) => !/(^|[ ;])color: var\(--curv-mobile-ink[^;]*;/.test(body) && !/(^|[ ;])color: var\(--curv-mobile-(chip)/.test(body)).map(({ selector }) => selector);
  assert.deepEqual(bare, []);
  // The move sheet's rows and the option rows are one rule set, so look the rule up by membership of its selector list.
  const option = rules.find(({ selector }) => selector.split(', ').includes('.curv-mobile-board-move-option')).body;
  assert.match(option, /(^|[ ;])color: inherit;/);
  assert.doesNotMatch(option, /#1b1b1b/);
  assert.match(rules.find(({ selector }) => selector.split(', ').includes('.curv-mobile-board-move-option .curv-mobile-board-chip-count')).body, /color: var\(--muted-foreground, #6b6b6f\)/);
});

test('the warning pill is the board\'s amber, so "At risk" looks the same in a list and on a card', () => {
  const css = read('mobile.css');
  const pill = css.match(/\.curv-mobile-flat-pill-warning \{([^}]*)\}/)[1];
  const badge = css.match(/\.curv-mobile-board-badge-warning \{([^}]*)\}/)[1];
  for (const part of [/background: var\(--curv-mobile-board-warning-bg, #fdf1dc\)/, /color: var\(--curv-mobile-board-warning-fg, #8a4e00\)/]) {
    assert.match(pill, part);
    assert.match(badge, part);
  }
  assert.match(render(h(mobile.MobileListRow, { title: 'Spring catalog', status: { label: 'At risk', tone: 'warning' } })), /curv-mobile-flat-pill curv-mobile-flat-pill-warning">At risk</);
});

// ── Added for the first adopter (0.3.1) ─────────────────────────────────────

// Every rule whose selector list names `selector`, as [text, selectors, body]. Commas inside parentheses (`:is(a, b)`) do not split a list.
const cssRules = selector => [...read('mobile.css').matchAll(/(^|\n)([^\n{}@/][^\n{]*) \{([^}]*)\}/g)]
  .filter(item => item[2].split(/,(?![^(]*\))/).map(part => part.trim()).includes(selector));
const cssRule = selector => {
  const rules = cssRules(selector);
  assert.ok(rules.length, `a rule for ${selector}`);
  // The declarations of every rule that names the selector, as one body: what the cascade gives it before specificity.
  return [rules[0][0], rules[0][1], rules[0][2], rules.map(rule => rule[3]).join(' ')];
};

test('the status pill stands alone and is exactly the pill a list row draws', () => {
  for (const tone of ['positive', 'critical', 'warning', 'info', 'special', 'neutral']) {
    const pill = render(h(mobile.MobileStatusPill, { label: 'At risk', tone }));
    assert.equal(pill, `<span class="curv-mobile-flat-pill curv-mobile-flat-pill-${tone}">At risk</span>`);
    assert.ok(render(h(mobile.MobileListRow, { title: 'x', status: { label: 'At risk', tone } })).includes(pill), `a row draws the same markup for ${tone}`);
  }
  assert.equal(render(h(mobile.MobileStatusPill, { label: 'Late', tone: 'warning', className: 'ml-2' })), '<span class="curv-mobile-flat-pill curv-mobile-flat-pill-warning ml-2">Late</span>');
});

test('string thumbnails and gallery photos send no referrer; a node thumbnail is left alone', () => {
  const row = render(h(mobile.MobileListRow, { title: 'x', thumbnail: '/a.jpg' }));
  assert.match(row, /<img [^>]*referrerPolicy="no-referrer"/);
  assert.equal(count(render(h(mobile.MobileListRow, { title: 'x', thumbnail: h('b', null, 'W') })), /<img /g), 0);
  const gallery = render(h(mobile.MobileGallery, { images: [{ src: '/a.jpg', alt: 'A' }, { src: '/b.jpg', alt: 'B' }], label: 'Photos' }));
  assert.equal(count(gallery, /<img [^>]*referrerPolicy="no-referrer"/g), 4);   // two photos, two thumbnails (the eager one is preloaded with the same policy)
  assert.equal(count(gallery, /curv-mobile-gallery-placeholder/g), 0);        // nothing has failed in server markup
  assert.match(read('mobile.css'), /\.curv-mobile-gallery-placeholder \{[^}]*background: var\(--curv-mobile-thumb, #f4f4f5\)[^}]*color: var\(--curv-mobile-thumb-icon, #8a8a90\)/);
});

test('the toolbar without a search field is just its round buttons, pushed to the right', () => {
  const html = render(h(mobile.MobileListToolbar, { onSort() {}, onFilter() {}, filterCount: 2 }));
  assert.match(html, /<div class="curv-mobile-toolbar" data-no-search="true">/);
  assert.doesNotMatch(html, /<input|<label|curv-mobile-toolbar-search/);
  assert.equal(count(html, /<button /g), 2);
  assert.match(html, /aria-label="Filter \(2\)"/);
  assert.match(cssRule('.curv-mobile-toolbar[data-no-search]')[3], /justify-content: flex-end/);
  const withSearch = render(h(mobile.MobileListToolbar, { search: { value: '', onChange() {}, label: 'Search' } }));
  assert.doesNotMatch(withSearch, /data-no-search/);                        // the markup with a search field did not change
  assert.equal(render(h(mobile.MobileListToolbar, {})), '');                // nothing to show, nothing drawn
});

test('the toolbar action sits between the search field and Sort / Filter, as a round button or a text pill', () => {
  const html = render(h(mobile.MobileListToolbar, {
    search: { value: '', onChange() {}, label: 'Search projects' }, action: h('button', { type: 'button' }, 'New project'), onSort() {}, onFilter() {},
  }));
  const order = ['curv-mobile-toolbar-search', 'curv-mobile-toolbar-action"><button type="button">New project', 'aria-label="Sort"', 'aria-label="Filter"'].map(part => html.indexOf(part));
  assert.ok(order.every(index => index >= 0), 'all four parts render');
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  const round = render(h(mobile.MobileListToolbar, { action: h('button', { type: 'button', className: 'curv-mobile-toolbar-button', 'aria-label': 'New project' }, '+') }));
  assert.match(round, /data-no-search="true"><span class="curv-mobile-toolbar-action"><button type="button" class="curv-mobile-toolbar-button" aria-label="New project">/);
  assert.equal(render(h(mobile.MobileListToolbar, { action: false, onSort() {} })).includes('curv-mobile-toolbar-action'), false);
  const text = cssRule('.curv-mobile-toolbar-action > :is(button, a):not(.curv-mobile-toolbar-button)')[3];
  assert.match(text, /height: 48px/);                                        // as tall as the round buttons
  assert.match(text, /min-height|border-radius: 24px/);
});

test('an exception is red by default and amber when it is a warning, in the warning pill\'s ink', () => {
  assert.equal(render(h(mobile.MobileException, null, '0 sellable')), '<span class="curv-mobile-flat-exception">0 sellable</span>');
  assert.equal(render(h(mobile.MobileException, { tone: 'critical' }, '0 sellable')), '<span class="curv-mobile-flat-exception">0 sellable</span>');
  assert.equal(render(h(mobile.MobileException, { tone: 'warning' }, '9 days of cover')), '<span class="curv-mobile-flat-exception" data-tone="warning">9 days of cover</span>');
  assert.match(cssRule('.curv-mobile-flat-exception')[3], /color: var\(--curv-mobile-critical, var\(--curv-critical, #b5352f\)\)/);
  assert.match(cssRule('.curv-mobile-flat-exception[data-tone="warning"]')[3], /color: var\(--curv-mobile-board-warning-fg, #8a4e00\)/);
  const row = render(h(mobile.MobileListRow, { title: 'Dune rug', meta: h(React.Fragment, null, h(mobile.MobileException, { tone: 'warning' }, 'Short cover'), ' · 14 on order') }));
  assert.match(row, /<span class="curv-mobile-flat-meta"><span class="curv-mobile-flat-exception" data-tone="warning">Short cover<\/span> · 14 on order<\/span>/);
});

test('key-value sub-lines take a tone of their own, and neutral or none draws no attribute', () => {
  const html = render(h(mobile.MobileKeyValueList, { rows: [
    { id: 'a', label: 'Cover', sub: 'Short', subTone: 'warning', value: '9 days', valueSub: '+4.2% vs prior', valueSubTone: 'positive', valueTone: 'critical' },
    { id: 'b', label: 'Orders', sub: 'Late', subTone: 'critical', value: '3', valueSub: 'Same as prior', valueSubTone: 'neutral' },
    { id: 'c', label: 'Plain', sub: 'Plain sub', value: '1', valueSub: 'Plain value sub' },
  ] }));
  assert.match(html, /<span class="curv-mobile-kv-sub" data-tone="warning">Short</);
  assert.match(html, /<span class="curv-mobile-kv-sub" data-tone="positive">\+4.2% vs prior</);
  assert.match(html, /<span class="curv-mobile-kv-sub" data-tone="critical">Late</);
  assert.match(html, /<span class="curv-mobile-kv-sub">Same as prior</);
  assert.match(html, /<span class="curv-mobile-kv-sub">Plain sub</);
  assert.match(html, /<span class="curv-mobile-kv-sub">Plain value sub</);
  assert.match(html, /curv-mobile-kv-value" data-tone="critical"/);         // the value keeps its own tone, apart from its sub-line
  const css = read('mobile.css');
  assert.match(css, /\.curv-mobile-kv-sub\[data-tone="positive"\] \{ color: var\(--curv-mobile-positive-fg, #1f6b30\); \}/);
  assert.match(css, /\.curv-mobile-kv-sub\[data-tone="critical"\] \{ color: var\(--curv-mobile-critical, var\(--curv-critical, #b5352f\)\); \}/);
  assert.match(css, /\.curv-mobile-kv-sub\[data-tone="warning"\] \{ color: var\(--curv-mobile-board-warning-fg, #8a4e00\); \}/);
});

test('the chart card frames a chart under a heading, on the same ground as the key-value card', () => {
  const html = render(h(mobile.MobileChartCard, { title: 'Sales, last 30 days', trailing: 'as of 9:41' },
    h(mobile.MobileChart, { points: days, variant: 'line', label: 'Sales' })));
  const id = html.match(/<h2 id="([^"]+)"/)[1];
  assert.ok(html.includes(`<section class="curv-mobile-chart-card" aria-labelledby="${id}">`));
  assert.match(html, /<div class="curv-mobile-chart-card-head"><h2 id="[^"]+">Sales, last 30 days<\/h2><span class="curv-mobile-chart-card-trailing">as of 9:41<\/span><\/div>/);
  assert.match(html, /<div class="curv-mobile-chart-card-body"><figure class="curv-mobile-chart">/);
  const bare = render(h(mobile.MobileChartCard, null, h('p', null, 'chart')));
  assert.equal(bare, '<section class="curv-mobile-chart-card"><div class="curv-mobile-chart-card-body"><p>chart</p></div></section>');
  // One rule draws the card ground for both, so they cannot drift apart.
  const ground = cssRule('.curv-mobile-chart-card-body');
  assert.ok(ground[2].includes('.curv-mobile-kv-card'));
  assert.match(ground[3], /border-radius: 18px/);
  assert.match(ground[3], /box-shadow: 0 0 0 0\.5px rgb\(0 0 0 \/ 0\.08\)/);
  assert.match(ground[3], /background: var\(--curv-mobile-surface, #fff\)/);
  assert.match(cssRule('.curv-mobile-chart-card')[3], /margin-inline: var\(--curv-mobile-gutter, 16px\)/);
  // Light-only, like the other phone surfaces: the desktop tokens a chart reads are pinned to light values inside it.
  for (const pinned of [/padding: 16px/, /--card: var\(--curv-mobile-surface, #fff\)/, /--foreground: var\(--curv-mobile-ink, #1b1b1b\)/, /--muted-foreground: var\(--curv-mobile-ink-3, #6b6b6f\)/, /--positive: var\(--curv-mobile-positive-fg, #1f6b30\)/, /--negative: var\(--curv-mobile-critical/]) assert.match(ground[3], pinned);
});

test('the move sheet mounts nothing while closed', () => {
  const html = render(h(mobile.MobileMoveSheet, { open: false, onOpenChange() {}, title: 'Move to…', options: [{ id: 'a', label: 'Move to A' }], onChoose() {} }));
  assert.equal(html, '');
});

test('list sections, key-value lists and chart cards share one heading, so stacked sections line up', () => {
  const heads = ['.curv-mobile-flat-section-head', '.curv-mobile-kv-head', '.curv-mobile-chart-card-head'];
  const head = cssRule(heads[0]);
  for (const selector of heads) assert.ok(head[2].split(',').map(part => part.trim()).includes(selector), `${selector} shares the list section's heading rule`);
  assert.match(head[3], /padding: 16px 20px 6px/);
  const title = cssRule('.curv-mobile-flat-section-head h2');
  for (const selector of ['.curv-mobile-kv-head h2', '.curv-mobile-chart-card-head h2']) assert.ok(title[2].includes(selector), selector);
  assert.match(title[3], /font-size: 14px/);
  assert.match(title[3], /font-weight: 500/);
  assert.match(title[3], /color: var\(--curv-mobile-ink-3, #6b6b6f\)/);
  const trailing = cssRule('.curv-mobile-flat-section-trailing');
  for (const selector of ['.curv-mobile-kv-trailing', '.curv-mobile-chart-card-trailing']) assert.ok(trailing[2].includes(selector), selector);
  assert.match(trailing[3], /font-size: 14px/);
  // The blocks that sit inside the gutter pad in only what is left of the 20px, so the heading starts where the
  // list's does, and with no negative margin a block whose gutter is removed never scrolls sideways.
  for (const selector of ['.curv-mobile-kv-head', '.curv-mobile-chart-card-head']) {
    assert.match(cssRule(selector)[3], /padding-inline: max\(0px, calc\(20px - var\(--curv-mobile-gutter, 16px\)\)\)/);
    assert.doesNotMatch(cssRule(selector)[3], /margin-inline: calc/);
  }
  // And nothing later re-sets the key-value heading to its old 13px.
  assert.doesNotMatch(read('mobile.css'), /\.curv-mobile-kv-head[^{]*\{[^}]*(font-size: 13px|padding: 0 4px)/);
});

test('a move option that cannot be chosen is dimmed, and the current one keeps full ink with a check', () => {
  assert.match(cssRule('.curv-mobile-board-move-option:disabled')[3], /opacity: 0\.45/);
  assert.match(cssRule('.curv-mobile-board-move-option[aria-current="true"]:disabled')[3], /opacity: 1/);
  assert.match(cssRule('.curv-mobile-board-move-check')[3], /color: var\(--curv-ink-accent, var\(--curv-mobile-accent, #1764c0\)\)/);
});

// ── Refinement round 1 (0.3.2): chips, charts, hero, headings ───────────────

test('saved-view chips and board stage chips are one chip: the same class, 44px, 15px, grey, dark when chosen', () => {
  const views = render(h(mobile.MobileViewChips, { label: 'Views', items: [{ id: 'a', label: 'All', count: 3, active: true }, { id: 'b', label: 'Low' }], onSelect() {} }));
  const links = render(h(mobile.MobileViewChips, { label: 'Views', items: [{ id: 'a', label: 'All', href: '/a', active: true }] }));
  const board = render(h(mobile.MobileStageBoard, { label: 'Board', columns, activeColumnId: 'todo' }));
  assert.equal(count(views, /class="curv-mobile-chip curv-mobile-view-chip"/g), 2);
  assert.equal(count(links, /class="curv-mobile-chip curv-mobile-view-chip"/g), 1);
  assert.equal(count(board, /class="curv-mobile-chip curv-mobile-board-chip"/g), 3);
  const chip = cssRule('.curv-mobile-chip')[3];
  assert.match(chip, /height: 44px/);
  assert.match(chip, /font-size: 15px/);
  assert.match(chip, /background: var\(--curv-mobile-chip-fill, #e8e8ec\)/);
  assert.match(chip, /border-radius: 22px/);
  const chosen = read('mobile.css').match(/\n\.curv-mobile-chip:is\(\[aria-pressed="true"\], \[aria-current\], :has\(> \[data-active="true"\]\)\) \{([^}]*)\}/);
  assert.ok(chosen, 'a rule for the chosen chip');
  assert.match(chosen[1], /background: var\(--curv-mobile-ink, #1b1b1b\)/);
  assert.match(chosen[1], /color: #fff/);
  // Neither component styles its own chip any more: no second size, font or fill to drift.
  const css = read('mobile.css');
  assert.doesNotMatch(css, /\.curv-mobile-(view|board)-chip \{/);
  assert.doesNotMatch(css, /\.curv-mobile-(view|board)-chip[^{,]*\{[^}]*(height: (36|40)px|font-size: 14px)/);
  // The 44px is the element itself, not a pseudo-element's reach around a smaller chip.
  assert.doesNotMatch(css, /\.curv-mobile-(view|board)?-?chip::before/);
  // Text on the fill stays readable: ink on grey and the count on grey are both dark enough to clear 4.5:1.
  assert.match(chip, /color: var\(--curv-mobile-chip, var\(--curv-mobile-ink-2, #3a3a3d\)\)/);
  assert.match(cssRule('.curv-mobile-chip :is(.curv-mobile-view-chip-count, .curv-mobile-board-chip-count)')[3], /color: var\(--curv-mobile-chip-count, var\(--curv-mobile-chip, #5f5f64\)\)/);
  for (const token of ['--curv-mobile-chip ', '--curv-mobile-chip-fill', '--curv-mobile-chip-count']) assert.ok(css.slice(0, css.indexOf('/* ── Shared')).includes(token), `${token.trim()} is in the token list`);
});

// Geometry of a chart's markup, read back from the SVG: what is drawn where, in viewBox units.
const W = 260;
const chartLabels = html => [...html.matchAll(/<text class="curv-mobile-chart-label" x="([\d.]+)" y="([\d.]+)" text-anchor="(\w+)"[^>]*>([^<]*)<\/text>/g)]
  .map(([, x, y, anchor, text]) => {
    const width = text.length * 11 * 0.58;
    const at = Number(x);
    const left = anchor === 'start' ? at : anchor === 'end' ? at - width : at - width / 2;
    return { text, baseline: Number(y), left, right: left + width };
  });
const chartBars = html => [...html.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)"/g)].map(([, x, y, width]) => ({ left: Number(x), right: Number(x) + Number(width), top: Number(y) }));
const barWeeks = (values, display) => values.map((value, index) => ({ label: `W${index + 1}`, value: value * 1000, display: display?.[index] ?? `$${value}K` }));

test('a bar label never sits across a neighbouring bar and never leaves the plot', () => {
  const { MobileChart } = mobile;
  // The latest bar is short and its label is wide: it reaches over the tall bar before it.
  const values = [90, 120, 100, 190, 150, 160, 190, 80, 90, 110, 190, 60];
  const html = render(h(MobileChart, { points: barWeeks(values, values.map((v, i) => (i === 11 ? '$174.5K' : `$${v}K`))), variant: 'bars', label: 'Revenue by week' }));
  const labels = chartLabels(html);
  const bars = chartBars(html);
  assert.ok(labels.some(label => label.text === '$174.5K'), 'the latest value is labelled');
  for (const label of labels) {
    assert.ok(label.left >= 0 && label.right <= W, `${label.text} stays inside the plot (${label.left.toFixed(1)}..${label.right.toFixed(1)})`);
    assert.ok(label.baseline >= 11, `${label.text} stays below the top edge`);
    for (const bar of bars.filter(bar => bar.right > label.left - 1 && bar.left < label.right + 1)) assert.ok(label.baseline < bar.top, `${label.text} is above every bar under it`);
  }
});

test('a label that fits its own band keeps the place it always had, just above its bar', () => {
  const { MobileChart } = mobile;
  const html = render(h(MobileChart, { points: [{ label: 'Mon', value: 12 }, { label: 'Tue', value: 20 }, { label: 'Wed', value: 7 }], variant: 'bars', label: 'Orders' }));
  const labels = chartLabels(html).sort((a, b) => a.left - b.left);
  const bars = chartBars(html).sort((a, b) => a.left - b.left);
  assert.equal(labels.length, 3);
  labels.forEach((label, index) => assert.ok(Math.abs(label.baseline - (bars[index].top - 6)) < 0.01, `${label.text} sits 6 above its bar`));
});

test('the latest value of a line sits beside its end when there is room, and above it, clear of the line, when there is not', () => {
  const { MobileChart } = mobile;
  const falling = [2100, 2400, 3100, 2900, 2700, 1200].map((value, index) => ({ label: `Oct ${index + 1}`, value, ...(index === 5 ? { partial: true, display: '24 so far' } : {}) }));
  const month = render(h(MobileChart, { points: falling, variant: 'line', tone: 'dark', futureSlots: 25, endLabel: 'Oct 31', label: 'Orders' }));
  const dot = month.match(/curv-mobile-chart-dot-partial" cx="([\d.]+)" cy="([\d.]+)"/);
  const [label] = chartLabels(month);
  assert.equal(label.text, '24 so far');
  assert.match(month, /text-anchor="start"[^>]*>24 so far</);
  assert.ok(label.left > Number(dot[1]), 'beside the end point, to its right, where no segment of the series reaches');
  assert.ok(label.right <= W - 6, 'inside the plot');
  // A line that ends at the right edge has no room beside it: the label goes above the highest part of the line under it.
  const week = render(h(MobileChart, { points: falling.map((point, index) => (index === 5 ? { ...point, display: '24 so far' } : point)), variant: 'line', label: 'Orders' }));
  const [above] = chartLabels(week);
  const segment = week.match(/d="M ([\d.]+) ([\d.]+) L ([\d.]+) ([\d.]+)" fill="none" stroke="currentColor" stroke-width="2.25" stroke-dasharray/);
  assert.ok(segment, 'the dashed partial segment is drawn');
  const [x0, y0, x1, y1] = segment.slice(1).map(Number);
  for (const x of [Math.max(x0, above.left), Math.min(x1, above.right)]) {
    if (x < x0 || x > x1) continue;
    const lineY = y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    assert.ok(above.baseline < lineY - 2, `the dashed segment passes below the label at x=${x.toFixed(1)}`);
  }
  assert.ok(above.right <= W && above.left >= 0);
});

test('hero KPI chips shrink and wrap before the row scrolls, and the hero paints a pixel under the bar', () => {
  const kpi = cssRule('.curv-mobile-hero-kpi')[3];
  assert.match(kpi, /flex: 0 1 auto/);
  // `max(min-content, ...)` is not valid CSS (intrinsic keywords are not allowed in max()), so a chip's floor is its body's min-width.
  assert.doesNotMatch(read('mobile.css'), /min-width: max\([^)]*min-content/);
  assert.doesNotMatch(kpi, /min-width|flex: none/);
  assert.match(cssRule('.curv-mobile-hero-kpi-body')[3], /min-width: 80px/);
  assert.doesNotMatch(cssRule('.curv-mobile-hero-kpi-label')[3], /white-space: nowrap/);
  assert.doesNotMatch(cssRule('.curv-mobile-hero-kpi-delta')[3], /white-space: nowrap/);
  assert.match(cssRule('.curv-mobile-hero-kpi-value')[3], /white-space: nowrap/, 'a figure is never split');
  assert.match(cssRule('.curv-mobile-hero-kpis')[3], /overflow-x: auto/);
  assert.match(cssRule('.curv-mobile-hero-kpis')[3], /scroll-snap-type: x proximity/);
  // The seam: one pixel of the panel's own colour above its top edge, with no margin that could move the sheet.
  const hero = cssRule('.curv-mobile-hero')[3];
  assert.match(hero, /box-shadow: 0 -1px 0 0 var\(--curv-mobile-hero-bg, var\(--curv-mobile-topbar, #1b1b1b\)\)/);
  assert.doesNotMatch(hero, /margin-top/);
});

test('a section heading keeps its label whole: a long trailing note shrinks first, to a floor, cut with an ellipsis', () => {
  const title = cssRule('.curv-mobile-kv-head h2')[3];
  // The label can shrink only after the note has, because the note's shrink factor dwarfs its own; it then wraps at spaces.
  assert.match(title, /flex: 0 1 auto/);
  assert.doesNotMatch(title, /nowrap|overflow-wrap: (anywhere|break-word)|word-break/);
  const trailing = cssRule('.curv-mobile-kv-trailing')[3];
  const shrink = Number(trailing.match(/flex: 0 (\d+) auto/)[1]);
  assert.ok(shrink >= 50, `the note's shrink factor (${shrink}) outweighs the label's 1`);
  for (const pinned of [/min-width: 5em/, /overflow: hidden/, /text-overflow: ellipsis/, /white-space: nowrap/]) assert.match(trailing, pinned);
  assert.doesNotMatch(trailing, /min-width: 0/, 'a floor, so a long label can never squeeze the note out');
  for (const selector of ['.curv-mobile-flat-section-head h2', '.curv-mobile-chart-card-head h2']) assert.ok(cssRule(selector)[2].includes('.curv-mobile-kv-head h2'), `${selector} shares it`);
});

test('a sheet title starts at the body edge, so title, headings and rows share one x', () => {
  assert.match(cssRule('.curv-mobile-sheet-heading')[3], /padding: 8px 12px 8px max\(16px, env\(safe-area-inset-left\)\)/);
  assert.match(cssRule('.curv-mobile-sheet-body')[3], /padding: 4px max\(16px, env\(safe-area-inset-right\)\) 24px max\(16px, env\(safe-area-inset-left\)\)/);
  assert.match(cssRule('.curv-mobile-option')[3], /padding: 0;/);
  assert.match(cssRule('.curv-mobile-board-move-option')[3], /padding: 0;/);
});

// ── MobileButton ────────────────────────────────────────────────────────────

test('MobileButton is a real button that never submits by accident, with its variant and width as classes', () => {
  const html = render(h(mobile.MobileButton, null, 'Save'));
  assert.match(html, /^<button type="button" class="curv-mobile-button curv-mobile-button-primary"><span class="curv-mobile-button-label">Save<\/span><\/button><span class="curv-mobile-content-vh" role="status"><\/span>$/);
  assert.match(render(h(mobile.MobileButton, { type: 'submit', variant: 'secondary', block: true, className: 'extra', id: 'go', 'aria-label': 'Go' }, 'Go')),
    /<button id="go" aria-label="Go" type="submit" class="curv-mobile-button curv-mobile-button-secondary curv-mobile-button-block extra">/);
  assert.match(render(h(mobile.MobileButton, { variant: 'plain' }, 'Reset')), /curv-mobile-button-plain/);
  assert.match(render(h(mobile.MobileButton, { disabled: true }, 'Save')), /<button[^>]*disabled=""/);
  const busy = render(h(mobile.MobileButton, { pending: true }, 'Save'));
  assert.match(busy, /aria-busy="true"/);
  assert.match(busy, /curv-mobile-button-label">Save</, 'the label stays in the markup, so the width does not change');
  assert.doesNotMatch(render(h(mobile.MobileButton, null, 'Save')), /aria-busy/);
  // Screen readers are told: an empty live region is always there, and pending fills it (in the app's words if it has them).
  assert.match(busy, /<span class="curv-mobile-content-vh" role="status">Working…<\/span>$/);
  assert.match(render(h(mobile.MobileButton, { pending: true, pendingLabel: 'Sender…' }, 'Send')), /role="status">Sender…<\/span>$/);
  assert.match(render(h(mobile.MobileButton, { pendingLabel: 'Sender…' }, 'Send')), /role="status"><\/span>$/, 'silent until it is pending');
});

test('mobileButtonClassName styles a link as the same button, and merges the app\'s own classes', () => {
  assert.equal(mobile.mobileButtonClassName(), 'curv-mobile-button curv-mobile-button-primary');
  assert.equal(mobile.mobileButtonClassName({ variant: 'secondary', block: true, className: 'mt-4' }), 'curv-mobile-button curv-mobile-button-secondary curv-mobile-button-block mt-4');
  const link = render(h('a', { href: '/sku-requests', className: mobile.mobileButtonClassName({ variant: 'plain' }) }, 'All requests'));
  assert.equal(link, '<a href="/sku-requests" class="curv-mobile-button curv-mobile-button-plain">All requests</a>');
});

test('the phone button is 50px, 17px semibold with 14px corners, the tab bar\'s dark fill for primary, and busy keeps its width', () => {
  const base = cssRule('.curv-mobile-button')[3];
  for (const pinned of [/min-height: 50px/, /min-width: 44px/, /font-size: 17px/, /font-weight: 600/, /border-radius: 14px/]) assert.match(base, pinned);
  assert.match(cssRule('.curv-mobile-button-primary')[3], /background: var\(--curv-button-primary-bg, #111113\); color: var\(--curv-button-primary-ink, #ffffff\)/, 'near-black on light surfaces, unless a dark sheet sets the variables');
  assert.match(read('mobile.css'), /\.curv-mobile-tabbar-primary \{[^}]*background: #111113; color: #ffffff/, 'the same fill as the tab bar\'s action');
  assert.match(cssRule('.curv-mobile-button-secondary')[3], /background: var\(--curv-button-secondary-bg, var\(--curv-mobile-fill, #efeff1\)\)/);
  assert.match(cssRule('.curv-mobile-button-plain')[3], /background: transparent/);
  assert.match(cssRule('.curv-mobile-button-block')[3], /width: 100%/);
  assert.match(cssRule('.curv-mobile-button:disabled')[3], /opacity: 0\.4/);
  // Busy: the label goes transparent, it is not removed, and the spinner is drawn over it.
  assert.match(cssRule('.curv-mobile-button[aria-busy="true"] > .curv-mobile-button-label')[3], /opacity: 0/);
  assert.match(cssRule('.curv-mobile-button[aria-busy="true"]::after')[3], /position: absolute/);
  // The spinner only turns for people who have not asked for less motion.
  const css = read('mobile.css');
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\) \{[^@]*\.curv-mobile-button\[aria-busy="true"\]::after \{ animation: curv-mobile-spin/);
  assert.doesNotMatch(css.replace(/@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*?\n\}/g, ''), /animation: curv-mobile-spin/);
});

// ── MobileOptionList ────────────────────────────────────────────────────────

test('a single option list is a radio group: radios say which is chosen, a count is read after the label, a check shows only on the chosen row', () => {
  const html = render(h(mobile.MobileOptionList, { label: 'Brand', heading: 'Brand' },
    h(mobile.MobileOptionRow, { selected: true, count: 1182 }, 'Floatie Kings'),
    h(mobile.MobileOptionRow, { count: '14+' }, 'Nordic Hub'),
    h(mobile.MobileOptionRow, { disabled: true }, 'Retired')));
  assert.match(html, /<h3 class="curv-mobile-option-heading">Brand<\/h3>/);
  assert.match(html, /<div class="curv-mobile-option-list" role="radiogroup" aria-label="Brand">/);
  assert.equal(count(html, /role="radio"/g), 3);
  assert.equal(count(html, /aria-checked="true"/g), 1);
  assert.equal(count(html, /aria-checked="false"/g), 2);
  assert.doesNotMatch(html, /aria-pressed/);
  assert.match(html, /<button[^>]*role="radio" aria-checked="true"[^>]*type="button" class="curv-mobile-option" data-selected="true">/);
  assert.match(html, /Floatie Kings<\/span><span class="curv-mobile-content-vh">, <\/span><span class="curv-mobile-option-count">1,182</);
  assert.match(html, /curv-mobile-option-count">14\+</);
  assert.equal(count(html, /curv-mobile-option-count/g), 2, 'no count, none drawn');
  assert.equal(count(html, /<svg/g), 1, 'one check, on the chosen row');
  assert.equal(count(html, /curv-mobile-option-check" aria-hidden="true"/g), 3, 'the slot is on every row, so counts line up');
  assert.match(html, /<button[^>]*disabled=""[^>]*>[^]*Retired/);
});

test('a multiple option list is a group of toggle buttons: aria-pressed says which are chosen', () => {
  const html = render(h(mobile.MobileOptionList, { label: 'Status', mode: 'multiple' },
    h(mobile.MobileOptionRow, { selected: true }, 'At risk'),
    h(mobile.MobileOptionRow, { selected: true }, 'Late'),
    h(mobile.MobileOptionRow, null, 'On track')));
  assert.match(html, /role="group" aria-label="Status"/);
  assert.doesNotMatch(html, /radiogroup|role="radio"|aria-checked/);
  assert.equal(count(html, /aria-pressed="true"/g), 2);
  assert.equal(count(html, /aria-pressed="false"/g), 1);
  assert.equal(count(html, /<svg/g), 2);
  assert.doesNotMatch(html, /curv-mobile-option-heading/, 'the heading is optional');
});

test('option rows are 56px with a 17px label and a 15px tabular count, and share every rule with the move sheet\'s rows', () => {
  const rule = cssRule('.curv-mobile-option');
  assert.ok(rule[2].split(',').map(part => part.trim()).includes('.curv-mobile-board-move-option'), 'one rule set, not a copy');
  for (const pinned of [/min-height: 56px/, /font-size: 17px/, /width: 100%/, /border-bottom: 0\.5px solid/, /color: inherit/]) assert.match(rule[3], pinned);
  const figure = cssRule('.curv-mobile-option-count');
  assert.ok(figure[2].includes('.curv-mobile-board-move-option .curv-mobile-board-chip-count'));
  assert.match(figure[3], /font-size: 15px/);
  assert.match(figure[3], /font-variant-numeric: tabular-nums/);
  assert.match(cssRule('.curv-mobile-option-check')[3], /color: var\(--curv-ink-accent, var\(--curv-mobile-accent, #1764c0\)\)/);
  assert.match(cssRule('.curv-mobile-option:disabled')[3], /opacity: 0\.45/);
  assert.match(cssRule('.curv-mobile-option:focus-visible')[3], /outline: 2px solid var\(--curv-mobile-accent, #1764c0\)/);
  assert.match(cssRule('.curv-mobile-option-heading')[3], /font-size: 14px/);
  assert.match(cssRule('.curv-mobile-option-list > .curv-mobile-option:last-child')[3], /border-bottom: 0/);
});

// ── Gallery ─────────────────────────────────────────────────────────────────

test('the first gallery photo loads at once unless the app says it sits in a branch that desktop hides', () => {
  const images = [{ src: '/a.jpg', alt: 'A' }, { src: '/b.jpg', alt: 'B' }];
  const eager = render(h(mobile.MobileGallery, { images, label: 'Photos' }));
  assert.match(eager, /<img src="\/a.jpg" alt="A" loading="eager"/);
  const hidden = render(h(mobile.MobileGallery, { images, label: 'Photos', eagerFirst: false }));
  assert.equal(count(hidden, /loading="eager"/g), 0);
  assert.equal(count(hidden, /loading="lazy"/g), 4, 'both photos and both thumbnails are lazy');
  assert.match(render(h(mobile.MobileGallery, { images, label: 'Photos', eagerFirst: true })), /<img src="\/a.jpg" alt="A" loading="eager"/);
});

// ── Hero KPI: informational chips ───────────────────────────────────────────

test('a hero KPI with selectable false is plain text: no control, never boxed, whatever the panel does', () => {
  const four = [
    { id: 'orders', label: 'Orders', value: '24' },
    { id: 'rev', label: 'Revenue', value: '$48K' },
    { id: 'perday', label: 'Per day', value: '$1,606', selectable: false },
    { id: 'pace', label: 'On pace for', value: '$50K', selectable: false },
  ];
  const html = render(h(mobile.MobileHeroPanel, { kpis: four, activeKpiId: 'orders', onKpiChange() {}, chart: null }));
  assert.equal(count(html, /<button type="button" class="curv-mobile-hero-kpi"/g), 2);
  assert.equal(count(html, /<div class="curv-mobile-hero-kpi">/g), 2);
  assert.equal(count(html, /aria-pressed="true"/g), 1);
  // The active id points at an informational chip: nothing is boxed rather than a chip that does nothing.
  const none = render(h(mobile.MobileHeroPanel, { kpis: four, activeKpiId: 'perday', onKpiChange() {}, chart: null }));
  assert.equal(count(none, /aria-pressed="true"/g), 0);
  assert.equal(count(none, /data-active="true"/g), 0);
  // A link is ignored too: it stays text.
  const linked = render(h(mobile.MobileHeroPanel, { kpis: four.map(kpi => ({ ...kpi, href: `/?kpi=${kpi.id}` })), activeKpiId: 'orders', chart: null }));
  assert.equal(count(linked, /<a /g), 2);
  assert.equal(count(linked, /<div class="curv-mobile-hero-kpi">/g), 2);
  // Omitting `selectable` is the old behaviour.
  assert.equal(count(render(h(mobile.MobileHeroPanel, { kpis, activeKpiId: 'orders', onKpiChange() {}, chart: null })), /<button/g), kpis.length);
});

test('the new public API is in the type declarations', () => {
  const declarations = read('dist/mobile.d.ts') + readdirSync(new URL('../dist', import.meta.url)).filter(file => file.endsWith('.d.ts')).map(file => read(`dist/${file}`)).join('\n');
  for (const name of ['MobileButton', 'mobileButtonClassName', 'MobileButtonProps', 'MobileButtonStyle', 'MobileButtonVariant', 'MobileOptionList', 'MobileOptionRow', 'MobileOptionListProps', 'MobileOptionRowProps', 'eagerFirst', 'selectable']) assert.ok(declarations.includes(name), name);
});

// ── Audit fixes (0.3.2) ─────────────────────────────────────────────────────

const chartLeaders = html => [...html.matchAll(/<line class="curv-mobile-chart-leader" x1="([\d.]+)" x2="([\d.]+)" y1="([\d.]+)" y2="([\d.]+)"/g)]
  .map(([, x1, x2, y1, y2]) => ({ x: Number(x1), same: x1 === x2, y1: Number(y1), y2: Number(y2) }));

test('a bar label lifted above a taller neighbour is tied to its own bar by a leader; one that sits on its bar has none', () => {
  const { MobileChart } = mobile;
  // 30 days of currency: the latest day is short and its "$30,113" is wider than a band, so it floats over the tall day before it.
  const days = Array.from({ length: 30 }, (_, index) => ({ label: `Oct ${index + 1}`, value: [41200, 38500, 52100, 47800, 45100, 39900, 44300, 49800, 51300, 46200][index % 10] }));
  days[10] = { label: 'Oct 11', value: 68722, display: '$68,722' };
  days[28] = { label: 'Oct 29', value: 60000, display: '$60,000' };
  days[29] = { label: 'Oct 30', value: 30113, display: '$30,113' };
  const html = render(h(MobileChart, { points: days, variant: 'bars', label: 'Revenue by day', format: value => `$${value.toLocaleString('en-US')}` }));
  const bars = chartBars(html).sort((a, b) => a.left - b.left);
  const lastBar = bars[29];
  const latest = chartLabels(html).find(label => label.text === '$30,113');
  assert.ok(latest.baseline < Math.min(...bars.filter(bar => bar.right > latest.left - 1 && bar.left < latest.right + 1).map(bar => bar.top)), 'it floats above the bars it overlaps');
  assert.ok(latest.baseline < lastBar.top - 6.5, 'so it is no longer sitting on its own bar');
  const leaders = chartLeaders(html);
  const leader = leaders.find(item => Math.abs(item.x - (lastBar.left + lastBar.right) / 2) < 0.01);
  assert.ok(leader, 'a leader at the latest bar\'s centre');
  assert.ok(leader.same, 'it is vertical');
  assert.ok(Math.abs(leader.y1 - (latest.baseline + 3)) < 0.01, 'it starts just under the label');
  assert.ok(Math.abs(leader.y2 - (lastBar.top - 2)) < 0.01, 'and ends just above its own bar');
  // The peak's label sits on the peak, so it needs none; nor does any label that is still on its own bar.
  const peak = chartLabels(html).find(label => label.text === '$68,722');
  const peakBar = bars[10];
  assert.ok(Math.abs(peak.baseline - (peakBar.top - 6)) < 0.01);
  assert.equal(leaders.length, 1);
  // Labels that fit their bands, or that sit on their own bars, draw no leader at all.
  assert.equal(chartLeaders(render(h(MobileChart, { points: [{ label: 'Mon', value: 12 }, { label: 'Tue', value: 20 }, { label: 'Wed', value: 7 }], variant: 'bars', label: 'Orders' }))).length, 0);
});

test('the latest line value steps clear of the comparison line and its label', () => {
  const { MobileChart } = mobile;
  const series = [2100, 2400, 3100, 2900, 2700, 2500].map((value, index) => ({ label: `Oct ${index + 1}`, value, ...(index === 5 ? { display: '24 so far', partial: true } : {}) }));
  const lineYOf = html => Number(html.match(/<line class="curv-mobile-chart-ref" x1="[\d.]+" x2="[\d.]+" y1="([\d.]+)"/)[1]);
  // The comparison sits right at the end value: beside the end point it would be struck through.
  const onTheLine = render(h(MobileChart, { points: series, variant: 'line', tone: 'dark', futureSlots: 25, endLabel: 'Oct 31', referenceLine: { value: 2520, label: 'Sep avg' }, label: 'Orders' }));
  const lineY = lineYOf(onTheLine);
  const [label] = chartLabels(onTheLine);
  const dotX = Number(onTheLine.match(/curv-mobile-chart-dot-partial" cx="([\d.]+)"/)[1]);
  assert.ok(label.left <= dotX, 'not beside the end point');
  assert.ok(label.baseline + 3 < lineY - 1.5 || label.baseline - 9 > lineY + 1.5, `the text (${label.baseline - 9}..${label.baseline + 3}) does not sit on the line at ${lineY}`);
  assert.ok(label.left >= 0 && label.right <= W && label.baseline >= 11);
  const refText = onTheLine.match(/<text class="curv-mobile-chart-ref-label" x="([\d.]+)" y="([\d.]+)" text-anchor="end"[^>]*>([^<]*)</);
  const refRight = Number(refText[1]);
  const refLeft = refRight - refText[3].length * 10 * 0.58;
  const refBaseline = Number(refText[2]);
  if (label.left < refRight && label.right > refLeft) assert.ok(label.baseline + 3 < refBaseline - 10 || label.baseline - 9 > refBaseline + 2, 'and clear of the comparison label too');
  // With the comparison line far from the end value nothing changes: still beside the end point.
  const far = render(h(MobileChart, { points: series, variant: 'line', tone: 'dark', futureSlots: 25, endLabel: 'Oct 31', referenceLine: { value: 1500, label: 'Sep avg' }, label: 'Orders' }));
  assert.match(far, /text-anchor="start"[^>]*>24 so far</);
  // No future slots: the end value goes above, and the comparison line (here just above the end) is stepped over.
  const week = render(h(MobileChart, { points: series, variant: 'line', referenceLine: { value: 2650, label: 'Sep avg' }, label: 'Orders' }));
  const weekLineY = lineYOf(week);
  const [above] = chartLabels(week);
  assert.ok(above.baseline + 3 < weekLineY - 1.5 || above.baseline - 9 > weekLineY + 1.5, `above: text ${above.baseline - 9}..${above.baseline + 3} against the line at ${weekLineY}`);
});

test('a single option list has one tab stop worked out in the markup; an app\'s own tabIndex is kept, and a multiple list has none', () => {
  const row = (props, text) => h(mobile.MobileOptionRow, props, text);
  const stops = html => [...html.matchAll(/<button([^>]*)>/g)].map(([, attributes]) => (attributes.match(/tabindex="(-?\d+)"/) || [])[1] ?? null);
  const chosen = render(h(mobile.MobileOptionList, { label: 'Brand' }, row({}, 'A'), row({ selected: true }, 'B'), row({}, 'C')));
  assert.deepEqual(stops(chosen), ['-1', '0', '-1'], 'the chosen row');
  const none = render(h(mobile.MobileOptionList, { label: 'Brand' }, row({ disabled: true }, 'A'), row({}, 'B'), row({}, 'C')));
  assert.deepEqual(stops(none), ['-1', '0', '-1'], 'the first enabled row when none is chosen; a disabled row is never the stop');
  const own = render(h(mobile.MobileOptionList, { label: 'Brand' }, row({ tabIndex: 3 }, 'A'), row({ selected: true }, 'B')));
  assert.deepEqual(stops(own), ['3', '0'], 'an app-passed tabIndex is not overwritten');
  const multiple = render(h(mobile.MobileOptionList, { label: 'Status', mode: 'multiple' }, row({ selected: true }, 'A'), row({}, 'B')));
  assert.deepEqual(stops(multiple), [null, null]);
});

test('the option mode type is exported with the rest of the new API', () => {
  const declarations = readdirSync(new URL('../dist', import.meta.url)).filter(file => file.endsWith('.d.ts')).map(file => read(`dist/${file}`)).join('\n');
  for (const name of ['MobileOptionMode', 'pendingLabel']) assert.ok(declarations.includes(name), name);
});

// ── 0.3.3: chip-row slot, card, heading size, gutter, fields, switch, avatar ─

const lastDeclaration = (body, property) => [...body.matchAll(new RegExp(`(?:^|[ ;])${property}: ([^;]+);`, 'g'))].map(match => match[1]).at(-1);

test('the 0.3.3 components are exported from the mobile entry', () => {
  for (const name of ['MobileFilterSheet', 'mobileAvatarColor']) assert.equal(typeof mobile[name], 'function', name);
  // Components that forward a ref are React objects, not plain functions.
  for (const name of ['MobileToolbarButton', 'MobileCard', 'MobileTextField', 'MobileTextArea', 'MobileDateField', 'MobileSwitchRow', 'MobileTopBarTextAction']) assert.equal(typeof mobile[name], 'object', name);
});

test('the new public API is in the type declarations', () => {
  const declarations = readdirSync(new URL('../dist', import.meta.url)).filter(file => file.endsWith('.d.ts')).map(file => read(`dist/${file}`)).join('\n');
  for (const name of [
    'MobileToolbarButton', 'MobileToolbarButtonProps', 'chipsTrailing', 'MobileCard', 'MobileCardProps', 'MobileListSectionProps', 'headingSize', 'MobileGutter',
    'MobileFilterSheet', 'MobileFilterSheetProps', 'MobileTextField', 'MobileTextArea', 'MobileDateField', 'MobileTextFieldProps', 'MobileTextAreaProps', 'MobileDateFieldProps',
    'MobileSwitchRow', 'MobileSwitchRowProps', 'mobileAvatarColor', 'MobileTopBarTextAction', 'MobileTopBarTextActionProps',
  ]) assert.ok(declarations.includes(name), name);
  assert.match(declarations, /count\?: number \| string/);
});

test('package.json and package-lock.json carry the same version', () => {
  const version = JSON.parse(read('package.json')).version;
  const lock = JSON.parse(read('package-lock.json'));
  assert.equal(lock.version, version);
  assert.equal(lock.packages[''].version, version);
});

// ── Chip row: the trailing slot ─────────────────────────────────────────────

test('view chips put a trailing control after the scroller, not in it; without one the markup is unchanged', () => {
  const items = [{ id: 'all', label: 'All', count: 1182, active: true }, { id: 'late', label: 'Late' }];
  const trailing = h(mobile.MobileToolbarButton, { label: 'Filter projects', count: 2 });
  const html = render(h(mobile.MobileViewChips, { label: 'Saved views', items, onSelect() {}, trailing, className: 'mine' }));
  assert.match(html, /^<div class="curv-mobile-chips-row curv-mobile-view-chips-row mine"><div class="curv-mobile-view-chips" role="group" aria-label="Saved views">/);
  const scroller = html.match(/<div class="curv-mobile-view-chips"[^>]*>([\s\S]*?)<\/div><div class="curv-mobile-chips-trailing">/);
  assert.ok(scroller, 'the scroller closes, then the slot');
  assert.doesNotMatch(scroller[1], /toolbar-button/);
  assert.equal(count(scroller[1], /curv-mobile-view-chip"/g), 2);
  assert.match(html, /<div class="curv-mobile-chips-trailing"><button type="button" class="curv-mobile-toolbar-button" aria-label="Filter projects \(2\)"><svg[\s\S]*<\/svg><span class="curv-mobile-toolbar-badge" aria-hidden="true">2<\/span><\/button><\/div><\/div>$/);
  // The group is still named, and the slot is not part of it.
  assert.equal(count(html, /role="group"/g), 1);

  const bare = render(h(mobile.MobileViewChips, { label: 'Saved views', items, onSelect() {} }));
  assert.match(bare, /^<div class="curv-mobile-view-chips" role="group" aria-label="Saved views">/);
  assert.doesNotMatch(bare, /chips-row|chips-trailing/);
  assert.match(render(h(mobile.MobileViewChips, { label: 'Saved views', items, className: 'mine' })), /^<div class="curv-mobile-view-chips mine" role="group"/, 'className is on the outermost element: the scroller when there is no slot');
  for (const nothing of [null, undefined, false, '']) assert.doesNotMatch(render(h(mobile.MobileViewChips, { label: 'Saved views', items, trailing: nothing })), /chips-row|chips-trailing/);
});

test('the stage board takes the same trailing slot after its chips', () => {
  const html = render(h(mobile.MobileStageBoard, { label: 'Board', columns, activeColumnId: 'todo', chipsTrailing: h('button', { type: 'button' }, 'New project') }));
  assert.match(html, /^<section class="curv-mobile-board" aria-label="Board"><div class="curv-mobile-chips-row"><div class="curv-mobile-board-chips">/);
  assert.match(html, /<\/button><\/div><div class="curv-mobile-chips-trailing"><button type="button">New project<\/button><\/div><\/div><div class="curv-mobile-board-columns"/);
  assert.equal(count(html, /curv-mobile-board-chip"/g), 3, 'the slot is not a chip');
  const bare = render(h(mobile.MobileStageBoard, { label: 'Board', columns, activeColumnId: 'todo' }));
  assert.match(bare, /^<section class="curv-mobile-board" aria-label="Board"><div class="curv-mobile-board-chips">/);
  assert.doesNotMatch(bare, /chips-row|chips-trailing/);
});

test('the slot is 44px tall like the chips, ends on the 16px gutter, and does not scroll with them', () => {
  const slot = cssRule('.curv-mobile-chips-trailing')[3];
  for (const pinned of [/flex: none/, /min-height: 44px/, /padding-right: 16px/, /align-items: center/]) assert.match(slot, pinned);
  const scroller = cssRule('.curv-mobile-chips-row > :is(.curv-mobile-view-chips, .curv-mobile-board-chips)')[3];
  assert.match(scroller, /flex: 1 1 0/);
  assert.match(scroller, /min-width: 0/);
  assert.equal(lastDeclaration(scroller, 'padding-right'), '0', 'the row\'s gap is the space after the last chip, so the scroller has no end padding of its own');
  const row = cssRule('.curv-mobile-chips-row')[3];
  assert.match(row, /display: flex/);
  assert.match(row, /gap: 8px/, 'a chip that is cut off is cut 8px before the slot, not flush against it');
  // The row paints the list's white behind the slot; the board's chips sit on the page as before.
  assert.match(cssRule('.curv-mobile-view-chips-row')[3], /background: var\(--curv-mobile-surface, #fff\)/);
  assert.match(cssRule('.curv-mobile-view-chips-row')[3], /color: var\(--curv-mobile-ink, #1b1b1b\)/);
  assert.equal(cssRules('.curv-mobile-board-chips-row').length, 0);
  // The round button is 44px here and 48px in the toolbar; a plain button or link is the toolbar action's pill, 44px tall.
  assert.match(cssRule('.curv-mobile-chips-trailing .curv-mobile-toolbar-button')[3], /width: 44px; height: 44px/);
  assert.match(cssRule('.curv-mobile-toolbar-button')[3], /width: 48px; height: 48px/);
  const pill = cssRule('.curv-mobile-chips-trailing > :is(button, a):not(.curv-mobile-toolbar-button)');
  assert.ok(pill[2].includes('.curv-mobile-toolbar-action'), 'one pill rule, not a copy');
  assert.equal(lastDeclaration(pill[3], 'height'), '44px');
  assert.match(pill[3], /border-radius: 24px/);
});

// ── MobileToolbarButton ─────────────────────────────────────────────────────

test('the toolbar button is a named round icon button with an optional count badge, and the toolbar draws the same one', () => {
  const filter = render(h(mobile.MobileToolbarButton, { label: 'Filter projects', count: 3 }));
  assert.match(filter, /^<button type="button" class="curv-mobile-toolbar-button" aria-label="Filter projects \(3\)"><svg[^>]*aria-hidden="true"[\s\S]*<\/svg><span class="curv-mobile-toolbar-badge" aria-hidden="true">3<\/span><\/button>$/);
  assert.match(render(h(mobile.MobileToolbarButton, { label: 'Filter', count: 12 })), /badge" aria-hidden="true">9\+</);
  for (const none of [0, -1, undefined]) {
    const plain = render(h(mobile.MobileToolbarButton, { label: 'Filter', count: none }));
    assert.doesNotMatch(plain, /badge/);
    assert.match(plain, /aria-label="Filter"/);
  }
  const sort = render(h(mobile.MobileToolbarButton, { label: 'Sort projects', icon: 'sort', className: 'extra', id: 'sort', disabled: true }));
  assert.match(sort, /<button type="button" class="curv-mobile-toolbar-button extra" aria-label="Sort projects" id="sort" disabled="">/);
  assert.notEqual(sort.match(/<path d="([^"]+)"/)[1], filter.match(/<path d="([^"]+)"/)[1], 'a different built-in icon');
  assert.match(render(h(mobile.MobileToolbarButton, { label: 'Add', icon: h('svg', { 'data-mine': 'yes' }), type: 'submit' })), /type="submit"[^>]*><svg data-mine="yes"><\/svg><\/button>/);
  // MobileListToolbar's Sort and Filter are this component, so the markup there is what it was.
  const toolbar = render(h(mobile.MobileListToolbar, { onSort() {}, sortLabel: 'Sort products', onFilter() {}, filterLabel: 'Filter products', filterCount: 3 }));
  assert.equal(count(toolbar, /<button type="button" class="curv-mobile-toolbar-button" aria-label="(Sort products|Filter products \(3\))"><svg/g), 2);
});

// ── MobileCard ──────────────────────────────────────────────────────────────

test('the card is a section with an optional heading above a padded body; the heading names the section', () => {
  const html = render(h(mobile.MobileCard, { title: 'Details', trailing: 'as of 9:41', id: 'details', 'data-test': 'card' }, h('p', null, 'Body')));
  const id = html.match(/<h2 id="([^"]+)">Details<\/h2>/)[1];
  assert.ok(html.includes(`<section id="details" data-test="card" class="curv-mobile-panel" aria-labelledby="${id}">`), html);
  assert.match(html, /<div class="curv-mobile-panel-head"><h2 id="[^"]+">Details<\/h2><span class="curv-mobile-panel-trailing">as of 9:41<\/span><\/div><div class="curv-mobile-panel-body"><p>Body<\/p><\/div><\/section>$/);
  // No title, no trailing: just the card, and an unnamed section is not given a name.
  assert.equal(render(h(mobile.MobileCard, null, 'x')), '<section class="curv-mobile-panel"><div class="curv-mobile-panel-body">x</div></section>');
  assert.match(render(h(mobile.MobileCard, { trailing: 'Edit' }, 'x')), /<div class="curv-mobile-panel-head"><span class="curv-mobile-panel-trailing">Edit<\/span><\/div>/);
});

test('the card can be an article or a div, and a titled div is a named group so its name is not ignored', () => {
  assert.match(render(h(mobile.MobileCard, { as: 'article', title: 'Update' }, 'x')), /^<article class="curv-mobile-panel" aria-labelledby="[^"]+"><div class="curv-mobile-panel-head"><h2/);
  const div = render(h(mobile.MobileCard, { as: 'div', title: 'Update' }, 'x'));
  assert.match(div, /^<div class="curv-mobile-panel" aria-labelledby="[^"]+" role="group">/);
  assert.doesNotMatch(render(h(mobile.MobileCard, { as: 'div' }, 'x')), /role=|aria-labelledby/);
  assert.match(render(h(mobile.MobileCard, { as: 'div', title: 'Update', role: 'region' }, 'x')), /role="region"/, 'an app role wins');
  assert.match(render(h(mobile.MobileCard, { title: 'Nested', headingLevel: 3 }, 'x')), /<h3 id="[^"]+">Nested<\/h3>/);
  assert.match(render(h(mobile.MobileCard, { title: 'T', className: 'mt-4' }, 'x')), /class="curv-mobile-panel mt-4"/);
});

test('the card is the chart card\'s ground and heading, by shared rules, with the desktop tokens pinned to light values', () => {
  const ground = cssRule('.curv-mobile-chart-card-body');
  for (const selector of ['.curv-mobile-panel-body', '.curv-mobile-kv-card']) assert.ok(ground[2].includes(selector), `${selector} shares the ground rule`);
  assert.match(ground[3], /border-radius: 18px/);
  assert.match(ground[3], /box-shadow: 0 0 0 0\.5px rgb\(0 0 0 \/ 0\.08\)/);
  assert.match(ground[3], /background: var\(--curv-mobile-surface, #fff\)/);
  assert.match(ground[3], /padding: 16px/);
  for (const pinned of [/--card: var\(--curv-mobile-surface, #fff\)/, /--foreground: var\(--curv-mobile-ink, #1b1b1b\)/, /--muted-foreground: var\(--curv-mobile-ink-3, #6b6b6f\)/]) assert.match(ground[3], pinned);
  assert.ok(cssRule('.curv-mobile-chart-card')[2].split(',').map(part => part.trim()).includes('.curv-mobile-panel'), 'the same gutter margin');
  // The heading is the section heading every block shares, so a card stacked with a list section or a key-value list lines up.
  assert.ok(cssRule('.curv-mobile-flat-section-head')[2].includes('.curv-mobile-panel-head'));
  assert.ok(cssRule('.curv-mobile-flat-section-head h2')[2].includes('.curv-mobile-panel-head :is(h2, h3, h4)'));
  assert.ok(cssRule('.curv-mobile-flat-section-trailing')[2].includes('.curv-mobile-panel-trailing'));
  assert.ok(cssRule('.curv-mobile-kv-head')[2].includes('.curv-mobile-panel-head'), 'and pads in only what is left of the 20px');
  // Nothing in the library draws its card with MobileCard: the chart card and key-value list keep their own markup.
  assert.doesNotMatch(read('src/components/shell/mobile-content/chart-card.tsx') + read('src/components/shell/mobile-content/key-value-list.tsx'), /MobileCard|curv-mobile-panel/);
});

// ── List section heading size, and the gutter knob ──────────────────────────

test('a list section\'s heading is the 14px section heading unless headingSize is "title", the 20px of "Here\'s what needs you"', () => {
  const plain = render(h(mobile.MobileListSection, { title: 'Today' }, h('p', null, 'x')));
  assert.doesNotMatch(plain, /data-heading-size/);
  assert.equal(plain, render(h(mobile.MobileListSection, { title: 'Today', headingSize: 'section' }, h('p', null, 'x'))), 'explicit "section" is the default');
  const title = render(h(mobile.MobileListSection, { title: 'Today', headingSize: 'title', trailing: '3 new' }, h('p', null, 'x')));
  assert.match(title, /<section class="curv-mobile-flat-section" aria-labelledby="[^"]+" data-heading-size="title">/);
  assert.match(title, /<h2 id="[^"]+">Today<\/h2><span class="curv-mobile-flat-section-trailing">3 new<\/span>/, 'the markup is the same; only the attribute differs');
  // One rule draws the title-size heading for both.
  const size = cssRules('.curv-mobile-flat-section[data-heading-size="title"] .curv-mobile-flat-section-head h2');
  assert.equal(size.length, 1);
  assert.ok(size[0][2].includes('.curv-mobile-activity-title'), 'shared with the activity cards\' title');
  for (const pinned of [/font-size: 20px/, /font-weight: 600/, /line-height: 1\.25/, /letter-spacing: -0\.02em/, /color: var\(--curv-mobile-ink, #1b1b1b\)/]) assert.match(size[0][3], pinned);
  // It outranks the 14px grey rule, which has the lower specificity, and the trailing note stays 14px.
  assert.match(cssRule('.curv-mobile-flat-section-head h2')[3], /font-size: 14px/);
  assert.match(cssRule('.curv-mobile-flat-section-trailing')[3], /font-size: 14px/);
});

test('gutter sets the gutter variable on the block through an attribute, only when asked', () => {
  const rows = [{ id: 'a', label: 'A', value: '1' }];
  const blocks = {
    MobileFlatList: gutter => h(mobile.MobileFlatList, { label: 'L', gutter }, h('p', null, 'x')),
    MobileListSection: gutter => h(mobile.MobileListSection, { title: 'T', gutter }, h('p', null, 'x')),
    MobileKeyValueList: gutter => h(mobile.MobileKeyValueList, { rows, gutter }),
    MobileChartCard: gutter => h(mobile.MobileChartCard, { gutter }, h('p', null, 'x')),
    MobileGallery: gutter => h(mobile.MobileGallery, { images: [{ src: '/a.jpg', alt: 'A' }], label: 'Photos', gutter }),
    MobileCard: gutter => h(mobile.MobileCard, { gutter }, 'x'),
  };
  for (const [name, block] of Object.entries(blocks)) {
    assert.match(render(block('none')), /<[a-z]+ [^>]*data-gutter="none"/, name);
    assert.match(render(block('default')), /<[a-z]+ [^>]*data-gutter="default"/, name);
    assert.doesNotMatch(render(block(undefined)), /data-gutter/, `${name}: left alone, it inherits`);
  }
  // The chart card's markup without the prop is exactly what it was (see its own test).
  assert.equal(render(blocks.MobileChartCard(undefined)), '<section class="curv-mobile-chart-card"><div class="curv-mobile-chart-card-body"><p>x</p></div></section>');
  const knob = value => read('mobile.css').match(new RegExp(`\\n:is\\(([^)]+)\\)\\[data-gutter="${value}"\\] \\{([^}]*)\\}`));
  const none = knob('none');
  assert.ok(none && knob('default'), 'a rule for each value');
  for (const root of ['flat-list', 'flat-section', 'kv', 'chart-card', 'gallery', 'panel']) assert.ok(none[1].split(', ').includes(`.curv-mobile-${root}`), `${root} takes the knob`);
  assert.match(none[2], /--curv-mobile-gutter: 0px;/, 'a length with a unit: the headings subtract it inside calc()');
  assert.doesNotMatch(none[2], /--curv-mobile-gutter: 0;/);
  assert.equal(knob('default')[1], none[1], 'the same blocks');
  assert.match(knob('default')[2], /--curv-mobile-gutter: 16px;/);
  // The blocks read the variable they set, and the stylesheet says it is public.
  for (const selector of ['.curv-mobile-kv', '.curv-mobile-gallery']) assert.match(cssRule(selector)[3], /margin-inline: var\(--curv-mobile-gutter, 16px\)/);
  const tokens = read('mobile.css').slice(0, read('mobile.css').indexOf('/* ── Shared'));
  assert.match(tokens, /--curv-mobile-gutter is public/);
});

// ── Avatar colour ───────────────────────────────────────────────────────────

// The WCAG contrast of white on a colour, worked out here and not in the library.
const hslToRgb = (h, s, l) => {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map(value => Math.round(value * 255));
};
const luminance = rgb => { const [r, g, b] = rgb.map(value => { const c = value / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const whiteContrast = rgb => 1.05 / (luminance(rgb) + 0.05);

test('the avatar colour is the desktop avatar\'s hue for the same name, drawn at a lightness where white initials pass 4.5:1 for all eight hues', () => {
  const desktop = read('src/components/avatar.tsx');
  const hues = JSON.parse(desktop.match(/const HUES = (\[[^\]]+\]);/)[1]);
  assert.equal(hues.length, 8);
  assert.match(desktop, /h = \(h \* 31 \+ name\.charCodeAt\(i\)\) >>> 0;[\s\S]*HUES\[h % HUES\.length\]/, 'the hash this mirrors');
  const hueFor = name => { let hash = 0; for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0; return hues[hash % hues.length]; };
  const seen = new Set();
  for (const name of ['Jonas Johansson', 'Sam Lee', 'Alan', 'Priya N.', 'Åse Øvrebø', '', 'x', ...Array.from({ length: 60 }, (_, i) => `Person ${i}`)]) {
    const color = mobile.mobileAvatarColor(name);
    const [, hue, saturation, lightness] = color.match(/^hsl\((\d+) (\d+)% (\d+)%\)$/);
    assert.equal(Number(hue), hueFor(name), `${name}: the desktop's hue`);
    assert.equal(color, mobile.mobileAvatarColor(name), 'stable');
    seen.add(Number(hue));
    const contrast = whiteContrast(hslToRgb(Number(hue), Number(saturation), Number(lightness)));
    assert.ok(contrast >= 4.5, `${name}: ${color} is ${contrast.toFixed(2)}:1 under white initials`);
  }
  assert.deepEqual([...seen].sort((a, b) => a - b), [...hues].sort((a, b) => a - b), 'all eight hues were exercised');
  // The desktop avatar is not changed: its 46% lightness is the one that fails for some hues, which is why the phone has its own.
  assert.match(desktop, /hsl\(\$\{hueFor\(name\)\} 42% 46%\)/);
  assert.ok(hues.filter(hue => whiteContrast(hslToRgb(hue, 42, 46)) < 4.5).length >= 3);
});

test('a board card avatar takes its colour from the name when the app gives none, and keeps the one it is given', () => {
  const html = render(h(mobile.MobileStageBoard, { label: 'Board', activeColumnId: 'todo', columns: [{ id: 'todo', label: 'To do', count: 2, cards: [
    { id: 'a', title: 'A', href: '/a', avatar: { initials: 'JJ', label: 'Jonas Johansson' } },
    { id: 'b', title: 'B', href: '/b', avatar: { initials: 'SL', label: 'Sam Lee', color: '#7a5af8' } },
  ] }] }));
  assert.ok(html.includes(`role="img" aria-label="Jonas Johansson" style="background:${mobile.mobileAvatarColor('Jonas Johansson')}">JJ<`), html);
  assert.match(html, /aria-label="Sam Lee" style="background:#7a5af8">SL</);
});

// ── Counts: a number or a floor ─────────────────────────────────────────────

test('a chip count is a number with separators or a string shown as given ("12+"); an empty one draws nothing', () => {
  const chips = render(h(mobile.MobileViewChips, { label: 'Views', items: [{ id: 'a', label: 'All', count: 1182 }, { id: 'b', label: 'Late', count: '12+' }, { id: 'c', label: 'None', count: '' }, { id: 'd', label: 'Zero', count: 0 }, { id: 'e', label: 'No count' }] }));
  assert.match(chips, /<span>All<\/span><span class="curv-mobile-view-chip-count">1,182<\/span>/);
  assert.match(chips, /<span>Late<\/span><span class="curv-mobile-view-chip-count">12\+<\/span>/);
  assert.match(chips, /<span>Zero<\/span><span class="curv-mobile-view-chip-count">0<\/span>/);
  assert.equal(count(chips, /curv-mobile-view-chip-count/g), 3, 'an empty string and a missing count draw none');
  const floors = columns.map((column, index) => (index === 1 ? { ...column, count: '50+' } : column));
  const board = render(h(mobile.MobileStageBoard, { label: 'Board', columns: floors, activeColumnId: 'doing' }));
  assert.match(board, /aria-label="In production, 50\+"[^>]*><span>Making<\/span><span class="curv-mobile-board-chip-count">50\+</);
  assert.match(board, /<span class="curv-mobile-board-column-count">50\+<\/span>/);
  assert.match(board, /<span class="curv-mobile-board-chip-count">2</, 'a number is formatted as before');
  const big = render(h(mobile.MobileStageBoard, { label: 'Board', columns: columns.map((column, index) => (index === 1 ? { ...column, count: 12840 } : column)), activeColumnId: 'doing' }));
  assert.match(big, /aria-label="In production, 12,840"/);
  const declarations = read('dist/mobile.d.ts') + readdirSync(new URL('../dist', import.meta.url)).filter(file => file.endsWith('.d.ts')).map(file => read(`dist/${file}`)).join('\n');
  assert.match(declarations, /count: number \| string/, 'a stage column\'s count');
});

// ── Filter sheet ────────────────────────────────────────────────────────────

test('the filter sheet\'s reset row holds its height, shares the sheet\'s 16px edge, and the sheet is the recipe: title, lists, one footer button', () => {
  const row = cssRule('.curv-mobile-filter-reset')[3];
  assert.match(row, /min-height: 50px/, 'the plain button\'s height, held even when no button is drawn');
  const plain = cssRule('.curv-mobile-filter-reset > .curv-mobile-button-plain')[3];
  assert.match(plain, /padding-inline: 0/, 'the label starts on the body edge');
  assert.match(plain, /justify-content: flex-start/);
  const source = read('src/components/shell/mobile-content/filter-sheet.tsx');
  assert.match(source, /<MobileSheet/);
  assert.match(source, /variant="plain"/);
  assert.match(source, /<MobileButton ref=\{show\} block/);
  assert.equal(count(source, /<MobileButton/g), 2, 'Reset and the footer button, nothing else');
});

// ── Form fields ─────────────────────────────────────────────────────────────

test('a text field ties its label, hint and error to the input, and passes native props and its own id through', () => {
  const html = render(h(mobile.MobileTextField, {
    label: 'Project name', hint: 'Shown in lists', error: 'Enter a name', name: 'name', inputMode: 'text', autoComplete: 'off', enterKeyHint: 'next',
    placeholder: 'Spring catalog', required: true, 'aria-describedby': 'extra', fieldClassName: 'mb-4', className: 'mine', defaultValue: 'x',
  }));
  const id = html.match(/<label class="curv-mobile-field-label" for="([^"]+)">Project name<\/label>/)[1];
  const input = html.match(/<input [^>]*>/)[0];
  for (const attribute of [`id="${id}"`, 'type="text"', 'name="name"', 'inputMode="text"', 'autoComplete="off"', 'enterKeyHint="next"', 'placeholder="Spring catalog"', 'required=""', 'aria-invalid="true"', 'class="curv-mobile-field-control mine"']) assert.ok(input.includes(attribute), `${attribute} in ${input}`);
  assert.ok(input.includes(`aria-describedby="extra ${id}-hint ${id}-error"`), 'the app\'s own description first, then the hint, then the error');
  assert.ok(html.includes(`<p id="${id}-hint" class="curv-mobile-field-hint">Shown in lists</p>`));
  assert.ok(html.includes(`<p id="${id}-error" class="curv-mobile-field-error" role="alert">Enter a name</p>`));
  assert.match(html, /^<div class="curv-mobile-field mb-4" data-invalid="true">/);
  // An id the app chose is used for the label, the input and the ids that hang off it.
  const own = render(h(mobile.MobileTextField, { label: 'Owner', hint: 'Who runs it', id: 'owner' }));
  assert.match(own, /for="owner"/);
  assert.match(own, /<input [^>]*id="owner"[^>]*aria-describedby="owner-hint"/);
  assert.match(own, /<p id="owner-hint"/);
});

test('a field with nothing to say is just a label and a control: no description, not invalid, no empty paragraphs', () => {
  const html = render(h(mobile.MobileTextField, { label: 'Name', hint: false, error: null }));
  assert.doesNotMatch(html, /aria-describedby|aria-invalid|<p|data-invalid|role="alert"/);
  assert.match(html, /^<div class="curv-mobile-field"><div class="curv-mobile-field-head"><label class="curv-mobile-field-label" for="[^"]+">Name<\/label><\/div><input [^>]*type="text"/);
  assert.match(render(h(mobile.MobileTextField, { label: 'Email', type: 'email' })), /type="email"/);
  assert.match(render(h(mobile.MobileTextField, { label: 'Name', 'aria-invalid': true })), /aria-invalid="true"/, 'an app that validates on its own can still say so');
  assert.equal(count(render(h(mobile.MobileTextField, { label: 'A' })) + render(h(mobile.MobileTextField, { label: 'B' })), /for="([^"]+)"/g), 2);
});

test('a text area is the same field with rows', () => {
  const html = render(h(mobile.MobileTextArea, { label: 'Note', hint: 'Visible to the team', error: 'Too long', maxLength: 500, defaultValue: 'Hello' }));
  const id = html.match(/for="([^"]+)"/)[1];
  assert.match(html, /<textarea [^>]*id="[^"]+"[^>]*rows="4"[^>]*class="curv-mobile-field-control curv-mobile-field-textarea"[^>]*>Hello<\/textarea>/);
  assert.ok(html.includes(`aria-describedby="${id}-hint ${id}-error"`));
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /maxLength="500"/);
  assert.match(render(h(mobile.MobileTextArea, { label: 'Note', rows: 8 })), /rows="8"/);
});

test('a date field is a native date input with a visible label, and a Clear button only when it can clear and has a value', () => {
  const date = props => render(h(mobile.MobileDateField, { label: 'Due date', onChange() {}, ...props }));
  const plain = date({ value: '2026-10-22', min: '2026-01-01', hint: 'MM/DD/YYYY', error: 'Pick a later date' });
  assert.match(plain, /<input [^>]*id="[^"]+"[^>]*type="date"[^>]*class="curv-mobile-field-control"/);
  assert.match(plain, /value="2026-10-22"/);
  assert.match(plain, /min="2026-01-01"/);
  assert.match(plain, /aria-invalid="true"/);
  assert.doesNotMatch(plain, /Clear|data-action/, 'no onClear, no button and no held row');
  const filled = date({ value: '2026-10-22', onClear() {} });
  assert.match(filled, /<div class="curv-mobile-field-head" data-action="true"><label [^>]*>Due date<\/label><button type="button" id="[^"]+" class="curv-mobile-field-clear" aria-label="Clear Due date">Clear<\/button><\/div>/);
  const empty = date({ value: '', onClear() {} });
  assert.match(empty, /<div class="curv-mobile-field-head" data-action="true"><label [^>]*>Due date<\/label><\/div>/, 'the row is held, the button is not drawn');
  assert.doesNotMatch(empty, /<button/);
  assert.match(date({ defaultValue: '2026-10-22', onClear() {}, clearLabel: 'Fjern', onChange: undefined }), /aria-label="Fjern Due date">Fjern</);
  // A label that is not text cannot be an aria-label: the button is named by its own text and the label's, so it still says what it clears.
  const node = render(h(mobile.MobileDateField, { label: h('b', null, 'Due'), value: '2026-10-22', onChange() {}, onClear() {} }));
  const clearId = node.match(/<button type="button" id="([^"]+)" class="curv-mobile-field-clear" aria-labelledby="\1 ([^"]+)">Clear<\/button>/);
  assert.ok(clearId, node);
  assert.match(node, new RegExp(`<label id="${clearId[2].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" class="curv-mobile-field-label" for="[^"]+"><b>Due</b></label>`));
  assert.doesNotMatch(node, /aria-label="Clear"/);
  assert.doesNotMatch(plain, /<label id=/, 'no id on a label that nothing refers to');
  assert.equal(count(date({ value: '2026-10-22', onClear() {}, type: 'text' }), /type="date"/g), 1, 'it is always a date input');
});

test('a field is 17px (16px and up, so iOS does not zoom), 44px or taller, full width, with an edge that reads as a control', () => {
  const control = cssRule('.curv-mobile-field-control')[3];
  const size = Number(lastDeclaration(control, 'font-size').replace('px', ''));
  assert.ok(size >= 16, `font-size ${size}px zooms on iOS below 16px`);
  assert.equal(size, 17);
  for (const pinned of [/min-height: 44px/, /width: 100%/, /box-sizing: border-box/, /border: 1px solid var\(--curv-mobile-field-border, #8a8a90\)/, /border-radius: 12px/, /color-scheme: light/, /background: var\(--curv-mobile-surface, #fff\)/, /color: var\(--curv-mobile-ink, #1b1b1b\)/]) assert.match(control, pinned);
  // The edge is a control's: 3:1 against the white it sits on.
  assert.ok(whiteContrast(hslToRgb(0, 0, 55.1)) < 5, 'sanity');
  assert.ok(whiteContrast([0x8a, 0x8a, 0x90]) >= 3, '#8a8a90 on white');
  assert.match(cssRule('.curv-mobile-field-control:focus-visible')[3], /outline: 2px solid var\(--curv-mobile-accent, #1764c0\)/);
  assert.match(cssRule('.curv-mobile-field-control:disabled')[3], /opacity: 0\.45/);
  assert.match(cssRule('.curv-mobile-field-control::placeholder')[3], /color: var\(--curv-mobile-ink-3, #6b6b6f\)/);
  assert.match(cssRule('.curv-mobile-field-textarea')[3], /min-height: 112px/);
  assert.match(cssRule('.curv-mobile-field-control[type="date"]')[3], /min-height: 48px/);
  assert.match(cssRule('.curv-mobile-field-control[type="date"]::-webkit-date-and-time-value')[3], /text-align: left/);
  // Label 15px, hint and error 14px; the error is the library's one red, and an invalid field's edge is heavier as well.
  assert.match(cssRule('.curv-mobile-field-label')[3], /font-size: 15px/);
  assert.match(cssRule('.curv-mobile-field-error')[3], /color: var\(--curv-ink-critical, var\(--curv-mobile-critical, var\(--curv-critical, #b5352f\)\)\)/);
  assert.match(cssRule('.curv-mobile-field-hint')[3], /font-size: 14px/);
  assert.match(cssRule('.curv-mobile-field[data-invalid] .curv-mobile-field-control')[3], /box-shadow: inset 0 0 0 1px var\(--curv-mobile-critical/);
  assert.match(cssRule('.curv-mobile-field + .curv-mobile-field')[3], /margin-top: 16px/);
  // Clear is 28px to look at and 44px to hit; the row holds the 28px so it does not jump.
  assert.match(cssRule('.curv-mobile-field-clear')[3], /height: 28px/);
  assert.match(cssRule('.curv-mobile-field-clear::before')[3], /inset: -8px -2px/, '28 + 8 + 8 = 44');
  assert.match(cssRule('.curv-mobile-field-head[data-action]')[3], /min-height: 28px/);
});

// ── Switch row ──────────────────────────────────────────────────────────────

test('a switch row is one switch button named by its label and described by its sub-line, with a decorative switch', () => {
  const on = render(h(mobile.MobileSwitchRow, { label: 'Notify me', sub: 'When a milestone is late', checked: true, onCheckedChange() {}, id: 'notify', name: 'notify' }));
  const labelId = on.match(/aria-labelledby="([^"]+)"/)[1];
  const subId = on.match(/aria-describedby="([^"]+)"/)[1];
  assert.match(on, /^<button id="notify" type="button" role="switch" aria-checked="true" aria-labelledby="[^"]+" aria-describedby="[^"]+" class="curv-mobile-switch-row" name="notify">/);
  assert.ok(on.includes(`<span id="${labelId}" class="curv-mobile-switch-label">Notify me</span>`));
  assert.ok(on.includes(`<span id="${subId}" class="curv-mobile-switch-sub">When a milestone is late</span>`));
  assert.match(on, /<span class="curv-mobile-switch" aria-hidden="true"><span class="curv-mobile-switch-thumb"><\/span><\/span><\/button>$/);
  const off = render(h(mobile.MobileSwitchRow, { label: 'Archived', checked: false, onCheckedChange() {}, disabled: true }));
  assert.match(off, /aria-checked="false"/);
  assert.doesNotMatch(off, /aria-describedby|curv-mobile-switch-sub/, 'no sub-line, nothing to describe');
  assert.match(off, /disabled=""/);
  assert.equal(count(on, /<button/g), 1, 'the whole row is the one control');
});

test('the switch is 51 by 31 with a 27px thumb that travels 20px, and its track clears 3:1 against white in both states', () => {
  const track = cssRule('.curv-mobile-switch')[3];
  assert.match(track, /width: 51px/);
  assert.match(track, /height: 31px/);
  assert.match(track, /border-radius: 15\.5px/);
  const thumb = cssRule('.curv-mobile-switch-thumb')[3];
  assert.match(thumb, /width: 27px; height: 27px/);
  assert.match(thumb, /top: 2px; left: 2px/);
  assert.match(cssRule('.curv-mobile-switch-row[aria-checked="true"] .curv-mobile-switch-thumb')[3], /translateX\(20px\)/, '51 - 27 - 2 - 2');
  const off = track.match(/background: var\(--curv-mobile-switch-off, (#[0-9a-f]{6})\)/)[1];
  const on = cssRule('.curv-mobile-switch-row[aria-checked="true"] .curv-mobile-switch')[3].match(/background: var\(--curv-mobile-switch-on, var\(--curv-mobile-positive-solid, (#[0-9a-f]{6})\)\)/)[1];
  const rgb = hex => [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16));
  assert.ok(whiteContrast(rgb(off)) >= 3, `off ${off}: ${whiteContrast(rgb(off)).toFixed(2)}:1`);
  assert.ok(whiteContrast(rgb(on)) >= 3, `on ${on}: ${whiteContrast(rgb(on)).toFixed(2)}:1`);
  // The row is the option row's design: one rule set, 56px and 17px, so a switch row and an option row stack as one list.
  const row = cssRule('.curv-mobile-option');
  assert.ok(row[2].split(',').map(part => part.trim()).includes('.curv-mobile-switch-row'));
  assert.match(row[3], /min-height: 56px/);
  assert.match(row[3], /font-size: 17px/);
  assert.match(cssRule('.curv-mobile-switch-row:disabled')[3], /opacity: 0\.45/);
  assert.match(cssRule('.curv-mobile-switch-row:last-child')[3], /border-bottom: 0/);
  assert.match(cssRule('.curv-mobile-switch-sub')[3], /font-size: 15px/);
  // The thumb only travels for people who have not asked for less motion, and forced colours keep the state without a background.
  const css = read('mobile.css');
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\) \{[^@]*\.curv-mobile-switch, \.curv-mobile-switch-thumb \{ transition:/);
  assert.doesNotMatch(css.replace(/@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*?\n\}/g, ''), /\.curv-mobile-switch[^{]*\{[^}]*transition/);
  const forced = css.slice(css.lastIndexOf('@media (forced-colors: active) {'));
  assert.match(forced, /\.curv-mobile-switch \{ border: 2px solid ButtonText; \}/);
  assert.match(forced, /\.curv-mobile-switch-row\[aria-checked="true"\] \.curv-mobile-switch \{[^}]*background: Highlight/);
});

test('the docs and the skill name every 0.3.3 addition', () => {
  const names = [
    'MobileToolbarButton', 'MobileCard', 'MobileFilterSheet', 'MobileTextField', 'MobileTextArea', 'MobileDateField', 'MobileSwitchRow',
    'mobileAvatarColor', 'MobileTopBarTextAction', 'headingSize', 'gutter="none"', '--curv-mobile-gutter', 'chipsTrailing', 'trailing', '"12+"',
  ];
  for (const file of ['docs/mobile.md', 'skills/curv-mobile/SKILL.md']) {
    const text = read(file);
    for (const name of names) assert.ok(text.includes(name), `${file} mentions ${name}`);
  }
  // Rule 7 points at the sheet component and no longer describes assembling it by hand.
  assert.match(read('docs/mobile.md'), /`MobileFilterSheet` is that recipe/);
  // The components table has a row for each new component.
  const table = read('docs/mobile.md').slice(read('docs/mobile.md').indexOf('## Components'));
  for (const name of ['MobileToolbarButton', 'MobileCard', 'MobileFilterSheet', 'MobileTextField', 'MobileSwitchRow', 'mobileAvatarColor', 'MobileTopBarTextAction']) assert.match(table, new RegExp(`\\| [^\\n]*\`${name}\``), name);
});

// ── Audit fixes (0.3.3) ─────────────────────────────────────────────────────

const hexRgb = hex => [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16));
const contrastOf = (a, b) => { const [light, dark] = [luminance(hexRgb(a)), luminance(hexRgb(b))].sort((x, y) => y - x); return (light + 0.05) / (dark + 0.05); };

test('in a dark sheet an error and a plain button are inked from the theme and clear 4.5:1 on its card; a card inside the sheet puts the light ink back, with its hairline', () => {
  const theme = read('theme.css');
  const darkTheme = theme.slice(theme.indexOf('\n.dark {'));
  const card = darkTheme.match(/--card: (#[0-9A-Fa-f]{6})/)[1];
  const destructive = darkTheme.match(/--destructive: (#[0-9A-Fa-f]{6})/)[1];
  const css = read('mobile.css');
  const dark = css.match(/\n:is\(\.dark, \[data-theme="dark"\]\) \.curv-mobile-sheet \{([^}]*)\}/);
  assert.ok(dark, 'a rule for a dark sheet');
  const critical = dark[1].match(/--curv-ink-critical: var\(--destructive, (#[0-9a-f]{6})\)/);
  const accent = dark[1].match(/--curv-ink-accent: var\(--curv-mobile-accent-on-dark, (#[0-9a-f]{6})\)/);
  assert.ok(critical && accent, dark[1]);
  // The theme's own token is what is used, and its fallback is the dark theme's value too (the light red would be 3:1 there).
  assert.equal(critical[1].toLowerCase(), destructive.toLowerCase());
  for (const [name, ink] of [['--destructive', destructive], ['the error fallback', critical[1]], ['the accent', accent[1]]]) assert.ok(contrastOf(ink, card) >= 4.5, `${name} ${ink} on ${card}: ${contrastOf(ink, card).toFixed(2)}:1`);
  // Before: the page's inks on that card, which is what the audit measured.
  assert.ok(contrastOf('#b5352f', card) < 4.5 && contrastOf('#1764c0', card) < 4.5);
  // What reads the variables falls back to the light inks, which are 4.5:1 on white.
  assert.match(cssRule('.curv-mobile-field-error')[3], /color: var\(--curv-ink-critical, var\(--curv-mobile-critical, var\(--curv-critical, #b5352f\)\)\)/);
  assert.match(cssRule('.curv-mobile-field-clear')[3], /color: var\(--curv-ink-accent, var\(--curv-mobile-accent, #1764c0\)\)/);
  assert.match(cssRule('.curv-mobile-button-plain')[3], /color: var\(--curv-ink-accent, var\(--curv-mobile-accent, #1764c0\)\)/);
  assert.ok(contrastOf('#b5352f', '#ffffff') >= 4.5 && contrastOf('#1764c0', '#ffffff') >= 4.5);
  // A card is white in either theme: it puts the light inks and its hairline back for what is inside it.
  const panel = cssRule('.curv-mobile-panel-body')[3];
  assert.match(panel, /--border: var\(--curv-mobile-hairline, #e3e3e6\)/);
  assert.match(panel, /--curv-ink-critical: var\(--curv-mobile-critical, var\(--curv-critical, #b5352f\)\)/);
  assert.match(panel, /--curv-ink-accent: var\(--curv-mobile-accent, #1764c0\)/);
  assert.ok(css.slice(0, css.indexOf('/* ── Shared')).includes('--curv-mobile-accent-on-dark'), 'the dark accent is in the token list');
});

test('a stage card avatar colours from the bare name when it has one, and from the label when it does not', () => {
  const board = avatar => render(h(mobile.MobileStageBoard, { label: 'Board', activeColumnId: 'todo', columns: [{ id: 'todo', label: 'To do', count: 1, cards: [{ id: 'a', title: 'A', href: '/a', avatar }] }] }));
  const named = board({ initials: 'JS', label: 'Owner Justin Shook', name: 'Justin Shook' });
  assert.ok(named.includes(`aria-label="Owner Justin Shook" style="background:${mobile.mobileAvatarColor('Justin Shook')}"`), named);
  // Pick a label whose hash differs from the bare name's, so the test fails if the label is what is hashed.
  const labels = ['Owner Justin Shook', 'Owned by Justin Shook', 'Assigned to Justin Shook'];
  assert.ok(labels.some(label => mobile.mobileAvatarColor(label) !== mobile.mobileAvatarColor('Justin Shook')), 'sanity');
  for (const label of labels) assert.ok(board({ initials: 'JS', label, name: 'Justin Shook' }).includes(`style="background:${mobile.mobileAvatarColor('Justin Shook')}"`), label);
  assert.ok(board({ initials: 'JS', label: 'Justin Shook' }).includes(`style="background:${mobile.mobileAvatarColor('Justin Shook')}"`), 'no name: the label');
  assert.ok(board({ initials: 'JS', label: 'Owner Justin Shook', name: 'Justin Shook', color: '#7a5af8' }).includes('style="background:#7a5af8"'), 'a colour the app gives still wins');
});

test('the pure phone helpers are in the main entry too, for server components, and the files that define them have no React and no directive', async () => {
  const main = await import('../dist/index.js');
  assert.equal(typeof main.mobileAvatarColor, 'function');
  assert.equal(typeof main.mobileButtonClassName, 'function');
  assert.equal(main.mobileAvatarColor('Justin Shook'), mobile.mobileAvatarColor('Justin Shook'));
  assert.equal(main.mobileButtonClassName({ variant: 'plain', block: true, className: 'x' }), mobile.mobileButtonClassName({ variant: 'plain', block: true, className: 'x' }));
  assert.doesNotMatch(read('dist/index.js').slice(0, 40), /use client/, 'the main entry is not a client module');
  assert.match(read('dist/mobile.js').slice(0, 14), /^"use client";/, 'the mobile entry is');
  for (const file of ['avatar.ts', 'button-class.ts']) {
    const source = read(`src/components/shell/mobile-content/${file}`);
    assert.doesNotMatch(source, /["']use client["']/, file);
    assert.doesNotMatch(source, /from ["']react["']|import \* as React/, file);
  }
  assert.match(read('src/index.ts'), /export \{ mobileButtonClassName[^}]*\} from "\.\/components\/shell\/mobile-content\/button-class"/);
  assert.match(read('src/index.ts'), /export \{ mobileAvatarColor \} from "\.\/components\/shell\/mobile-content\/avatar"/);
  const declarations = read('dist/index.d.ts');
  assert.ok(declarations.includes('mobileAvatarColor') && declarations.includes('mobileButtonClassName'));
  // The button still gets its function from that file, so there is one definition.
  assert.match(read('src/components/shell/mobile-content/button.tsx'), /from "\.\/button-class"/);
  assert.doesNotMatch(read('src/components/shell/mobile-content/button.tsx'), /function mobileButtonClassName/);
});

test('the docs say which import works on the server, that Reset is passed resetVisible, and that counts widened', () => {
  for (const file of ['docs/mobile.md', 'skills/curv-mobile/SKILL.md']) {
    const text = read(file);
    assert.match(text, /server component/, `${file}: server components`);
    assert.match(text, /`@curvgroup\/design-system`/, `${file}: the main entry`);
    assert.match(text, /number \| string/, `${file}: the widened counts`);
    assert.match(text, /showPending/, `${file}: showPending`);
  }
  const docs = read('docs/mobile.md');
  assert.match(docs, /Reset[^.]*only while a filter is on[^.]*`resetVisible`|pass `resetVisible`/);
  assert.match(docs, /narrow/);
  assert.match(docs, /`name`/, 'the avatar name');
  assert.match(docs, /disabled[^.]*close control|close control[^.]*disabled/, 'the handoff when the footer button is disabled');
});

// ── Dark sheets: buttons and rows ───────────────────────────────────────────

/** The colour `top` (hex or `rgb(r g b / a)`) makes over the opaque `under` (hex). */
const over = (top, under) => {
  const alpha = top.match(/^rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)$/);
  if (!alpha) return top;
  const [r, g, b] = alpha.slice(1, 4).map(Number);
  const a = Number(alpha[4]);
  return `#${hexRgb(under).map((value, index) => Math.round(value + ([r, g, b][index] - value) * a).toString(16).padStart(2, '0')).join('')}`;
};

test('in a dark sheet the primary button is inverted and the secondary button has an edge, so both read against the sheet; light surfaces and the tab bar are untouched', () => {
  const theme = read('theme.css');
  const darkTheme = theme.slice(theme.indexOf('\n.dark {'));
  const token = name => darkTheme.match(new RegExp(`${name}: (#[0-9A-Fa-f]{6})`))[1];
  const sheet = token('--card');
  const css = read('mobile.css');
  const dark = css.match(/\n:is\(\.dark, \[data-theme="dark"\]\) \.curv-mobile-sheet \{([^}]*)\}/)[1];
  const value = name => dark.match(new RegExp(`${name}: ([^;]+);`))[1];
  // Primary: near-white fill, near-black text. Text 4.5:1 on the fill, and the fill 3:1 against the sheet for the button's shape.
  const primary = { fill: value('--curv-button-primary-bg'), ink: value('--curv-button-primary-ink') };
  assert.ok(contrastOf(primary.ink, primary.fill) >= 4.5, `primary text ${contrastOf(primary.ink, primary.fill).toFixed(2)}:1`);
  assert.ok(contrastOf(primary.fill, sheet) >= 3, `primary fill against the sheet ${contrastOf(primary.fill, sheet).toFixed(2)}:1`);
  assert.ok(contrastOf('#111113', sheet) < 3, 'sanity: the old near-black fill is the sheet\'s own colour');
  // Secondary: a faint fill (1.4:1, so not the shape), light text on it, and a 1px edge that is the shape.
  const fill = over(value('--curv-button-secondary-bg'), sheet);
  const edge = over(value('--curv-button-secondary-edge'), sheet);
  const ink = value('--curv-button-secondary-ink');
  assert.ok(contrastOf(ink, fill) >= 4.5, `secondary text on its fill ${contrastOf(ink, fill).toFixed(2)}:1`);
  assert.ok(contrastOf(ink, sheet) >= 4.5);
  assert.ok(contrastOf(edge, sheet) >= 3, `secondary edge against the sheet ${contrastOf(edge, sheet).toFixed(2)}:1`);
  assert.ok(contrastOf(fill, sheet) > 1.2, 'the fill is visible as well');
  // The rules read the variables with the light values as fallbacks, and the edge draws without changing the button's size.
  assert.match(cssRule('.curv-mobile-button-secondary')[3], /color: var\(--curv-button-secondary-ink, var\(--curv-mobile-ink, #1b1b1b\)\)/);
  assert.match(cssRule('.curv-mobile-button-secondary')[3], /box-shadow: inset 0 0 0 1px var\(--curv-button-secondary-edge, transparent\)/);
  // Scoped to a sheet only: the tab bar's action keeps its literal fill, and nothing but a sheet or a card sets these variables.
  assert.match(css, /\.curv-mobile-tabbar-primary \{[^}]*background: #111113; color: #ffffff/);
  const setters = [...css.matchAll(/(^|\n)([^\n{}@/][^\n{]*) \{[^}]*--curv-button-primary-bg:/g)].map(match => match[2]);
  assert.deepEqual(setters.sort(), ['.curv-mobile-chart-card-body, .curv-mobile-panel-body', ':is(.dark, [data-theme="dark"]) .curv-mobile-sheet']);
  // A card inside the sheet is white again: all five variables go back to the light defaults there.
  const panel = cssRule('.curv-mobile-panel-body')[3];
  for (const name of ['primary-bg', 'primary-ink', 'secondary-bg', 'secondary-ink', 'secondary-edge']) assert.match(panel, new RegExp(`--curv-button-${name}: initial;`), name);
});

test('in a dark sheet the rows read: label, count and check clear their contrast on the sheet', () => {
  const theme = read('theme.css');
  const darkTheme = theme.slice(theme.indexOf('\n.dark {'));
  const token = name => darkTheme.match(new RegExp(`${name}: (#[0-9A-Fa-f]{6})`))[1];
  const sheet = token('--card');
  const css = read('mobile.css');
  const accent = css.match(/--curv-ink-accent: var\(--curv-mobile-accent-on-dark, (#[0-9a-f]{6})\)/)[1];
  // The label is the sheet's own text colour (the row inherits it), the count and the sub-line the theme's muted text.
  assert.match(cssRule('.curv-mobile-option')[3], /color: inherit/);
  assert.ok(contrastOf(token('--foreground'), sheet) >= 4.5, 'label');
  assert.match(cssRule('.curv-mobile-option-count')[3], /color: var\(--muted-foreground, #6b6b6f\)/);
  assert.match(cssRule('.curv-mobile-option-heading')[3], /color: var\(--muted-foreground, #6b6b6f\)/);
  assert.ok(contrastOf(token('--muted-foreground'), sheet) >= 4.5, `count and heading ${contrastOf(token('--muted-foreground'), sheet).toFixed(2)}:1`);
  assert.match(cssRule('.curv-mobile-switch-sub')[3], /color: var\(--muted-foreground, /);
  // The check is the theme-aware accent, 7:1 where the page's blue was 3.1:1; a switch's tracks clear 3:1 against the sheet in both states.
  assert.ok(contrastOf(accent, sheet) >= 4.5, `check ${contrastOf(accent, sheet).toFixed(2)}:1`);
  for (const [name, track] of [['off', '#8a8a90'], ['on', '#1f7a33']]) assert.ok(contrastOf(track, sheet) >= 3, `switch ${name} ${contrastOf(track, sheet).toFixed(2)}:1`);
  assert.match(css, new RegExp(`--curv-mobile-switch-off, ${'#8a8a90'}\\)`));
});
