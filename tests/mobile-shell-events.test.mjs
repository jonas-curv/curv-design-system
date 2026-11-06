// Event-level tests for the shared shell (0.4.0), in a real (happy-dom) DOM with real pointer, key and click events.
import './dom-setup.mjs';
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { createRoot } from 'react-dom/client';
import * as mobile from '../dist/mobile.js';

const h = React.createElement;
const { act } = React;

const mounted = [];
async function mount(node) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => { root.render(node); });
  const view = { container, root, render: async next => { await act(async () => { root.render(next); }); } };
  mounted.push(view);
  return view;
}
afterEach(async () => {
  for (const view of mounted.splice(0)) await act(async () => { view.root.unmount(); });
  document.body.innerHTML = '';
});
const dispatch = async (target, event) => { await act(async () => { target.dispatchEvent(event); }); return event; };
const click = (target, init = {}) => dispatch(target, new MouseEvent('click', { bubbles: true, cancelable: true, ...init }));
const key = (target, name) => dispatch(target, new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
const pointer = (target, type, init = {}) => dispatch(target, new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch', isPrimary: true, ...init }));
const is = (actual, expected, message) => assert.ok(actual === expected, message);

// ── Header ──────────────────────────────────────────────────────────────────

const pages = [{ id: 'orders', label: 'Orders', href: '/orders', active: true }, { id: 'quotes', label: 'Quotes', href: '/quotes' }];

const listOf = container => container.querySelector('nav.curv-mobile-header-pages');
const isOpen = container => !listOf(container).hasAttribute('hidden');

test('header: the title dropdown opens the hub\'s pages, marks the current one, and closes on a tap, Escape and a tap outside', async () => {
  const view = await mount(h('div', null, h(mobile.MobileHeader, { title: 'Sales', switcher: pages }), h('button', { id: 'elsewhere', type: 'button' }, 'Elsewhere')));
  const trigger = view.container.querySelector('button.curv-mobile-title-button');
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  assert.equal(isOpen(view.container), false);
  assert.equal(trigger.getAttribute('aria-controls'), listOf(view.container).id, 'aria-controls has a target while the list is closed');
  await click(trigger);
  assert.equal(trigger.getAttribute('aria-expanded'), 'true');
  assert.equal(isOpen(view.container), true);
  const links = [...view.container.querySelectorAll('nav a')];
  assert.deepEqual(links.map(link => link.textContent), ['Orders', 'Quotes']);
  assert.equal(links[0].getAttribute('aria-current'), 'page');
  assert.equal(links[1].getAttribute('aria-current'), null);
  // A tap on a page closes the list (the app's router does the rest), and the tapped row is the current one at once.
  links[1].addEventListener('click', event => event.preventDefault());
  await click(links[1]);
  assert.equal(isOpen(view.container), false);
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  assert.equal(links[1].getAttribute('aria-current'), 'page', 'the tapped page is current until the route reports its own');
  assert.equal(links[0].getAttribute('aria-current'), null);
  // Escape closes it and puts focus back on the title.
  await click(trigger);
  trigger.focus();
  await key(document, 'Escape');
  assert.equal(isOpen(view.container), false);
  is(document.activeElement, trigger, 'focus goes back to the title');
  // So does a press outside the header.
  await click(trigger);
  await pointer(view.container.querySelector('#elsewhere'), 'pointerdown', { pointerType: 'mouse', button: 0 });
  assert.equal(isOpen(view.container), false);
});

test('header: an adapter that drops onClick still closes the list on the tap, because the header closes it itself', async () => {
  // Written to the old link contract: href, className, children and aria-current only, no onClick (what a Next.js adapter that spreads selectively does).
  const view = await mount(h(mobile.MobileHeader, { title: 'Sales', switcher: pages, renderLink: (item, props) => h('a', { href: props.href, className: props.className, 'aria-current': props['aria-current'] }, props.children) }));
  const trigger = view.container.querySelector('button.curv-mobile-title-button');
  await click(trigger);
  assert.equal(isOpen(view.container), true);
  const quotes = [...view.container.querySelectorAll('nav a')][1];
  quotes.addEventListener('click', event => event.preventDefault());
  await click(quotes);
  assert.equal(isOpen(view.container), false, 'closed by the capture-phase handler, not by the adapter');
  assert.equal(quotes.getAttribute('aria-current'), 'page');
});

test('header: a modified click opens somewhere else, so this page stays the current one (the list still closes)', async () => {
  const view = await mount(h(mobile.MobileHeader, { title: 'Sales', switcher: pages }));
  await click(view.container.querySelector('button.curv-mobile-title-button'));
  const quotes = [...view.container.querySelectorAll('nav a')][1];
  quotes.addEventListener('click', event => event.preventDefault());
  await click(quotes, { metaKey: true });
  assert.equal(isOpen(view.container), false);
  assert.equal(quotes.getAttribute('aria-current'), null);
});

test('header: the search circle, the Ask slot and the more button call their own handlers', async () => {
  const log = [];
  const view = await mount(h(mobile.MobileHeader, {
    title: 'Orders', onSearch: () => log.push('search'), onMore: () => log.push('more'), onBack: () => log.push('back'),
    ask: h(mobile.AskButton, { onClick: () => log.push('ask') }),
  }));
  for (const name of ['Search', 'Ask AI', 'More actions', 'Back']) await click(view.container.querySelector(`[aria-label="${name}"]`));
  assert.deepEqual(log, ['search', 'ask', 'more', 'back']);
});

test('header: pages go through the app\'s link renderer with the props to spread', async () => {
  const seen = [];
  const view = await mount(h(mobile.MobileHeader, {
    title: 'Sales', switcher: pages,
    renderLink: (item, props) => { seen.push([item.id, props.href, props.className, props['aria-current']]); return h('a', { href: props.href, className: props.className, 'aria-current': props['aria-current'], onClick: props.onClick }, props.children); },
  }));
  await click(view.container.querySelector('button.curv-mobile-title-button'));
  assert.deepEqual(seen.slice(0, 2), [['orders', '/orders', 'curv-mobile-header-page', 'page'], ['quotes', '/quotes', 'curv-mobile-header-page', undefined]]);
});

// ── Ask ─────────────────────────────────────────────────────────────────────

test('ask button: a tap calls onClick, aria-expanded follows open, the orb follows busy and state, the ref reaches the button', async () => {
  let taps = 0;
  const ref = React.createRef();
  const view = await mount(h(mobile.AskButton, { ref, onClick: () => { taps += 1; } }));
  const button = view.container.querySelector('button');
  is(ref.current, button, 'forwardRef');
  await click(button);
  assert.equal(taps, 1);
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  await view.render(h(mobile.AskButton, { ref, onClick() {}, open: true, state: 'writing' }));
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  assert.equal(button.querySelector('.curv-orb').getAttribute('data-state'), 'writing');
  await view.render(h(mobile.AskButton, { ref, onClick() {}, busy: true }));
  assert.equal(button.querySelector('.curv-orb').getAttribute('data-state'), 'searching');
  await view.render(h(mobile.AskButton, { ref, onClick() {} }));
  assert.equal(button.querySelector('.curv-orb').getAttribute('data-state'), 'idle');
});

// ── Bar ─────────────────────────────────────────────────────────────────────

test('bar: the hamburger calls onMenu and the bar stays put on scroll unless asked to shrink', async () => {
  let opened = 0;
  const items = [{ id: 'home', label: 'Home', href: '/', icon: 'h', active: true }, { id: 'inbox', label: 'Inbox', href: '/inbox', icon: 'i', badge: 2 }];
  const view = await mount(h(mobile.MobileTabBar, { items, onMenu: () => { opened += 1; } }));
  await click(view.container.querySelector('[aria-label="Menu"]'));
  assert.equal(opened, 1);
  let scrollY = 0;
  const original = Object.getOwnPropertyDescriptor(window, 'scrollY');
  Object.defineProperty(window, 'scrollY', { configurable: true, get: () => scrollY });
  try {
    for (const y of [60, 140, 260]) { scrollY = y; await dispatch(window, new Event('scroll')); }
  } finally { if (original) Object.defineProperty(window, 'scrollY', original); else delete window.scrollY; }
  assert.equal(view.container.querySelector('[data-collapsed]'), null, 'all five slots stay');
  await view.render(h(mobile.MobileTabBar, { items, onMenu() {}, hidden: true }));
  assert.equal(view.container.querySelector('nav').hasAttribute('hidden'), true);
});

// ── Readout chart ───────────────────────────────────────────────────────────

const weeks = [10, 14, 9, 20, 17, 12].map((value, index) => ({ label: `W${index + 1}`, value, display: `$${value}k`, ...(index === 5 ? { partial: true } : {}) }));
/** happy-dom has no layout: give the plot a 300px-wide box, six bars of 50px. */
const plotOf = container => {
  const plot = container.querySelector('.curv-mobile-chart-plot');
  plot.getBoundingClientRect = () => ({ left: 0, top: 0, right: 300, bottom: 125, width: 300, height: 125, x: 0, y: 0 });
  return plot;
};
const barCentre = index => 50 * index + 25;
const readout = container => [container.querySelector('.curv-mobile-figure-value').textContent, container.querySelector('.curv-mobile-figure-label').textContent];
const pickedOf = container => [...container.querySelectorAll('.curv-mobile-chart-col')].map((col, index) => (col.hasAttribute('data-picked') ? index : -1)).filter(index => index >= 0);

test('readout chart: it rests on the current period, a finger sliding sideways reads the bar under it, and the pick stays when it lifts', async () => {
  const view = await mount(h(mobile.MobileChart, { points: weeks, readout: true, label: 'Revenue by week' }));
  const plot = plotOf(view.container);
  assert.deepEqual(readout(view.container), ['$12k', 'W6 so far']);
  await pointer(plot, 'pointerdown', { clientX: barCentre(1), clientY: 60 });
  assert.deepEqual(readout(view.container), ['$12k', 'W6 so far'], 'a finger that has not moved may be about to scroll: it picks nothing');
  await pointer(plot, 'pointermove', { clientX: barCentre(1) + 3, clientY: 61 });
  assert.deepEqual(readout(view.container), ['$12k', 'W6 so far'], 'a wobble inside the slop is not a drag');
  await pointer(plot, 'pointermove', { clientX: barCentre(2) + 5, clientY: 62 });
  assert.deepEqual(readout(view.container), ['$9k', 'W3']);
  await pointer(plot, 'pointermove', { clientX: barCentre(3) + 5, clientY: 62 });
  assert.deepEqual(readout(view.container), ['$20k', 'W4']);
  assert.deepEqual(pickedOf(view.container), [3]);
  assert.equal(view.container.querySelectorAll('.curv-mobile-chart-col[data-dim]').length, 5, 'the others step back');
  await pointer(plot, 'pointerup', { clientX: barCentre(3) + 5, clientY: 62 });
  assert.deepEqual(readout(view.container), ['$20k', 'W4'], 'lifting the finger leaves it picked');
  assert.equal(view.container.querySelector('.curv-mobile-chart-xaxis [data-picked]').textContent, 'W4');
});

test('readout chart: dragging clamps at both ends, and a mouse picks as it goes down', async () => {
  const view = await mount(h(mobile.MobileChart, { points: weeks, readout: true, label: 'Revenue by week' }));
  const plot = plotOf(view.container);
  await pointer(plot, 'pointerdown', { clientX: barCentre(0), clientY: 60, pointerType: 'mouse', button: 0 });
  assert.deepEqual(readout(view.container), ['$10k', 'W1']);
  await pointer(plot, 'pointermove', { clientX: 900, clientY: 60, pointerType: 'mouse' });
  assert.deepEqual(readout(view.container), ['$12k', 'W6 so far'], 'past the right edge is the last period, still said as in progress');
  await pointer(plot, 'pointermove', { clientX: -80, clientY: 60, pointerType: 'mouse' });
  assert.deepEqual(readout(view.container), ['$10k', 'W1']);
  await pointer(plot, 'pointerup', { clientX: -80, clientY: 60, pointerType: 'mouse' });
});

test('readout chart: a touch that moves up or down is the page scrolling and picks nothing; a tap picks, and a tap on the pick clears it', async () => {
  const view = await mount(h(mobile.MobileChart, { points: weeks, readout: true, label: 'Revenue by week' }));
  const plot = plotOf(view.container);
  await pointer(plot, 'pointerdown', { clientX: barCentre(1), clientY: 20 });
  await pointer(plot, 'pointermove', { clientX: barCentre(1) + 2, clientY: 90 });
  await pointer(plot, 'pointerup', { clientX: barCentre(1) + 2, clientY: 90 });
  assert.deepEqual(readout(view.container), ['$12k', 'W6 so far'], 'scrolled, not scrubbed');
  await pointer(plot, 'pointerdown', { clientX: barCentre(1), clientY: 60 });
  await pointer(plot, 'pointerup', { clientX: barCentre(1), clientY: 60 });
  assert.deepEqual(readout(view.container), ['$14k', 'W2'], 'a tap picks');
  await pointer(plot, 'pointerdown', { clientX: barCentre(1), clientY: 60 });
  await pointer(plot, 'pointerup', { clientX: barCentre(1), clientY: 60 });
  assert.deepEqual(readout(view.container), ['$12k', 'W6 so far'], 'a tap on the pick clears it');
  assert.deepEqual(pickedOf(view.container), []);
});

test('readout chart: the keyboard scrubs through the hidden range input, Escape clears, and the readout says the same', async () => {
  const view = await mount(h(mobile.MobileChart, { points: weeks, readout: true, label: 'Revenue by week' }));
  const input = view.container.querySelector('input[type="range"]');
  assert.equal(input.getAttribute('aria-valuetext'), 'W6 so far: $12k');
  assert.equal(input.value, '5');
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, '2');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  assert.deepEqual(readout(view.container), ['$9k', 'W3']);
  assert.equal(input.getAttribute('aria-valuetext'), 'W3: $9k');
  await key(input, 'Escape');
  assert.deepEqual(readout(view.container), ['$12k', 'W6 so far']);
});

test('readout chart: a shorter series after a longer one does not keep a stale pick', async () => {
  const view = await mount(h(mobile.MobileChart, { points: weeks, readout: true, label: 'Revenue by week' }));
  const plot = plotOf(view.container);
  await pointer(plot, 'pointerdown', { clientX: barCentre(4), clientY: 60, pointerType: 'mouse', button: 0 });
  await pointer(plot, 'pointerup', { clientX: barCentre(4), clientY: 60, pointerType: 'mouse' });
  assert.deepEqual(readout(view.container), ['$17k', 'W5']);
  await view.render(h(mobile.MobileChart, { points: weeks.slice(0, 3), readout: true, label: 'Revenue by week' }));
  assert.deepEqual(readout(view.container), ['$9k', 'W3'], 'it reads the shorter series, at rest');
});

test('readout chart: going from data to all-null and back keeps the hooks in order', async () => {
  const view = await mount(h(mobile.MobileChart, { points: weeks, readout: true, label: 'Revenue by week' }));
  await view.render(h(mobile.MobileChart, { points: weeks.map(point => ({ ...point, value: null })), readout: true, label: 'Revenue by week' }));
  assert.ok(view.container.querySelector('.curv-mobile-chart-empty'));
  await view.render(h(mobile.MobileChart, { points: weeks, readout: true, label: 'Revenue by week' }));
  assert.deepEqual(readout(view.container), ['$12k', 'W6 so far']);
  // And between the readout chart and the older chart on the same slot.
  await view.render(h(mobile.MobileChart, { points: weeks, label: 'Revenue by week' }));
  assert.ok(view.container.querySelector('svg'));
  await view.render(h(mobile.MobileChart, { points: weeks, readout: true, label: 'Revenue by week' }));
  assert.ok(view.container.querySelector('.curv-mobile-chart-plot'));
});

// ── Picture ─────────────────────────────────────────────────────────────────

const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const OTHER = `${PIXEL.slice(0, -4)}AAAA`;

test('picture: an image that fails to load becomes the neutral box and keeps its caption and its label', async () => {
  const view = await mount(h(mobile.MobilePicture, { src: PIXEL, alt: 'Render', label: 'Latest render', title: 'Canvas tote' }));
  const image = view.container.querySelector('img');
  assert.ok(image);
  await dispatch(image, new Event('error'));
  assert.equal(view.container.querySelector('img'), null);
  assert.ok(view.container.querySelector('.curv-mobile-picture-empty'));
  assert.equal(view.container.querySelector('.curv-mobile-picture-chip').textContent, 'Latest render');
  assert.equal(view.container.querySelector('.curv-mobile-picture-title').textContent, 'Canvas tote');
  await view.render(h(mobile.MobilePicture, { src: OTHER, alt: 'Render', title: 'Canvas tote' }));
  assert.ok(view.container.querySelector('img'), 'a picture given another address tries it');
});

// ── The review's fixes ──────────────────────────────────────────────────────

test('bar: when the active label would not fit beside 44px slots it falls back to equal icon-only slots, and comes back when there is room', async () => {
  const items = [
    { id: 'home', label: 'Transactions', href: '/', icon: 'h', active: true },
    { id: 'a', label: 'A', href: '/a', icon: 'a' }, { id: 'b', label: 'B', href: '/b', icon: 'b' }, { id: 'c', label: 'C', href: '/c', icon: 'c' },
  ];
  // happy-dom has no layout: the label is 200px wide, and the pill is as wide as the test says.
  let pillWidth = 300;
  const proto = window.HTMLElement.prototype;
  const originals = { scrollWidth: Object.getOwnPropertyDescriptor(proto, 'scrollWidth'), clientWidth: Object.getOwnPropertyDescriptor(proto, 'clientWidth') };
  Object.defineProperty(proto, 'scrollWidth', { configurable: true, get() { return this.classList?.contains('curv-mobile-tabbar-label') ? 200 : 0; } });
  Object.defineProperty(proto, 'clientWidth', { configurable: true, get() { return this.classList?.contains('curv-mobile-tabbar-pill') ? pillWidth : 0; } });
  try {
    const view = await mount(h(mobile.MobileTabBar, { items, onMenu() {} }));
    const bar = () => view.container.querySelector('nav');
    // 24 + 8 + 200 + 24 + 4 x 44 = 432 needed, 288 there.
    assert.equal(bar().getAttribute('data-tight'), 'true');
    pillWidth = 500;
    await view.render(h(mobile.MobileTabBar, { items: [{ ...items[0], label: 'Transactions.' }, ...items.slice(1)], onMenu() {} }));
    assert.equal(bar().getAttribute('data-tight'), null, '432 fits in 488: the label is back');
  } finally {
    for (const name of Object.keys(originals)) Reflect.deleteProperty(proto, name);
    for (const [name, original] of Object.entries(originals)) if (original) Object.defineProperty(proto, name, original);
  }
});

test('readout chart: scrubbing to a bar with a plan reads its plan, and a bar without one reads only its period', async () => {
  const planned = [{ label: 'Jan', value: 100, plan: 150 }, { label: 'Feb', value: 120, plan: 80 }, { label: 'Mar', value: 90 }].map(point => ({ ...point, display: `$${point.value}` }));
  const view = await mount(h(mobile.MobileChart, { points: planned, readout: true, label: 'Revenue vs plan', format: value => `$${value}` }));
  const plot = view.container.querySelector('.curv-mobile-chart-plot');
  plot.getBoundingClientRect = () => ({ left: 0, top: 0, right: 300, bottom: 125, width: 300, height: 125, x: 0, y: 0 });
  const text = () => [view.container.querySelector('.curv-mobile-figure-value').textContent, view.container.querySelector('.curv-mobile-figure-label').textContent];
  assert.deepEqual(text(), ['$90', 'Mar']);
  await pointer(plot, 'pointerdown', { clientX: 50, clientY: 60, pointerType: 'mouse', button: 0 });
  assert.deepEqual(text(), ['$100', 'Jan · plan $150']);
  assert.equal(view.container.querySelector('input[type="range"]').getAttribute('aria-valuetext'), 'Jan · plan $150: $100');
  await pointer(plot, 'pointermove', { clientX: 150, clientY: 60, pointerType: 'mouse' });
  assert.deepEqual(text(), ['$120', 'Feb · plan $80']);
  await pointer(plot, 'pointerup', { clientX: 150, clientY: 60, pointerType: 'mouse' });
  assert.equal(view.container.querySelector('.curv-mobile-figure').getAttribute('aria-live'), null, 'the range input announces; the readout does not');
});
