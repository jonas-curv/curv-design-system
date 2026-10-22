import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MobileTopBar, MobileSurface, MobileTabBar, MobileMenuBody, MobileViewToggle } from '../dist/mobile.js';

const h = React.createElement;
const render = (component, props) => renderToStaticMarkup(h(component, props));
const count = (html, pattern) => (html.match(pattern) || []).length;
const icon = name => h('svg', { 'data-icon': name });
const items = Array.from({ length: 8 }, (_, id) => ({ id: `tab-${id}`, label: `Page ${id}`, href: `/${id}`, icon: icon(id), active: id === 1 }));

// ── MobileTabBar ───────────────────────────────────────────────────────────

test('tab bar: a search circle, icon-only destinations named by aria-label, capped at five with the menu', () => {
  const html = render(MobileTabBar, { items, onSearch() {}, onMenu() {} });
  assert.equal(count(html, /<a /g), 4);                       // 4 destinations + menu = 5 in the pill
  assert.equal(count(html, /curv-mobile-tabbar-item/g), 5);
  assert.match(html, /<button[^>]*class="curv-mobile-tabbar-circle[^"]*"[^>]*aria-label="Search"/);
  for (const id of [0, 1, 2, 3]) assert.match(html, new RegExp(`aria-label="Page ${id}"`));
  assert.doesNotMatch(html, /Page 4/);
  assert.match(html, /aria-label="Menu"[^>]*aria-expanded="false"/);
  assert.equal(count(html, /aria-current="page"/g), 1);
  assert.match(html, /<a href="\/1"[^>]*aria-label="Page 1" aria-current="page"/);
  assert.doesNotMatch(html, /curv-mobile-tabbar-label/);      // labels are icon-only until the bar shrinks
  assert.match(html, /aria-label="Mobile navigation"/);
  assert.match(html, /curv-mobile-only/);
  assert.match(html, /data-mode="tabs"/);
});

test('tab bar: without a menu the pill holds five destinations, without search no circle', () => {
  const html = render(MobileTabBar, { items });
  assert.equal(count(html, /<a /g), 5);
  assert.doesNotMatch(html, /curv-mobile-tabbar-circle|<button/);
});

test('tab bar: menu button reports its open state and the open menu clears the current page', () => {
  const html = render(MobileTabBar, { items, onMenu() {}, menuOpen: true, menuLabel: 'Open menu' });
  assert.match(html, /aria-label="Open menu"[^>]*aria-expanded="true"/);
  assert.doesNotMatch(html, /aria-current/);
});

test('tab bar: badge shows its text, is tied to the destination, and hides when empty', () => {
  const badged = items.slice(0, 2).map((item, index) => index === 1 ? { ...item, badge: 7 } : item);
  const html = render(MobileTabBar, { items: badged });
  assert.match(html, /<span class="curv-mobile-tabbar-badge" aria-hidden="true">7<\/span>/);   // the visible number is not read on its own
  const badge = html.match(/<span id="([^"]+)" class="curv-mobile-nav-sr">7 unread<\/span>/);
  assert.ok(badge, 'the badge is described as "7 unread"');
  assert.ok(html.includes(`aria-describedby="${badge[1]}"`));
  assert.match(render(MobileTabBar, { items: [{ ...items[0], badge: 120 }] }), />99\+</);
  assert.match(render(MobileTabBar, { items: [{ ...items[0], badge: 'New' }] }), />New</);
  assert.doesNotMatch(render(MobileTabBar, { items: [{ ...items[0], badge: 0 }] }), /curv-mobile-tabbar-badge/);
  assert.doesNotMatch(render(MobileTabBar, { items: [{ ...items[0], badge: '' }] }), /curv-mobile-tabbar-badge/);
});

test('tab bar: record mode swaps the pill for the hub link and the page action', () => {
  const html = render(MobileTabBar, {
    mode: 'record',
    items,
    onSearch() {},
    onMenu() {},
    leading: { label: 'Development', icon: icon('hub'), href: '/development' },
    action: h('input', { 'aria-label': 'Add an update', className: 'curv-mobile-tabbar-field' }),
  });
  assert.match(html, /<a href="\/development" class="curv-mobile-tabbar-circle[^"]*" aria-label="Development"/);
  assert.match(html, /<input aria-label="Add an update"/);
  assert.match(html, /class="curv-mobile-tabbar-action"/);
  assert.match(html, /aria-label="Record actions"/);
  assert.doesNotMatch(html, /curv-mobile-tabbar-item|aria-label="Search"|aria-label="Menu"/);
});

test('tab bar: search mode is a labelled field with a close circle, not destinations', () => {
  const html = render(MobileTabBar, {
    mode: 'search',
    items,
    onSearch() {},
    search: { value: 'sock', onChange() {}, onClose() {}, label: 'Search Product OS', placeholder: 'Search products' },
  });
  assert.match(html, /<form role="search"/);
  assert.match(html, /<input[^>]*type="search"[^>]*aria-label="Search Product OS"/);
  assert.match(html, /value="sock"/);
  assert.match(html, /placeholder="Search products"/);
  assert.match(html, /<button[^>]*class="curv-mobile-tabbar-circle[^"]*"[^>]*aria-label="Close search"/);
  assert.doesNotMatch(html, /<a |curv-mobile-tabbar-item/);
  assert.match(render(MobileTabBar, { mode: 'search', search: { value: '', onChange() {}, onClose() {}, label: 'Search', closeLabel: 'Done' } }), /aria-label="Done"/);
});

test('tab bar: renderLink receives the item and the props to spread, and breakpoint is honoured', () => {
  const seen = [];
  const html = render(MobileTabBar, {
    items: items.slice(0, 2),
    breakpoint: 'lg',
    renderLink: (item, props) => { seen.push([item.id, props['aria-label'], props['aria-current']]); return h('a', { 'data-routed': item.id, href: item.href, ...props }); },
  });
  assert.deepEqual(seen, [['tab-0', 'Page 0', undefined], ['tab-1', 'Page 1', 'page']]);
  assert.match(html, /data-routed="tab-1"/);
  assert.match(html, /data-breakpoint="lg"/);
});

// ── MobileTopBar and MobileSurface ──────────────────────────────────────────

test('top bar: a title with pages becomes a switcher button over real links', () => {
  const html = render(MobileTopBar, {
    title: 'Development',
    switcher: [{ id: 'home', label: 'Home', href: '/development', active: true }, { id: 'board', label: 'Board', href: '/development/board' }],
  });
  assert.match(html, /<h1 class="curv-mobile-topbar-title"><button type="button"[^>]*aria-expanded="false"[^>]*aria-controls="([^"]+)"/);
  assert.match(html, /Development<\/span><svg/);              // the title, then the chevron
  const controls = html.match(/aria-controls="([^"]+)"/)[1];
  assert.ok(html.includes(`id="${controls}"`));
  assert.match(html, /<a href="\/development" class="curv-mobile-topbar-page" aria-current="page"/);
  assert.match(html, /<a href="\/development\/board" class="curv-mobile-topbar-page">/);
  assert.equal(count(html, /aria-current="page"/g), 1);
  assert.match(html, /<nav[^>]*aria-label="Pages"[^>]*hidden/);  // listed only once opened
});

test('top bar: without pages the title is plain text and the trailing control is kept', () => {
  const html = render(MobileTopBar, { title: 'Inbox', trailing: h('button', { type: 'button' }, 'Toggle') });
  assert.match(html, /<h1 class="curv-mobile-topbar-title"><span class="curv-mobile-topbar-title-text">Inbox<\/span><\/h1>/);
  assert.doesNotMatch(html, /aria-expanded/);
  assert.match(html, /curv-mobile-topbar-trailing"><button type="button">Toggle/);
});

test('top bar: a record shows only the back chevron, named for where it goes', () => {
  const html = render(MobileTopBar, { backHref: '/development', backLabel: 'Back to Development' });
  assert.match(html, /<a href="\/development" class="curv-mobile-topbar-back" aria-label="Back to Development"/);
  assert.doesNotMatch(html, /<h1/);
  const button = render(MobileTopBar, { onBack() {}, backLabel: 'Back to Inbox' });
  assert.match(button, /<button type="button" class="curv-mobile-topbar-back" aria-label="Back to Inbox"/);
});

test('top bar: brings its own spacer, hides at the breakpoint like the dock, and routes links through the app', () => {
  const html = render(MobileTopBar, {
    title: 'Hub',
    breakpoint: 'lg',
    switcher: [{ id: 'a', label: 'A', href: '/a', active: true }],
    renderLink: (item, props) => h('a', { 'data-routed': item.id, href: item.href, ...props }),
  });
  assert.match(html, /<header class="curv-mobile-topbar curv-mobile-only" data-breakpoint="lg"/);
  assert.match(html, /curv-mobile-topbar-spacer curv-mobile-only/);
  assert.match(html, /data-routed="a"/);
});

test('surface: grouped by default, plain on request, and passes its class and content through', () => {
  assert.match(render(MobileSurface, { children: 'Rows' }), /<div class="curv-mobile-surface" data-tone="grouped">Rows<\/div>/);
  assert.match(render(MobileSurface, { tone: 'plain', className: 'extra', id: 'sheet' }), /id="sheet" class="curv-mobile-surface extra" data-tone="plain"/);
});

// ── MobileMenu ──────────────────────────────────────────────────────────────

const groups = [
  { id: 'home', label: 'Home', icon: icon('home'), href: '/', current: true },
  { id: 'inbox', label: 'Inbox', icon: icon('inbox'), href: '/inbox', badge: 7 },
  { id: 'products', label: 'Products', icon: icon('box'), defaultExpanded: true, children: [
    { id: 'catalog', label: 'Catalog', href: '/products', current: true },
    { id: 'reviews', label: 'Reviews', href: '/reviews' },
    { id: 'legacy', label: 'Legacy import', href: '/legacy', disabled: true },
  ] },
  { id: 'dev', label: 'Development', icon: icon('folder'), children: [{ id: 'projects', label: 'Projects', href: '/development' }] },
  { id: 'finance', label: 'Finance', icon: icon('money'), href: '/finance', disabled: true },
];

test('menu: groups toggle with aria-expanded and show their children, collapsed ones stay out of reach', () => {
  const html = render(MobileMenuBody, { groups });
  assert.match(html, /<button type="button" class="curv-mobile-menu-row" aria-expanded="true" aria-controls="([^"]+)"/);
  assert.match(html, /<button type="button" class="curv-mobile-menu-row" aria-expanded="false" aria-controls="([^"]+)"/);
  const open = html.match(/aria-expanded="true" aria-controls="([^"]+)"/)[1];
  assert.ok(html.includes(`<ul id="${open}" class="curv-mobile-menu-children">`));              // expanded: not hidden
  assert.match(html, /<ul id="[^"]+" class="curv-mobile-menu-children" hidden="">/);             // collapsed
  assert.match(html, /<a href="\/products" class="curv-mobile-menu-child" aria-current="page">Catalog<\/a>/);
  assert.match(html, /<a href="\/reviews" class="curv-mobile-menu-child">Reviews<\/a>/);
});

test('menu: a group with only an href is a link, the current page is marked, badges show', () => {
  const html = render(MobileMenuBody, { groups });
  assert.match(html, /<a href="\/" class="curv-mobile-menu-row" aria-current="page">/);
  assert.match(html, /<a href="\/inbox" class="curv-mobile-menu-row">.*<span class="curv-mobile-menu-badge">7<\/span>/);
  assert.equal(count(html, /aria-current="page"/g), 2);        // Home and Catalog
});

test('menu: desktop-only rows are dimmed plain text, never links, never focusable', () => {
  const html = render(MobileMenuBody, { groups });
  assert.equal(count(html, /aria-disabled="true"/g), 2);       // a disabled group and a disabled child
  // Announced as unavailable links, not hidden: role=link + aria-disabled, with the reason read after the name.
  assert.match(html, /<div class="curv-mobile-menu-row" role="link" aria-disabled="true">.*Finance<\/span><span class="curv-mobile-nav-sr">, desktop only<\/span><\/div>/);
  assert.match(html, /<div class="curv-mobile-menu-child" role="link" aria-disabled="true">Legacy import<span class="curv-mobile-nav-sr">, desktop only<\/span><\/div>/);
  assert.doesNotMatch(html, /href="\/finance"|href="\/legacy"/);
  assert.doesNotMatch(html, /aria-disabled="true"[^>]*(tabindex|href)/);
  // every anchor left is a real destination: Home, Inbox, Catalog, Reviews, Projects
  assert.equal(count(html, /<a /g), 5);
});

test('menu: account pill, close circle and navigation landmark', () => {
  const html = render(MobileMenuBody, { groups, account: { initials: 'PO', label: 'Product OS', color: '#2f6f5e', onClick() {} }, closeLabel: 'Close the menu' });
  assert.match(html, /<button type="button" class="curv-mobile-menu-account">/);
  assert.match(html, /<span class="curv-mobile-menu-avatar" aria-hidden="true" style="background:#2f6f5e">PO<\/span>/);
  assert.match(html, /<span class="curv-mobile-menu-account-label">Product OS<\/span>/);
  assert.match(html, /<button type="button" class="curv-mobile-menu-close" aria-label="Close the menu">/);
  assert.match(html, /<nav class="curv-mobile-menu-scroll" aria-label="Menu">/);
  const link = render(MobileMenuBody, { groups: [], account: { initials: 'PO', label: 'Product OS', href: '/switch' } });
  assert.match(link, /<a href="\/switch" class="curv-mobile-menu-account">/);
  assert.doesNotMatch(render(MobileMenuBody, { groups }), /curv-mobile-menu-account"/);
});

test('menu: links go through renderLink', () => {
  const routed = [];
  render(MobileMenuBody, { groups, renderLink: (item, props) => { routed.push(item.id); return h('a', { href: item.href, ...props }); } });
  assert.deepEqual(routed, ['home', 'inbox', 'catalog', 'reviews', 'projects']);
});

// ── MobileViewToggle ────────────────────────────────────────────────────────

const views = [{ value: 'list', label: 'List', icon: icon('list') }, { value: 'board', label: 'Board', icon: icon('board') }];

test('view toggle: two icon-only options, the selected one pressed', () => {
  const html = render(MobileViewToggle, { options: views, value: 'board' });
  assert.match(html, /<div role="group" aria-label="View" class="curv-mobile-viewtoggle" data-tone="dark">/);
  assert.match(html, /aria-label="List" aria-pressed="false"/);
  assert.match(html, /aria-label="Board" aria-pressed="true"/);
  assert.equal(count(html, /aria-pressed="true"/g), 1);
  assert.equal(count(html, /<button /g), 2);
});

test('view toggle: options with an href are links and mark the current view with aria-current', () => {
  const html = render(MobileViewToggle, {
    tone: 'light',
    value: 'list',
    options: views.map(view => ({ ...view, href: `/development?view=${view.value}` })),
  });
  assert.match(html, /<a href="\/development\?view=list" class="curv-mobile-viewtoggle-option" aria-label="List" aria-current="page">/);
  assert.match(html, /<a href="\/development\?view=board" class="curv-mobile-viewtoggle-option" aria-label="Board">/);
  assert.doesNotMatch(html, /aria-pressed/);
  assert.match(html, /data-tone="light"/);
});

test('view toggle: never more than two options', () => {
  const html = render(MobileViewToggle, { options: [...views, { value: 'map', label: 'Map', icon: icon('map') }], value: 'list' });
  assert.equal(count(html, /curv-mobile-viewtoggle-option"/g), 2);
});

// ── The stylesheet keeps the approved numbers ───────────────────────────────

const css = readFileSync(new URL('../mobile.css', import.meta.url), 'utf8');
const section = css.slice(css.indexOf('Phone navigation chrome'), css.indexOf('end phone navigation chrome'));
const rule = selector => {
  const start = section.indexOf(`\n${selector} {`);
  assert.ok(start >= 0, `${selector} is defined`);
  return section.slice(start, section.indexOf('}', start));
};

test('stylesheet: top bar, surface and bar carry the approved geometry', () => {
  assert.match(rule('.curv-mobile-topbar'), /height: calc\(76px \+ env\(safe-area-inset-top\)\)/);
  assert.match(rule('.curv-mobile-topbar'), /--curv-bar: var\(--curv-mobile-topbar, #1b1b1b\)/);
  assert.match(rule('.curv-mobile-topbar-title'), /font-size: 24px[^}]*font-weight: 600[^}]*letter-spacing: -\.01em/);
  assert.match(rule('.curv-mobile-surface'), /calc\(110px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(rule('.curv-mobile-surface'), /border-radius: 18px 18px 0 0/);
  assert.match(rule('.curv-mobile-tabbar'), /bottom: calc\(24px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(rule('.curv-mobile-tabbar-circle'), /width: 62px; height: 62px/);
  assert.match(rule('.curv-mobile-tabbar-pill'), /height: 62px[^}]*border-radius: 31px/);
  assert.match(rule('.curv-mobile-tabbar-item'), /height: 52px[^}]*border-radius: 26px/);
  assert.match(rule('.curv-mobile-tabbar-badge'), /var\(--curv-mobile-critical, var\(--curv-critical, #b5352f\)\)/);
  assert.match(rule('.curv-mobile-menu-badge'), /var\(--curv-mobile-critical, var\(--curv-critical, #b5352f\)\)/);
  assert.match(rule('.curv-mobile-menu-row'), /min-height: 52px[^}]*border-radius: 26px[^}]*font-size: 20px/);
  assert.match(rule('.curv-mobile-menu-child'), /min-height: 48px[^}]*padding: 0 16px 0 64px/);
});

test('stylesheet: the glass is solid first and solid again under reduced transparency, contrast and forced colours', () => {
  assert.match(rule('.curv-mobile-tabbar-glass'), /var\(--curv-mobile-glass-solid, #fafafb\)/);
  assert.match(section, /@supports \(\(backdrop-filter: blur\(1px\)\)[^{]*\{\s*\.curv-mobile-tabbar-glass \{[^}]*rgba\(250, 250, 251, \.62\)[^}]*blur\(24px\) saturate\(190%\)/);
  const fallback = section.match(/@media \(prefers-reduced-transparency: reduce\), \(prefers-contrast: more\), \(forced-colors: active\) \{\s*\.curv-mobile-tabbar-glass \{([^}]*)\}/);
  assert.ok(fallback, 'solid fallback media query exists');
  assert.match(fallback[1], /backdrop-filter: none/);
  assert.match(fallback[1], /#fafafb/);
});

test('stylesheet: motion is only added when the person has not asked for less', () => {
  const motion = section.match(/@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*?\n\}/g) || [];
  assert.ok(motion.length >= 1);
  const outside = section.replace(/@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*?\n\}/g, '');
  assert.doesNotMatch(outside, /transition:|animation:/);
});

// ── Review fixes: markup ────────────────────────────────────────────────────

test('packaging: dist/mobile.js is a client module, dist/index.js is not', () => {
  const mobileSource = readFileSync(new URL('../dist/mobile.js', import.meta.url), 'utf8');
  assert.ok(mobileSource.startsWith('"use client";'), 'a server layout can import MobileTopBar and MobileTabBar');
  assert.ok(!readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8').startsWith('"use client"'), 'the main entry keeps no directive');
});

test('tab bar: the badge is read as "<n> unread" (or the app\'s own words), the number itself is hidden from assistive tech', () => {
  const html = render(MobileTabBar, { items: [{ ...items[0], badge: 120 }] });
  assert.match(html, /aria-hidden="true">99\+</);
  assert.match(html, />120 unread</);
  const localised = render(MobileTabBar, { items: [{ ...items[0], badge: 4, badgeLabel: n => `${n} ulest` }] });
  assert.match(localised, /class="curv-mobile-nav-sr">4 ulest</);
  assert.match(render(MobileTabBar, { items: [{ ...items[0], badge: 'New' }] }), /class="curv-mobile-nav-sr">New</);
});

test('tab bar: ids that contain spaces never split an aria-describedby token', () => {
  const html = render(MobileTabBar, { items: [{ ...items[0], id: 'my inbox', badge: 3 }] });
  const described = html.match(/aria-describedby="([^"]+)"/)[1];
  assert.doesNotMatch(described, /\s/);
  assert.ok(html.includes(`id="${described}"`));
});

test('tab bar: search mode is a plain container holding the search landmark, so landmarks do not nest', () => {
  const search = { value: '', onChange() {}, onClose() {}, label: 'Search Product OS' };
  const html = render(MobileTabBar, { mode: 'search', items, search });
  assert.doesNotMatch(html, /<nav/);
  assert.match(html, /^<div class="curv-mobile-tabbar curv-mobile-only"[^>]*data-mode="search"/);
  assert.match(html, /<form role="search" aria-label="Search Product OS"/);
  assert.match(render(MobileTabBar, { mode: 'record', items, action: h('button') }), /^<nav aria-label="Record actions"/);
});

test('tab bar: search or record mode without what it needs stays the tab bar', () => {
  const noSearch = render(MobileTabBar, { mode: 'search', items });
  assert.match(noSearch, /data-mode="tabs"/);
  assert.equal(count(noSearch, /<a /g), 5);
  assert.doesNotMatch(noSearch, /<form|<input/);
  const noAction = render(MobileTabBar, { mode: 'record', items, leading: { label: 'Hub', icon: icon('hub'), href: '/hub' } });
  assert.match(noAction, /data-mode="tabs"/);
  assert.doesNotMatch(noAction, /curv-mobile-tabbar-action/);
  assert.match(render(MobileTabBar, { mode: 'search', items, search: { value: '', onChange() {}, onClose() {}, label: 'S' } }), /data-mode="search"/);
});

test('menu: the desktop-only reason can be reworded', () => {
  const html = render(MobileMenuBody, { groups, disabledLabel: 'kun på skrivebord' });
  assert.equal(count(html, /, kun på skrivebord</g), 2);
  assert.doesNotMatch(html, /desktop only/);
});

test('link adapters receive href in the props they spread, so one adapter body serves nav and content', () => {
  const adapter = (...args) => {
    const props = args[args.length - 1];
    return h('a', { 'data-adapted': 'yes', ...props });
  };
  const seen = [];
  const spy = (_item, props) => { seen.push(props.href); return adapter(_item, props); };
  const html = [
    render(MobileTabBar, { items: items.slice(0, 2), mode: 'tabs', renderLink: spy }),
    render(MobileTabBar, { mode: 'record', action: h('b'), leading: { label: 'Hub', icon: icon('hub'), href: '/hub' }, renderLink: spy }),
    render(MobileTopBar, { title: 'T', switcher: [{ id: 'a', label: 'A', href: '/a' }], backHref: '/up', backLabel: 'Back', renderLink: spy }),
    render(MobileMenuBody, { groups, account: { initials: 'PO', label: 'Product OS', href: '/switch' }, renderLink: spy }),
    render(MobileViewToggle, { options: views.map(view => ({ ...view, href: `/v/${view.value}` })), value: 'list', renderLink: spy }),
  ].join('');
  assert.deepEqual(seen, ['/0', '/1', '/hub', '/up', '/a', '/switch', '/', '/inbox', '/products', '/reviews', '/development', '/v/list', '/v/board']);
  assert.match(html, /<a data-adapted="yes" href="\/1"/);
});

// ── Review fixes: stylesheet ────────────────────────────────────────────────

test('stylesheet: one critical red, 5.97:1 under white, in the badges and in the text uses', () => {
  assert.doesNotMatch(css, /d6453f.{0,40}(?:ffffff|#fff)|--curv-critical, #d6453f/);
  const uses = css.match(/var\(--curv-mobile-critical,[^;}]*/g);
  assert.ok(uses.length >= 6);
  // Every use falls back to the older --curv-critical name before the hex, so the stylesheet's comment is true.
  assert.ok(uses.every(use => use.startsWith('var(--curv-mobile-critical, var(--curv-critical, #b5352f))')), uses.join(' | '));
});

test('stylesheet: focus stays clear of the fixed bars', () => {
  assert.match(css, /@media \(max-width: 767px\) \{[^@]*html:has\(\.curv-mobile-tabbar\[data-breakpoint="md"\]:not\(\[hidden\]\)\) \{ scroll-padding-bottom: calc\(110px \+ env\(safe-area-inset-bottom\)\); \}/);
  assert.match(css, /html:has\(\.curv-mobile-topbar\[data-breakpoint="md"\]\) \{ scroll-padding-top: calc\(76px \+ env\(safe-area-inset-top\)\); \}/);
  assert.match(css, /@media \(max-width: 1023px\) \{[^@]*html:has\(\.curv-mobile-tabbar\[data-breakpoint="lg"\]:not\(\[hidden\]\)\) \{ scroll-padding-bottom/);
});

test('stylesheet: the surface carries its own ink and one set of token names, with the old names as fallbacks', () => {
  assert.match(rule('.curv-mobile-surface'), /color: var\(--curv-mobile-ink, #1b1b1b\)/);
  assert.doesNotMatch(rule('.curv-mobile-surface'), /var\(--foreground/);
  assert.match(rule('.curv-mobile-surface'), /--curv-surface: var\(--curv-mobile-ground, var\(--curv-mobile-surface-grouped, #f4f4f5\)\)/);
  assert.match(css, /\[data-tone="plain"\] \{ --curv-surface: var\(--curv-mobile-surface, var\(--curv-mobile-surface-plain, #ffffff\)\)/);
});

test('stylesheet: the hero starts where the top bar ends, with no seam', () => {
  assert.match(css, /\.curv-mobile-hero \{[^}]*background: var\(--curv-mobile-hero-bg, var\(--curv-mobile-topbar, #1b1b1b\)\)/);
  assert.doesNotMatch(css, /#0e0e0f/);
});

test('stylesheet: the unread dot survives forced colours and a late date has a cue that is not colour', () => {
  const forced = css.slice(css.lastIndexOf('@media (forced-colors: active) {'));
  assert.match(forced, /\.curv-mobile-flat-unread \{[^}]*forced-color-adjust: none[^}]*background: Highlight/);
  assert.match(forced, /\.curv-mobile-board-date\[data-late="true"\] \{[^}]*text-decoration: underline/);
});

// ── Refinement round 1 (0.3.2) ──────────────────────────────────────────────

test('tab bar: the badge is drawn inside the icon\'s box and anchored to its top-right corner, never to a pixel beside the label', () => {
  const html = render(MobileTabBar, { items: [{ ...items[0], badge: 120 }] });
  assert.match(html, /<span class="curv-mobile-tabbar-icon" aria-hidden="true"><svg[^>]*><\/svg><span class="curv-mobile-tabbar-badge" aria-hidden="true">99\+<\/span><\/span>/);
  assert.match(rule('.curv-mobile-tabbar-icon'), /position: relative/);
  const badge = rule('.curv-mobile-tabbar-badge');
  assert.match(badge, /position: absolute; top: -\d+px; right: -\d+px/);
  assert.doesNotMatch(badge, /left:/);
  // The shrunken bar used to move it to left: 28px, onto the label. It has no rule of its own any more.
  assert.doesNotMatch(section, /\[data-collapsed\] \.curv-mobile-tabbar-badge/);
  // Instead a compact item that has a badge opens the gap to its label to more than the badge's overhang.
  const overhang = Number(badge.match(/right: -(\d+)px/)[1]);
  const gap = section.match(/\.curv-mobile-tabbar\[data-collapsed\] \.curv-mobile-tabbar-item\[data-compact\]:has\(\.curv-mobile-tabbar-badge\) \{ gap: (\d+)px; \}/);
  assert.ok(gap, 'a compact item with a badge has its own gap');
  assert.ok(Number(gap[1]) - overhang >= 6, `the badge (${overhang}px over the icon) clears the label by ${Number(gap[1]) - overhang}px`);
});

test('tab bar: every target is 44px or taller, the shrunken item included', () => {
  const compact = rule('.curv-mobile-tabbar[data-collapsed] .curv-mobile-tabbar-item[data-compact]');
  assert.match(compact, /height: 44px/);
  assert.match(compact, /border-radius: 22px/);
  assert.doesNotMatch(compact, /height: 40px/);
  const pill = rule('.curv-mobile-tabbar[data-collapsed] .curv-mobile-tabbar-pill');
  assert.match(pill, /height: 48px/, 'and it still fits inside the shrunken pill');
  for (const selector of ['.curv-mobile-tabbar-item', '.curv-mobile-tabbar-action-button', '.curv-mobile-tabbar-primary', '.curv-mobile-tabbar-circle', '.curv-mobile-tabbar[data-collapsed] .curv-mobile-tabbar-circle', '.curv-mobile-tabbar[data-collapsed] .curv-mobile-tabbar-item[data-compact]']) {
    const height = Number(rule(selector).match(/(?:^|[ ;{])height: (\d+)px/)[1]);
    assert.ok(height >= 44, `${selector} is ${height}px`);
  }
});

test('top bar: plain titles and switcher titles start at the same x, the 16px content gutter', () => {
  const row = rule('.curv-mobile-topbar-row');
  assert.match(row, /padding: 0 max\(12px, env\(safe-area-inset-right\)\) 0 max\(12px, env\(safe-area-inset-left\)\)/);
  // plain: 12px of row + 4px of its own padding. switcher: 12px of row + 4px of the button's left padding.
  assert.match(section, /\.curv-mobile-topbar-title > \.curv-mobile-topbar-title-text \{ padding-inline-start: 4px; \}/);
  assert.match(rule('.curv-mobile-topbar-switch'), /padding: 0 10px 0 4px/);
  // Both lines are 44px, so the text sits at the same height on every page.
  assert.match(rule('.curv-mobile-topbar-title-text'), /line-height: 44px/);
  assert.match(rule('.curv-mobile-topbar-switch'), /min-height: 44px/);
});
