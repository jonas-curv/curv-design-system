// The shared phone shell (0.4.0): Ask orb, the one glass bar, the header, rows and figures, the readout chart, picture and share bar.
// Static markup and the stylesheet's numbers. Interaction is in mobile-shell-events.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as mobile from '../dist/mobile.js';
import { MobileBottomNav, MobileHeader as MainEntryHeader } from '../dist/index.js';

const h = React.createElement;
const render = (component, props, ...children) => renderToStaticMarkup(h(component, props, ...children));
const count = (html, pattern) => (html.match(pattern) || []).length;
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const css = read('mobile.css');
const icon = name => h('svg', { 'data-icon': name });
/** The first rule written for exactly this selector, at the start of a line. */
const rule = selector => {
  const start = css.indexOf(`\n${selector} {`);
  assert.ok(start >= 0, `${selector} is defined`);
  return css.slice(start, css.indexOf('}', start));
};

const slots = [
  { id: 'home', label: 'Home', href: '/', icon: icon('home'), active: true },
  { id: 'orders', label: 'Orders', href: '/orders', icon: icon('orders') },
  { id: 'reports', label: 'Reports', href: '/reports', icon: icon('reports') },
  { id: 'inbox', label: 'Inbox', href: '/inbox', icon: icon('inbox'), badge: 3 },
];

// ── Exports and aliases ─────────────────────────────────────────────────────

test('the shell pieces are exported from the mobile entry, and every older name still is', () => {
  for (const name of ['AskOrb', 'MobileGroupRow', 'MobileCountRow', 'MobileFigure', 'MobilePicture', 'MobileShareBar']) assert.equal(typeof mobile[name], 'function', name);
  assert.equal(typeof mobile.AskButton, 'object', 'AskButton forwards a ref');
  for (const name of ['MobileBottomNav', 'MobileHeader', 'MobileHeaderTitle', 'MobileMoreMenu', 'MobileRecordRow', 'MobileChart', 'MobileTabBar', 'MobileTopBar', 'MobileSheet', 'MobilePage', 'MobileList']) assert.equal(typeof mobile[name], 'function', name);
  assert.equal(mobile.MobileBottomNav.name, 'MobileBottomNav');
  assert.equal(typeof MobileBottomNav, 'function', 'the main entry keeps it');
  assert.equal(typeof MainEntryHeader, 'function');
});

test('MobileBottomNav is MobileTabBar: the same glass markup, with the props it always took', () => {
  const html = render(MobileBottomNav, { items: slots, onMenu() {}, menuOpen: false });
  assert.match(html, /class="curv-mobile-tabbar curv-mobile-only"/);
  assert.match(html, /aria-label="Mobile navigation"/);
  assert.doesNotMatch(html, /curv-mobile-dock/, 'no flat dock markup is left');
  assert.match(html, /aria-label="More navigation"[^>]*aria-expanded="false"/, 'the old menu name');
  assert.equal(count(html, /curv-mobile-tabbar-item/g), 5);
  // The legacy cap: a search handler takes one of the five slots, as it did.
  const legacy = render(MobileBottomNav, { items: Array.from({ length: 8 }, (_, id) => ({ id: String(id), label: `P${id}`, href: `/${id}`, icon: 'x', active: id === 0 })), onSearch() {}, onMenu() {} });
  assert.equal(count(legacy, /<a /g), 3);
  assert.match(legacy, /aria-label="Search this OS"/);
  // renderLink keeps its old arguments.
  const calls = [];
  render(MobileBottomNav, { items: slots.slice(0, 2), renderLink: (item, props) => { calls.push([item.id, props.className, props['aria-current']]); return h('a', { href: item.href, className: props.className }, props.children); } });
  assert.deepEqual(calls, [['home', 'curv-mobile-tabbar-item', 'page'], ['orders', 'curv-mobile-tabbar-item', undefined]]);
  // searchOpen hides it, as it used to.
  assert.match(render(MobileBottomNav, { items: slots, searchOpen: true }), /<nav[^>]*hidden=""/);
});

// ── The bar ─────────────────────────────────────────────────────────────────

test('bar: the active slot says its name, the other four are icons, a badge sits on any slot, the last is the hamburger', () => {
  const html = render(mobile.MobileTabBar, { items: slots.map(item => item.id === 'orders' ? { ...item, badge: 12 } : item), onMenu() {} });
  assert.equal(count(html, /curv-mobile-tabbar-label/g), 1);
  assert.match(html, /<span class="curv-mobile-tabbar-label" aria-hidden="true">Home<\/span>/);
  assert.equal(count(html, /curv-mobile-tabbar-badge"/g), 2, 'the Orders slot and the Inbox slot both carry one');
  assert.ok(html.lastIndexOf('aria-label="Menu"') > html.lastIndexOf('aria-label="Inbox"'), 'the menu is the last slot');
  assert.doesNotMatch(html, /curv-mobile-tabbar-circle/, 'no search circle in the bar');
  assert.match(html, /aria-label="Menu"[^>]*aria-haspopup="dialog"/);
  // Opening the menu hands the current-page marker to the menu button.
  const open = render(mobile.MobileTabBar, { items: slots, onMenu() {}, menuOpen: true });
  assert.equal(count(open, /curv-mobile-tabbar-label/g), 0);
  assert.doesNotMatch(open, /aria-current/);
});

test('bar: it can be hidden by the app, and the legacy search circle only exists when asked for', () => {
  assert.match(render(mobile.MobileTabBar, { items: slots, hidden: true }), /<nav[^>]*hidden=""/);
  assert.doesNotMatch(render(mobile.MobileTabBar, { items: slots }), /<nav[^>]*hidden/);
  assert.match(render(mobile.MobileTabBar, { items: slots, onSearch() {} }), /curv-mobile-tabbar-circle/);
});

test('stylesheet: the bar is 64px, 12px from the edges, with a 52px black active pill and the Customs glass', () => {
  assert.match(css.slice(0, css.indexOf('}')), /--curv-mobile-dock-height: 76px/, 'the content reserve is a public token');
  assert.match(rule('.curv-mobile-tabbar'), /bottom: calc\(12px \+ env\(safe-area-inset-bottom\)\)[^}]*padding: 0 max\(12px, env\(safe-area-inset-right\)\) 0 max\(12px, env\(safe-area-inset-left\)\)/);
  assert.match(rule('.curv-mobile-tabbar-pill'), /height: 64px[^}]*padding: 0 6px[^}]*border-radius: 32px/);
  assert.match(rule('.curv-mobile-tabbar-item'), /height: 52px[^}]*border-radius: 26px/);
  const active = css.match(/\n\.curv-mobile-tabbar-item:is\(\[aria-current="page"\], \[aria-expanded="true"\]\) \{([^}]*)\}/);
  assert.ok(active);
  assert.match(active[1], /background: var\(--curv-mobile-tabbar-pill, #171b1d\)[^}]*color: var\(--curv-mobile-tabbar-pill-ink, #ffffff\)/);
  assert.match(rule('.curv-mobile-tabbar-label'), /font-size: 13px[^}]*font-weight: 600/);
  assert.match(css, /\.curv-mobile-tabbar-item\[aria-current="page"\] \{ flex: 1\.9 1 0;/);
  // The glass: fill, blur and saturation, edge, highlights and the two shadows, as measured on Customs.
  const glass = css.match(/@supports \(\(backdrop-filter: blur\(1px\)\)[^{]*\{\s*\.curv-mobile-tabbar-glass \{([^}]*)\}/)[1];
  assert.match(glass, /rgba\(250, 250, 251, \.62\)/);
  assert.match(glass, /blur\(24px\) saturate\(190%\)/);
  assert.match(glass, /var\(--curv-mobile-glass-edge-lit, rgba\(255, 255, 255, \.75\)\)/);
  assert.match(glass, /inset 0 1px 0 var\(--curv-mobile-glass-hi, rgba\(255, 255, 255, \.9\)\), inset 0 -1px 0 rgba\(0, 0, 0, \.04\), 0 12px 36px rgba\(17, 17, 26, \.18\), 0 2px 6px rgba\(17, 17, 26, \.08\)/);
});

test('stylesheet: dark chrome has its own lens and a white active pill, in either dark selector', () => {
  const dark = css.match(/:is\(\.dark, \[data-theme="dark"\]\) \.curv-mobile-tabbar \{([^}]*)\}/);
  assert.ok(dark, 'the dark tokens exist');
  for (const token of ['--curv-mobile-glass:', '--curv-mobile-glass-solid:', '--curv-mobile-glass-edge-lit:', '--curv-mobile-tabbar-ink:', '--curv-mobile-tabbar-pill: #f8fafb', '--curv-mobile-tabbar-pill-ink: #171b1d']) assert.ok(dark[1].includes(token), token);
  // Opaque under reduced transparency: the solid colour is the dark one too.
  assert.match(css, /@media \(prefers-reduced-transparency: reduce\), \(prefers-contrast: more\), \(forced-colors: active\) \{\s*\.curv-mobile-tabbar-glass \{[^}]*backdrop-filter: none/);
});

// ── Ask ─────────────────────────────────────────────────────────────────────

test('orb: sizes, states and busy are classes and data attributes, decorative for assistive tech', () => {
  for (const size of [18, 20, 24, 88]) assert.match(render(mobile.AskOrb, { size }), new RegExp(`class="curv-orb curv-orb-s${size}"`));
  const idle = render(mobile.AskOrb, {});
  assert.match(idle, /curv-orb-s24/);
  assert.match(idle, /aria-hidden="true"/);
  assert.match(idle, /data-state="idle"/);
  assert.doesNotMatch(idle, /data-busy/);
  assert.equal(count(idle, /<i><\/i>/g), 3, 'three layers of light');
  for (const state of ['searching', 'reading', 'writing']) {
    const html = render(mobile.AskOrb, { size: 18, state });
    assert.match(html, new RegExp(`curv-orb-${state}`));
    assert.match(html, /data-busy="true"/);
  }
  assert.match(render(mobile.AskOrb, { busy: true }), /data-state="searching"/, 'busy alone looks like searching');
  assert.match(render(mobile.AskOrb, { busy: true, state: 'writing' }), /data-state="writing"/, 'a named state wins over busy');
  assert.match(render(mobile.AskOrb, { state: 'idle', busy: true }), /data-state="searching"/);
});

test('ask button: the phone circle has no label and a name; the desktop button says Ask AI', () => {
  const circle = render(mobile.AskButton, { onClick() {} });
  assert.match(circle, /<button[^>]*type="button"/);
  assert.match(circle, /aria-label="Ask AI"/);
  assert.match(circle, /data-variant="circle"/);
  assert.match(circle, /curv-orb-s20/);
  assert.doesNotMatch(circle.replace(/<[^>]*>/g, ''), /Ask AI/, 'no visible label');
  assert.match(circle, /aria-haspopup="dialog"[^>]*>|aria-expanded="false"/);
  const labelled = render(mobile.AskButton, { variant: 'labelled', onClick() {} });
  assert.match(labelled, /data-variant="labelled"/);
  assert.match(labelled, /curv-orb-s18/);
  assert.match(labelled, /<\/span>Ask AI<\/button>/);
  assert.doesNotMatch(labelled, /aria-label=/, 'its visible text is its name');
  assert.match(render(mobile.AskButton, { variant: 'labelled', label: 'Ask CFO' }), /Ask CFO<\/button>/);
  assert.match(render(mobile.AskButton, { open: true }), /aria-expanded="true"/);
  assert.match(render(mobile.AskButton, { busy: true }), /data-state="searching"/);
});

test('stylesheet: the orb is the Customs orb in every size and state, calm under reduced motion', () => {
  assert.match(rule('.curv-orb.curv-orb-s88'), /width: 88px; height: 88px; box-shadow: 0 10px 24px -6px rgba\(8, 118, 168, 0\.34\)/);
  assert.match(rule('.curv-orb.curv-orb-s24'), /width: 24px; height: 24px/);
  assert.match(rule('.curv-orb.curv-orb-s20'), /width: 20px; height: 20px/);
  assert.match(rule('.curv-orb.curv-orb-s18'), /width: 18px; height: 18px/);
  assert.match(rule('.curv-orb'), /border-radius: 50%; overflow: hidden; background: #dffaff/);
  for (const state of ['searching', 'reading', 'writing']) assert.ok(css.includes(`.curv-orb-${state} i:nth-child(1)`), state);
  assert.match(css, /\.curv-orb-searching i:nth-child\(1\) \{ animation-duration: 3\.2s; \}/);
  assert.match(css, /\.curv-orb-reading \{ animation: curv-orb-beat 0\.9s/);
  assert.match(css, /\.curv-orb-writing i:nth-child\(1\) \{ animation: curv-orb-a 10s linear infinite, curv-orb-glow 1\.8s/);
  assert.match(css, /\.curv-orb-s24\.curv-orb-writing, \.curv-orb-s18\.curv-orb-writing, \.curv-orb-s20\.curv-orb-writing \{ --wb: 3px; \}/);
  const reduced = css.match(/@media \(prefers-reduced-motion: reduce\) \{\s*\.curv-orb, \.curv-orb i[^}]*animation: none !important; \}\s*[^}]*transform: rotate\(40deg\); \}/);
  assert.ok(reduced, 'every orb animation stops, and the sheen is parked');
  assert.match(css, /:is\(\.dark, \[data-theme="dark"\]\) :is\(\.curv-orb-s18, \.curv-orb-s20, \.curv-orb-s24\) \{ box-shadow: 0 0 0 1px rgba\(255, 255, 255, 0\.12\); \}/);
});

test('stylesheet: the circle is 40px glass, the labelled button is the 40px white one, both reach a 44px target', () => {
  const circle = rule('.curv-ask-circle');
  assert.match(circle, /width: 40px; height: 40px[^}]*border-radius: 50%[^}]*background: rgba\(255, 255, 255, \.12\)[^}]*inset 0 1px 0 rgba\(255, 255, 255, \.18\)/);
  assert.match(rule('.curv-ask-circle::after'), /inset: -2px/);
  const labelled = rule('.curv-ask-labelled');
  assert.match(labelled, /height: 40px; padding: 0 13px 0 9px; gap: 7px; border-radius: 8px; background: #fff; color: #111; font-size: 13\.5px; font-weight: 600/);
  assert.match(css, /\.curv-ask:focus-visible \{ outline: 0; box-shadow: 0 0 0 2px #1b1b1b, 0 0 0 4px #6fe6ff; \}/);
});

// ── The header ──────────────────────────────────────────────────────────────

test('header: one title and nothing else when nothing else is passed; the older props still work', () => {
  const html = render(mobile.MobileHeader, { title: 'Orders' });
  assert.match(html, /<h1[^>]*><div class="curv-mobile-title-button"><span class="curv-mobile-title">Orders<\/span><\/div><\/h1>/);
  assert.doesNotMatch(html, /<button|curv-mobile-header-action/);
  const old = render(mobile.MobileHeader, { title: 'Bills', context: '12 open', onBack() {}, onTitleClick() {}, action: h('button', { type: 'button' }, 'New') });
  assert.match(old, /aria-label="Back"/);
  assert.match(old, /aria-label="Bills: open navigation"/);
  assert.match(old, /curv-mobile-context">12 open/);
  assert.match(old, /curv-mobile-header-action"><button type="button">New<\/button>/);
  assert.match(render(mobile.MobileHeaderTitle, { title: 'Bills', onTitleClick() {} }), /aria-label="Bills: open navigation"/);
});

test('header: a hub title is a caret dropdown (closed it lists nothing), a record is back plus id', () => {
  const pages = [{ id: 'a', label: 'Orders', href: '/orders', active: true }, { id: 'b', label: 'Quotes', href: '/quotes' }];
  const hub = render(mobile.MobileHeader, { title: 'Sales', switcher: pages });
  assert.match(hub, /<button type="button" class="curv-mobile-title-button" aria-expanded="false" aria-controls="[^"]+">/);
  assert.match(hub, /class="curv-mobile-down"/);
  // The list is in the document, hidden, right after the title (so aria-controls has a target and the list is the next tab stop).
  const target = hub.match(/aria-controls="([^"]+)"/)[1];
  assert.match(hub, new RegExp(`<nav id="${target}" class="curv-mobile-header-pages" aria-label="Pages" hidden="">`));
  assert.ok(hub.indexOf('curv-mobile-header-pages') < hub.indexOf('curv-mobile-header-action') || !hub.includes('curv-mobile-header-action'), 'before the right-hand buttons');
  const withRight = render(mobile.MobileHeader, { title: 'Sales', switcher: pages, onSearch() {}, ask: h(mobile.AskButton, { onClick() {} }) });
  assert.ok(withRight.indexOf('curv-mobile-header-pages') < withRight.indexOf('aria-label="Search"'), 'the list comes before search and Ask in tab order');
  const record = render(mobile.MobileHeader, { title: 'Ignored', recordId: 'CICO20142', onBack() {}, backLabel: 'Back to Orders', onMore() {}, moreLabel: 'More about CICO20142' });
  assert.match(record, /data-record="true"/);
  assert.match(record, /aria-label="Back to Orders"/);
  assert.match(record, /curv-mobile-title">CICO20142</);
  assert.doesNotMatch(record, /Ignored/, 'the record id takes the title\'s place');
  assert.match(record, /aria-label="More about CICO20142"/);
});

test('header: the right side is the search circle, the Ask slot and (on records) the ⋯ button, in that order', () => {
  const html = render(mobile.MobileHeader, { title: 'Orders', onSearch() {}, ask: h(mobile.AskButton, { onClick() {} }), onMore() {} });
  const order = ['aria-label="Search"', 'aria-label="Ask AI"', 'aria-label="More actions"'].map(needle => html.indexOf(needle));
  assert.ok(order.every(at => at > 0) && order[0] < order[1] && order[1] < order[2], String(order));
  assert.equal(count(html, /curv-mobile-header-circle/g), 1, 'the search circle is the one glass circle of its own');
  assert.match(html, /<button type="button" class="curv-mobile-icon-button" aria-label="More actions">/, 'the ⋯ is a plain 44px icon, not glass');
  assert.match(render(mobile.MobileHeader, { title: 'Orders', onSearch() {}, searchLabel: 'Search orders' }), /aria-label="Search orders"/);
});

test('stylesheet: the header is 62px black chrome with 40px glass circles that reach a 44px target', () => {
  assert.match(rule('.curv-mobile-header'), /min-height: calc\(62px \+ env\(safe-area-inset-top\)\)[^}]*background: var\(--curv-mobile-chrome\)/);
  assert.match(css, /--curv-mobile-chrome: #171b1d/);
  assert.match(rule('.curv-mobile-title'), /font-size: 20px/);
  assert.match(rule('.curv-mobile-header-circle'), /width: 40px; height: 40px[^}]*border-radius: 50%[^}]*rgba\(255, 255, 255, \.12\)[^}]*inset 0 1px 0 rgba\(255, 255, 255, \.18\)/);
  assert.match(rule('.curv-mobile-header-circle::after'), /inset: -2px/);
  assert.match(rule('.curv-mobile-header-action'), /gap: 8px/);
  // The older rule gives every button in the slot a 44px box; the circles win it back (specificity) and keep 40px.
  assert.match(css, /\.curv-mobile-header-action :is\(\.curv-mobile-header-circle, \.curv-ask-circle\) \{ min-width: 0; min-height: 0; width: 40px; height: 40px; border-radius: 50%; \}/);
  assert.match(css, /\.curv-mobile-header \.curv-mobile-title-button \{ appearance: none;[^}]*background: none; color: inherit; font: inherit;/, 'a title button does not depend on the app\'s reset');
});

// ── Rows and figures ────────────────────────────────────────────────────────

test('record row, one amount: the name and one line on the left, the amount and a toned word under it on the right', () => {
  const html = render(mobile.MobileRecordRow, { layout: 'amount', title: 'Acme Freight', meta: 'INV-204 · due Nov 12', value: '$4,210.00', status: 'Overdue', statusTone: 'bad', href: '/bills/204' });
  assert.match(html, /<a href="\/bills\/204" class="curv-mobile-record curv-mobile-record-layout-amount" data-layout="amount">/);
  assert.match(html, /<strong>Acme Freight<\/strong><span class="curv-mobile-record-subtitle">INV-204 · due Nov 12<\/span>/);
  assert.match(html, /<span class="curv-mobile-record-amount"><span class="curv-mobile-record-value">\$4,210\.00<\/span><span class="curv-mobile-record-status" data-tone="bad">Overdue<\/span><\/span>/);
  assert.doesNotMatch(html, /curv-mobile-record-footer|<svg/, 'no footer, no chevron, no second amount');
  for (const tone of ['good', 'warn', 'info', 'bad']) {
    assert.match(render(mobile.MobileRecordRow, { layout: 'amount', title: 'x', value: '1', status: 'Word', statusTone: tone }), new RegExp(`data-tone="${tone}"`));
    assert.ok(css.includes(`.curv-mobile-record-status[data-tone="${tone}"]`), tone);
  }
  assert.doesNotMatch(render(mobile.MobileRecordRow, { layout: 'amount', title: 'x', value: '1', status: 'Paid' }), /data-tone/, 'untoned is plain grey');
});

test('record row, one line: name, a short meta on the right, the amount, and an exception dot with a name for screen readers', () => {
  const html = render(mobile.MobileRecordRow, { layout: 'oneLine', title: 'Pacific Supply', meta: 'Nov 12', value: '$980.00', exception: 'warn', onClick() {} });
  assert.match(html, /<button type="button" class="curv-mobile-record curv-mobile-record-layout-one-line" data-layout="oneLine">/);
  assert.match(html, /<span class="curv-mobile-record-name"><strong>Pacific Supply<\/strong><span class="curv-mobile-record-dot" data-tone="warn" aria-hidden="true"><\/span><span class="curv-mobile-nav-sr">Needs attention<\/span><\/span>/);
  assert.match(html, /<span class="curv-mobile-record-note">Nov 12<\/span><span class="curv-mobile-record-value">\$980\.00<\/span>/);
  assert.match(render(mobile.MobileRecordRow, { layout: 'oneLine', title: 'x', exception: 'info' }), /For information/);
  assert.match(render(mobile.MobileRecordRow, { layout: 'oneLine', title: 'x', exception: 'info', exceptionLabel: 'Needs a PO' }), />Needs a PO</);
  assert.doesNotMatch(render(mobile.MobileRecordRow, { layout: 'oneLine', title: 'x', value: '1' }), /curv-mobile-record-dot/, 'no dot unless there is an exception');
  assert.match(rule('.curv-mobile-record-layout-one-line'), /min-height: 48px/);
  assert.match(rule('.curv-mobile-record-layout-amount'), /min-height: 56px/);
  assert.match(rule('.curv-mobile-record-layout-amount, .curv-mobile-record-layout-one-line'), /box-sizing: border-box; display: flex/, 'width 100% and padding do not overflow without a preflight');
  assert.match(rule('.curv-mobile-record-dot'), /width: 8px; height: 8px; border-radius: 50%/);
});

test('record row, the default layout is untouched, and a link adapter may receive data-layout', () => {
  const html = render(mobile.MobileRecordRow, { title: 'Acme', subtitle: 'Open', value: '$1', status: 'Paid', meta: 'Nov 1', href: '/x' });
  assert.match(html, /<a href="\/x" class="curv-mobile-record"><span class="curv-mobile-record-main">/);
  assert.doesNotMatch(html, /data-layout/);
  assert.match(html, /curv-mobile-record-footer/);
  let received;
  render(mobile.MobileRecordRow, { layout: 'amount', title: 'Acme', href: '/x', renderLink: props => { received = props; return h('a', { href: props.href }, props.children); } });
  assert.equal(received['data-layout'], 'amount');
  assert.equal(received.href, '/x');
  // An adapter written to the old contract forwards href, className and children and nothing else (Product OS's renderRowLink): the layout survives in the class.
  const oldAdapter = ({ href, className, children }) => h('a', { href, className }, children);
  for (const [layout, name] of [['amount', 'curv-mobile-record-layout-amount'], ['oneLine', 'curv-mobile-record-layout-one-line']]) {
    const html = render(mobile.MobileRecordRow, { layout, title: 'Acme', value: '$1', href: '/x', renderLink: oldAdapter });
    assert.match(html, new RegExp(`class="curv-mobile-record ${name}"`));
    assert.doesNotMatch(html, /data-layout/, 'the attribute is gone, the class is not');
  }
  assert.match(render(mobile.MobileRecordRow, { title: 'Acme', href: '/x', renderLink: oldAdapter }), /class="curv-mobile-record"/, 'the default layout has no layout class');
});

test('group row: a label on the left, count and total on the right, never a target', () => {
  const html = render(mobile.MobileGroupRow, { label: 'Due this week', count: 1234, total: '$41,200.00' });
  assert.match(html, /<div class="curv-mobile-group-row"><span class="curv-mobile-group-label">Due this week<\/span><span class="curv-mobile-group-figures"><span class="curv-mobile-group-count">1,234<\/span><span class="curv-mobile-group-total">\$41,200\.00<\/span><\/span><\/div>/);
  assert.doesNotMatch(html, /<a |<button/);
  assert.doesNotMatch(render(mobile.MobileGroupRow, { label: 'Later' }), /group-figures/);
  assert.match(render(mobile.MobileGroupRow, { label: 'Later', count: '12+' }), /group-count">12\+</);
  assert.match(render(mobile.MobileGroupRow, { label: 'Empty', count: 0 }), /group-count">0</, 'a zero count is still said');
});

test('count row: a 34px tile with tone, title, one line, a chevron on a target; zero is dim and still there', () => {
  const html = render(mobile.MobileCountRow, { count: 12, title: 'Bills to approve', meta: '$41,200 due this week', tone: 'warn', href: '/bills?state=approve' });
  assert.match(html, /<a href="\/bills\?state=approve" class="curv-mobile-count-row"><span class="curv-mobile-count-tile" data-tone="warn">12<\/span>/);
  assert.match(html, /curv-mobile-count-title">Bills to approve<\/span><span class="curv-mobile-count-meta">\$41,200 due this week</);
  assert.match(html, /curv-mobile-count-chevron" aria-hidden="true"/);
  const zero = render(mobile.MobileCountRow, { count: 0, title: 'Checks to review', meta: 'Nothing waiting', tone: 'bad', onClick() {} });
  assert.match(zero, /<span class="curv-mobile-count-tile" data-zero="true">0<\/span>/, 'dim, with no tone');
  assert.match(zero, /Checks to review/, 'never hidden');
  assert.match(render(mobile.MobileCountRow, { count: '0', title: 'x' }), /data-zero/);
  assert.match(render(mobile.MobileCountRow, { count: 1200, title: 'x' }), />1,200</);
  const plain = render(mobile.MobileCountRow, { count: 3, title: 'Info only' });
  assert.match(plain, /^<div class="curv-mobile-count-row">/);
  assert.doesNotMatch(plain, /chevron/);
  for (const tone of ['good', 'warn', 'info', 'bad']) assert.ok(css.includes(`.curv-mobile-count-tile[data-tone="${tone}"]`), tone);
  assert.match(rule('.curv-mobile-count-tile'), /min-width: 34px; height: 34px; padding: 0 6px; border-radius: 11px/);
  assert.match(rule('.curv-mobile-count-row'), /min-height: 56px/);
});

test('figure: a 24px tabular value with a muted label, inline or stacked, optionally live', () => {
  assert.equal(render(mobile.MobileFigure, { value: '$829.34', label: 'Spent, November' }),
    '<div class="curv-mobile-figure" data-layout="inline"><span class="curv-mobile-figure-value">$829.34</span><span class="curv-mobile-figure-label">Spent, November</span></div>');
  const stacked = render(mobile.MobileFigure, { value: '42', label: 'Open bills', layout: 'stacked' });
  assert.ok(stacked.indexOf('Open bills') < stacked.indexOf('>42<'), 'the label comes first in the document too');
  assert.match(render(mobile.MobileFigure, { value: '1', live: true }), /aria-live="polite" aria-atomic="true"/);
  assert.doesNotMatch(render(mobile.MobileFigure, { value: '1' }), /aria-live|figure-label/);
  assert.match(rule('.curv-mobile-figure-value'), /font-size: 24px[^}]*font-variant-numeric: tabular-nums/);
});

// ── The readout chart ───────────────────────────────────────────────────────

const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'].map((label, index) => ({ label, value: [62, 96, 74, 92, 70, 7][index] * 100, display: `$${[62, 96, 74, 92, 70, 7][index]}k`, ...(index === 5 ? { partial: true } : {}) }));

test('readout chart: the readout is above the bars and rests on the current period; there is no svg, no second axis and no legend', () => {
  const html = render(mobile.MobileChart, { points: months, readout: true, label: 'Spend by month', referenceLine: { value: 8000, label: 'Last year' } });
  assert.match(html, /^<figure class="curv-mobile-chart curv-mobile-chart-bars"/);
  assert.ok(html.indexOf('curv-mobile-figure') < html.indexOf('curv-mobile-chart-plot'), 'readout first');
  assert.match(html, /curv-mobile-figure-value">\$7k<\/span><span class="curv-mobile-figure-label">Nov so far</, 'the latest period, said as still in progress');
  assert.doesNotMatch(html, /aria-live/, 'the range input announces a scrub; a live region would say each value twice');
  assert.doesNotMatch(html, /<svg|<text|legend/i);
  assert.equal(count(html, /curv-mobile-chart-compare/g), 1, 'one dashed comparison line');
  assert.match(html, /role="img" aria-label="Spend by month\. Last year 8,000"/);
  assert.equal(count(html, /curv-mobile-chart-bar"/g), 6);
  assert.match(html, /<input type="range" class="curv-mobile-chart-scrub"[^>]*max="5"[^>]*value="5"/);
});

const barsOf = html => [...html.matchAll(/<i class="curv-mobile-chart-bar" data-emphasis="(\w+)" data-tone="(\w+)"( data-current="true")?/g)].map(match => [match[1], match[2], Boolean(match[3])]);

test('readout chart: emphasis is per bar: fill, the current one highlighted, a partial one hatched', () => {
  const html = render(mobile.MobileChart, { points: months, readout: true, label: 'Spend' });
  assert.deepEqual(barsOf(html), [['fill', 'dark', false], ['fill', 'dark', false], ['fill', 'dark', false], ['fill', 'dark', false], ['fill', 'dark', false], ['partial', 'dark', true]]);
  const planned = render(mobile.MobileChart, { points: months.map((point, index) => ({ ...point, partial: undefined, emphasis: index === 1 ? 'current' : index === 5 ? 'partial' : 'fill' })), readout: true, label: 'Spend' });
  assert.deepEqual(barsOf(planned).map(([emphasis,, current]) => [emphasis, current]), [['fill', false], ['fill', true], ['fill', false], ['fill', false], ['fill', false], ['partial', false]], 'an explicit current wins over the latest');
  assert.match(planned, /curv-mobile-figure-value">\$96k</, 'and the readout rests on it');
  assert.match(css, /\.curv-mobile-chart-bar\[data-emphasis="partial"\] \{ background: repeating-linear-gradient/);
  assert.match(css, /\.curv-mobile-chart-bar\[data-current\]:not\(\[data-tone="negative"\]\), \.curv-mobile-chart-col\[data-picked\] \.curv-mobile-chart-bar:not\(\[data-tone="negative"\]\) \{ --bar: var\(--curv-mobile-chart-current, #0f7a52\)/);
  assert.doesNotMatch(read('docs/mobile.md') + read('src/components/shell/mobile-chart.tsx'), /MobileChartBarPlan|bar: "fill"/, 'the paint field is not called a plan');
});

test('readout chart: a plan is a dashed tick at its own value, above or below the bar, said in the readout and to screen readers', () => {
  const planned = [{ label: 'Jan', value: 100, plan: 150 }, { label: 'Feb', value: 120, plan: 80 }, { label: 'Mar', value: 90 }, { label: 'Apr', value: 110, plan: null }];
  const html = render(mobile.MobileChart, { points: planned, readout: true, label: 'Revenue vs plan', format: value => `$${value}` });
  assert.equal(count(html, /<i class="curv-mobile-chart-plan"/g), 2, 'a tick only where there is a plan');
  const ticks = [...html.matchAll(/curv-mobile-chart-plan" style="bottom:([\d.]+)%"/g)].map(match => Number(match[1]));
  const bottoms = [...html.matchAll(/curv-mobile-chart-bar"[^>]*style="bottom:([\d.]+)%;height:([\d.]+)%"/g)].map(match => Number(match[1]) + Number(match[2]));
  assert.ok(ticks[0] > bottoms[0], `the plan $150 is above its $100 bar (${ticks[0]} over ${bottoms[0]})`);
  assert.ok(ticks[1] < bottoms[1], `the plan $80 is below its $120 bar (${ticks[1]} under ${bottoms[1]})`);
  assert.equal(ticks[0], 100, 'the plan counts towards the scale, so the tallest thing fills the plot');
  assert.match(html, /curv-mobile-figure-label">Apr</, 'a bar with no plan says only its period');
  const resting = render(mobile.MobileChart, { points: planned.map((point, index) => (index === 1 ? { ...point, emphasis: 'current' } : point)), readout: true, label: 'Revenue vs plan', format: value => `$${value}`, planLabel: 'budget' });
  assert.match(resting, /curv-mobile-figure-label">Feb · budget \$80</, 'the readout names the plan, in the app\'s word');
  assert.match(resting, /aria-valuetext="Feb · budget \$80: \$120"/, 'and so does the range input');
  assert.match(rule('.curv-mobile-chart-plan'), /left: -3px; right: -3px; height: 0; border-top: 2px dashed/);
});

test('readout chart: tones are dark, muted and red; a negative value is red unless told otherwise; the highlight never repaints a red bar', () => {
  const html = render(mobile.MobileChart, { points: [{ label: 'A', value: 5, tone: 'muted' }, { label: 'B', value: 7 }, { label: 'C', value: -3 }, { label: 'D', value: -2, tone: 'dark' }], readout: true, label: 'Net' });
  assert.deepEqual(barsOf(html).map(([, tone]) => tone), ['muted', 'dark', 'negative', 'dark']);
  assert.match(rule('.curv-mobile-chart-bar[data-tone="muted"]'), /--bar: var\(--curv-mobile-chart-bar-muted, #d4d4d8\)/);
  assert.match(rule('.curv-mobile-chart-bar[data-tone="negative"]'), /--bar: var\(--curv-mobile-chart-negative, #dc2626\)[^}]*border-radius: 0 0 4px 4px/);
  assert.match(css, /\.curv-mobile-chart-dark \.curv-mobile-chart-bar\[data-tone="negative"\] \{ --bar: var\(--curv-mobile-chart-negative-dark/);
});

test('readout chart: a long last label is anchored to its own edge so it grows inward, and the card never cuts it', () => {
  const series = ['Jun', 'Jul', 'Aug', 'Sep'].map((label, index) => ({ label, value: 10 + index }));
  const html = render(mobile.MobileChart, { points: series, readout: true, label: 'Revenue', endLabel: 'Sep · $1.59M' });
  assert.match(html, /<span data-edge="end">Sep · \$1\.59M<\/span>/);
  assert.doesNotMatch(html, /data-edge="start"/, 'short first label stays centred');
  assert.doesNotMatch(render(mobile.MobileChart, { points: series, readout: true, label: 'Revenue' }), /data-edge/, 'short labels keep their place under the bars');
  assert.match(css, /\.curv-mobile-chart-xaxis > span\[data-edge="end"\] \{ justify-content: flex-end; \}/);
  assert.match(css, /\.curv-mobile-chart-xaxis > span\[data-edge="start"\] \{ justify-content: flex-start; \}/);
  assert.match(rule('.curv-mobile-chart-xaxis > span'), /display: flex; justify-content: center/);
});

test('readout chart: a null is a gap with no bar, never a zero, and an all-null series says so', () => {
  const gap = render(mobile.MobileChart, { points: [{ label: 'A', value: 5 }, { label: 'B', value: null }, { label: 'C', value: 8 }], readout: true, label: 'Gap' });
  assert.equal(count(gap, /curv-mobile-chart-bar"/g), 2);
  const none = render(mobile.MobileChart, { points: [{ label: 'A', value: null }, { label: 'B', value: null }], readout: true, label: 'None', emptyMessage: 'Could not load.' });
  assert.match(none, /Could not load\./);
  assert.doesNotMatch(none, /curv-mobile-figure/);
});

test('readout chart: axis labels are 12px real text and thin out to fit; negatives get a zero line; the dark tone is its own', () => {
  assert.match(rule('.curv-mobile-chart-xaxis > span'), /font-size: 12px/);
  const many = Array.from({ length: 24 }, (_, index) => ({ label: `Jan ${index + 1}`, value: index + 1 }));
  const html = render(mobile.MobileChart, { points: many, readout: true, label: 'Daily' });
  const shown = [...html.matchAll(/<span[^>]*>([^<]+)<\/span>/g)].map(match => match[1]).filter(text => text.startsWith('Jan'));
  assert.ok(shown.length > 1 && shown.length < 24, `${shown.length} of 24 labels fit`);
  assert.equal(shown[shown.length - 1], 'Jan 24', 'the latest is always one of them');
  const all = render(mobile.MobileChart, { points: months, readout: true, label: 'Monthly' });
  assert.equal(count(all, /<span[^>]*>(Jun|Jul|Aug|Sep|Oct|Nov)<\/span>/g), 6, 'six short labels all fit');
  assert.match(render(mobile.MobileChart, { points: [{ label: 'A', value: -4 }, { label: 'B', value: 6 }], readout: true, label: 'Net' }), /curv-mobile-chart-zero/);
  assert.match(render(mobile.MobileChart, { points: months, readout: true, tone: 'dark', label: 'x' }), /curv-mobile-chart-dark/);
  assert.match(rule('.curv-mobile-chart-plot'), /touch-action: pan-y pinch-zoom/);
});

test('readout chart: a readout override says something else at rest, and without readout the chart is the one it always was', () => {
  const html = render(mobile.MobileChart, { points: months, readout: { value: '$401k', period: 'Last 6 months' }, label: 'Spend' });
  assert.match(html, /curv-mobile-figure-value">\$401k<\/span><span class="curv-mobile-figure-label">Last 6 months</);
  const plain = render(mobile.MobileChart, { points: months, label: 'Spend' });
  assert.match(plain, /<svg/);
  assert.doesNotMatch(plain, /curv-mobile-chart-bars/);
  assert.match(render(mobile.MobileChart, { points: [{ label: 'A', value: 1 }], readout: true, label: 'One' }), /<svg/, 'one point is not a series of bars: the old chart draws it');
});

// ── Picture and share bar ───────────────────────────────────────────────────

test('picture: a 16:10 card with a label chip, a gradient caption of a title and one line, and a safe image', () => {
  const html = render(mobile.MobilePicture, { src: '/render.jpg', alt: 'Render of the tote', label: 'Latest render', title: 'Canvas tote', caption: '12oz, natural, 2-colour print' });
  assert.match(html, /^<div class="curv-mobile-picture"><img class="curv-mobile-picture-image" src="\/render\.jpg" alt="Render of the tote"[^>]*loading="lazy"[^>]*referrerPolicy|referrerpolicy="no-referrer"/i);
  assert.match(html, /curv-mobile-picture-chip">Latest render</);
  assert.match(html, /curv-mobile-picture-title">Canvas tote<\/span><span class="curv-mobile-picture-line">12oz, natural, 2-colour print</);
  assert.match(rule('.curv-mobile-picture'), /aspect-ratio: 16 \/ 10/);
  assert.match(rule('.curv-mobile-picture-chip'), /left: 12px; top: 12px/);
  assert.match(rule('.curv-mobile-picture-caption'), /linear-gradient\(180deg, transparent, rgb\(0 0 0 \/ 0\.62\)\)/);
  const empty = render(mobile.MobilePicture, { alt: 'No render yet', title: 'Canvas tote' });
  assert.match(empty, /curv-mobile-picture-empty" role="img" aria-label="No render yet"/);
  assert.match(empty, /Canvas tote/, 'the caption is kept without an image');
  assert.doesNotMatch(empty, /<img/);
  assert.doesNotMatch(render(mobile.MobilePicture, { src: '/a.jpg', alt: 'x' }), /caption|chip/);
});

test('picture: a link or a button when it opens something, plain otherwise', () => {
  assert.match(render(mobile.MobilePicture, { src: '/a.jpg', alt: 'x', href: '/deals/1/render' }), /^<a href="\/deals\/1\/render" class="curv-mobile-picture curv-mobile-picture-link">/);
  assert.match(render(mobile.MobilePicture, { src: '/a.jpg', alt: 'x', onClick() {} }), /^<button type="button" class="curv-mobile-picture curv-mobile-picture-link">/);
});

test('share bar: a readout, a bar that fills one share of it, and two label, value and percent pairs', () => {
  const html = render(mobile.MobileShareBar, { value: '$44,610.00', label: 'Revenue', segments: [{ label: 'Product GP', value: '$12,490.00', percent: 28 }, { label: 'Total GP', value: '$11,280.40', percent: 25.3 }] });
  assert.match(html, /curv-mobile-figure-value">\$44,610\.00<\/span><span class="curv-mobile-figure-label">Revenue</);
  assert.match(html, /role="img" aria-label="Product GP 28%"/);
  assert.match(html, /<i class="curv-mobile-share-a" style="width:28%"><\/i><i class="curv-mobile-share-b"><\/i>/);
  assert.match(html, /<dt>Product GP<\/dt><dd><span class="curv-mobile-share-value">\$12,490\.00<\/span><span class="curv-mobile-share-percent">28%<\/span><\/dd>/);
  assert.match(html, /<dt>Total GP<\/dt><dd>[^]*share-percent">25\.3%</);
  assert.equal(count(html, /<dt>/g), 2);
});

test('share bar: the canvas deal (revenue $800, Product GP $550 at 69%, Total GP $550 at 69%) draws 69% green, not half and half', () => {
  const html = render(mobile.MobileShareBar, { value: '$800.00', label: 'Revenue', segments: [{ label: 'Product GP', value: '$550.00', percent: 69 }, { label: 'Total GP', value: '$550.00', percent: 69 }] });
  assert.match(html, /<i class="curv-mobile-share-a" style="width:69%"><\/i>/);
  assert.equal(count(html, /share-percent">69%</g), 2, 'each pair keeps its own percent');
  // The pairs do not divide the bar: only the share does.
  const other = render(mobile.MobileShareBar, { value: '$800.00', segments: [{ label: 'Product GP', value: '$550.00', percent: 69 }, { label: 'Total GP', value: '$100.00', percent: 12 }] });
  assert.match(other, /style="width:69%"/);
  // An explicit share wins, and is clamped.
  assert.match(render(mobile.MobileShareBar, { value: 'x', share: 40, segments: [{ label: 'A', value: '1', percent: 69 }, { label: 'B', value: '2', percent: 12 }] }), /style="width:40%"/);
  assert.match(render(mobile.MobileShareBar, { value: 'x', share: 140, segments: [{ label: 'A', value: '1', percent: 1 }, { label: 'B', value: '2', percent: 1 }] }), /style="width:100%"/);
  assert.match(render(mobile.MobileShareBar, { value: 'x', share: -5, segments: [{ label: 'A', value: '1', percent: 1 }, { label: 'B', value: '2', percent: 1 }] }), /style="width:0%"/);
  assert.doesNotMatch(read('src/components/shell/mobile-content/share-bar.tsx'), /weight/, 'no weights: nothing divides between the pairs');
  const blank = render(mobile.MobileShareBar, { value: '—', segments: [{ label: 'GP', value: '—', percent: null }, { label: 'Cost', value: '—', percent: null }] });
  assert.doesNotMatch(blank, /<i class/, 'nothing known: an empty track, not a half bar');
  assert.match(blank, /share-percent">—</);
  assert.match(rule('.curv-mobile-share-bar'), /height: 10px/);
});

// ── The review's fixes ──────────────────────────────────────────────────────

test('bar: with the legacy search circle the slots are equal and icon-only, and every slot is at least 44px', () => {
  const withCircle = render(mobile.MobileTabBar, { items: slots, onSearch() {}, onMenu() {} });
  assert.match(withCircle, /<nav[^>]*data-tight="true"/);
  assert.doesNotMatch(render(mobile.MobileTabBar, { items: slots, onMenu() {} }), /data-tight/, 'without it the bar starts with the label');
  assert.match(rule('.curv-mobile-tabbar-item'), /flex: 1 1 0; min-width: 44px; height: 52px/);
  assert.match(css, /\.curv-mobile-tabbar-item\[aria-current="page"\] \{ flex: 1\.9 1 0; min-width: max-content;/, 'the active slot is never narrower than its label');
  assert.match(css, /\.curv-mobile-tabbar\[data-tight\] \.curv-mobile-tabbar-item\[aria-current="page"\] \{ flex: 1 1 0; min-width: 44px; display: grid; padding: 0; \}/);
  assert.match(css, /\.curv-mobile-tabbar\[data-tight\]:not\(\[data-collapsed\]\) \.curv-mobile-tabbar-label \{ position: absolute; visibility: hidden; pointer-events: none; \}/, 'hidden, but still laid out so the bar can measure it');
});

test('ask button: a caller\'s aria-label on the circle is kept', () => {
  assert.match(render(mobile.AskButton, { 'aria-label': 'Ask the CFO' }), /aria-label="Ask the CFO"/);
  assert.doesNotMatch(render(mobile.AskButton, { 'aria-label': 'Ask the CFO' }), /aria-label="Ask AI"/);
});

test('header: the labelled Ask button fits the slot, dark on white and 8px round; the page scroll padding follows the new reserve', () => {
  assert.match(css, /\.curv-mobile-header-action \.curv-ask-labelled \{ min-width: 0; min-height: 0; height: 40px; border-radius: 8px; color: #111; \}/);
  assert.equal(count(css, /scroll-padding-bottom: calc\(var\(--curv-mobile-dock-height, 76px\) \+ 12px \+ env\(safe-area-inset-bottom\)\)/g), 2);
  assert.doesNotMatch(css, /scroll-padding-bottom: calc\(110px/);
});

test('header: a screen has a title or a record id, and a title-only header takes no record props', () => {
  assert.match(render(mobile.MobileHeader, { recordId: 'CICO20142' }), /curv-mobile-title">CICO20142</);
  assert.match(render(mobile.MobileHeaderTitle, { title: 'Bills', onTitleClick() {} }), /aria-label="Bills: open navigation"/);
  assert.doesNotMatch(render(mobile.MobileHeader, { recordId: 'CICO20142', onTitleClick() {} }), /undefined/);
  assert.match(read('src/components/shell/mobile-command.tsx'), /\| \{ title\?: string; recordId: string \}/, 'the types demand one of them');
});

test('one switcher: the top bar and the header both use useTitleSwitcher', () => {
  assert.match(read('src/components/shell/mobile-nav/top-bar.tsx'), /useTitleSwitcher\(pages\)/);
  assert.match(read('src/components/shell/mobile-command.tsx'), /useTitleSwitcher\(pages\)/);
  assert.doesNotMatch(read('src/components/shell/mobile-command.tsx'), /addEventListener\("pointerdown"/, 'no second copy of the outside-tap logic');
});

test('vendor script: it reads the declaration chunk from mobile.d.ts, ships docs and skill, writes the manifest and tarball, and verifies', () => {
  const script = read('scripts/vendor-payload.sh');
  for (const needle of [/grep -oE "from '\\\.\/\[\^'\]\+\\\.js'" dist\/mobile\.d\.ts/, /cp docs\/mobile\.md/, /cp skills\/curv-mobile\/SKILL\.md/, /mobile-source\.json/, /git archive --format=tar HEAD docs mobile\.css package\.json package-lock\.json src tests \| gzip -n/, /git rev-parse HEAD/, /version/, /"dist\/mobile\.js": "\$JS_SHA"/, /verify failed/, /git diff --quiet HEAD/]) assert.match(script, needle);
  assert.doesNotMatch(script, /mobile-command-[A-Za-z0-9_-]+\.d\.ts/, 'no hard-coded chunk name');
  assert.match(read('package.json'), /"vendor": "bash scripts\/vendor-payload\.sh"/);
  assert.match(read('docs/mobile.md'), /scripts\/vendor-payload\.sh \/path\/to\/app/);
  assert.match(read('docs/mobile.md'), /Customs is on 0\.3\.4, Finance on 0\.2\.22 and Sales on 0\.2\.25/);
});

// ── Release: version, docs, skill ───────────────────────────────────────────

test('docs: the shell spec and the eleven rules are in docs/mobile.md, with the upgrade notes', () => {
  const docs = read('docs/mobile.md');
  assert.match(docs, /## The phone shell/);
  for (const needle of [/62px black chrome/, /64px tall, radius 32, 12px from the left, right and bottom edges/, /black \(`#171b1d`\) pill 52px tall/, /--curv-mobile-dock-height/, /\*\*76px\*\*/, /`AskButton`/, /40px glass circle holding a 20px orb/, /No search circle in the bar/, /hides while the software keyboard is open/, /Reduced transparency/]) assert.match(docs, needle);
  const rules = docs.slice(docs.indexOf('### The rules'), docs.indexOf('### Rows and figures'));
  assert.equal(count(rules, /^\d+\. \*\*/gm), 11, 'eleven rules');
  for (const needle of [/One title per screen/, /One glass bar, same slots everywhere/, /No explainer headings/, /Home is one number, count rows, one chart, one list/, /one Filter button with a badge count/, /A row is identity, one amount, meta and one exception/, /readout over scrubbable bars/, /A matrix is a list of lines/, /back plus id, name plus status, stage, picture, money with margins, two actions, sections/, /44px targets, 16px inputs, tabular numbers, nothing on hover/, /Honest states/, /showing data from 3:12 PM/]) assert.match(rules, needle);
  assert.match(docs, /## Upgrading to 0\.4\.0/);
  const upgrade = docs.slice(docs.indexOf('## Upgrading to 0.4.0'), docs.indexOf('## Upgrading to 0.3.4'));
  for (const needle of [/`MobileBottomNav` is deprecated/, /collapseOnScroll/, /`--curv-mobile-dock-height`[^\n]*76px/, /`MobileHeader`/, /`MobileRecordRow`/, /`MobileChart`[^\n]*`readout`/, /Vendoring/]) assert.match(upgrade, needle);
  const table = docs.slice(docs.indexOf('## Components'), docs.indexOf('## Upgrading to 0.4.0'));
  for (const name of ['AskButton', 'MobileGroupRow', 'MobileCountRow', 'MobileFigure', 'MobilePicture', 'MobileShareBar']) assert.ok(table.includes(`\`${name}\``), name);
});

test('skill: the curv-mobile skill names the shell pieces and the rules that are easy to get wrong', () => {
  const skill = read('skills/curv-mobile/SKILL.md');
  for (const needle of [/AskButton/, /MobileTabBar/, /MobileHeader/, /MobileCountRow/, /MobileFigure/, /MobileShareBar/, /search circle/, /--curv-mobile-dock-height/]) assert.match(skill, needle);
});
