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
  const used = [...new Set(source.match(/curv-mobile-[a-z0-9-]+/g))].filter(name => !name.endsWith('-'));
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
  assert.match(cssRule('.curv-mobile-board-move-check')[3], /color: var\(--curv-mobile-accent, #1764c0\)/);
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
  assert.match(cssRule('.curv-mobile-button-primary')[3], /background: #111113; color: #ffffff/);
  assert.match(read('mobile.css'), /\.curv-mobile-tabbar-primary \{[^}]*background: #111113; color: #ffffff/, 'the same fill as the tab bar\'s action');
  assert.match(cssRule('.curv-mobile-button-secondary')[3], /background: var\(--curv-mobile-fill, #efeff1\)/);
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
  assert.match(cssRule('.curv-mobile-option-check')[3], /color: var\(--curv-mobile-accent, #1764c0\)/);
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
