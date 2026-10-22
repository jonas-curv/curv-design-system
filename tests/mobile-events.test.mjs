// Event-level tests: the mobile components run in a real (happy-dom) DOM, driven with real pointer, key and click events.
// Everything else in tests/ renders static markup; the bugs fixed here only exist once something happens.
import './dom-setup.mjs';
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { createRoot } from 'react-dom/client';
import * as mobile from '../dist/mobile.js';

const h = React.createElement;
const { act } = React;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// ── Harness ─────────────────────────────────────────────────────────────────

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
const settle = ms => act(async () => { await sleep(ms); });
async function waitFor(check, timeout = 3000) {
  const end = Date.now() + timeout;
  for (;;) {
    const value = check();
    if (value) return value;
    assert.ok(Date.now() < end, 'timed out waiting for the condition');
    await settle(25);
  }
}
/** Would the browser scroll on a touch right now? A lifted card cancels touchmove on the document; nothing else does. */
const touchScrollBlocked = () => {
  const event = new Event('touchmove', { bubbles: true, cancelable: true });
  document.dispatchEvent(event);
  return event.defaultPrevented;
};
/** Identity check. `assert.equal` on two elements would inspect the whole happy-dom tree when it fails. */
const is = (actual, expected, message) => assert.ok(actual === expected, message);
const icon = name => h('svg', { 'data-icon': name });
const spyOnConsole = method => {
  const original = console[method];
  const calls = [];
  console[method] = (...args) => { calls.push(args.join(' ')); };
  return { calls, restore: () => { console[method] = original; } };
};

// ── Chart ───────────────────────────────────────────────────────────────────

test('chart: a hero KPI can switch from a series with data to an all-null one and back without a hook error', async () => {
  const data = [{ label: 'Oct 1', value: 12 }, { label: 'Oct 2', value: 18 }, { label: 'Oct 3', value: 15 }];
  const empty = data.map(point => ({ ...point, value: null }));
  const chart = points => h(mobile.MobileChart, { points, variant: 'line', label: 'Revenue', emptyMessage: 'No data for Oct 1 to 3' });
  const errors = spyOnConsole('error');
  try {
    const view = await mount(chart(data));
    assert.ok(view.container.querySelector('svg[role="img"]'));
    await view.render(chart(empty));
    assert.match(view.container.textContent, /No data for Oct 1 to 3/);
    assert.ok(view.container.querySelector('svg') === null);
    await view.render(chart(data));
    assert.ok(view.container.querySelector('svg[role="img"]'));
    await view.render(chart(empty));
    assert.match(view.container.textContent, /No data for Oct 1 to 3/);
  } finally { errors.restore(); }
  assert.deepEqual(errors.calls, []);
});

test('chart: scrubbing a long series and then showing a shorter one reads the shorter series', async () => {
  const long = Array.from({ length: 6 }, (_, i) => ({ label: `D${i}`, value: i + 1 }));
  const short = long.slice(0, 2);
  const chart = points => h(mobile.MobileChart, { points, variant: 'line', label: 'Orders' });
  const view = await mount(chart(long));
  const input = view.container.querySelector('input[type="range"]');
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  await act(async () => { setValue.call(input, '4'); input.dispatchEvent(new Event('input', { bubbles: true })); });
  assert.match(view.container.querySelector('.curv-mobile-chart-readout').textContent, /D4/);
  await view.render(chart(short));
  assert.match(view.container.querySelector('.curv-mobile-chart-readout').textContent, /D1/);
});

// ── Stage board ─────────────────────────────────────────────────────────────

const card = (id, title) => ({ id, title, href: `/projects/${id}` });
const boardColumns = (placement) => [
  { id: 'todo', label: 'To do', count: placement.todo.length, cards: placement.todo.map(id => card(id, `Project ${id}`)) },
  { id: 'doing', label: 'In production', shortLabel: 'Making', count: placement.doing.length, cards: placement.doing.map(id => card(id, `Project ${id}`)) },
  { id: 'done', label: 'Done', count: placement.done.length, cards: placement.done.map(id => card(id, `Project ${id}`)) },
];
const before = { todo: ['c1', 'c2'], doing: ['c3'], done: [] };
const afterRefresh = { todo: ['c2'], doing: ['c1', 'c3'], done: [] };
const cardEl = (container, id) => container.querySelector(`a[href="/projects/${id}"]`).closest('.curv-mobile-board-card');

test('board: releasing after the lifted card was re-parented unblocks scrolling, moves nothing and allows a second long-press', async () => {
  const moves = [];
  const board = placement => h(mobile.MobileStageBoard, { label: 'Board', columns: boardColumns(placement), activeColumnId: 'todo', onMove: (...args) => moves.push(args) });
  const view = await mount(board(before));

  const lifted = cardEl(view.container, 'c1');
  await pointer(lifted, 'pointerdown', { clientX: 40, clientY: 40 });
  await settle(520);
  assert.equal(lifted.dataset.lifted, 'true');
  assert.equal(touchScrollBlocked(), true, 'a lifted card owns the touch');

  // A data refresh moves the project to another column: React unmounts this element and mounts a new one elsewhere.
  await view.render(board(afterRefresh));
  assert.ok(!lifted.isConnected, 'the old element left the document');

  // The finger lifts over the page. Nothing the card owns hears it, the window does.
  await pointer(document.body, 'pointerup', { clientX: 200, clientY: 300 });
  assert.equal(touchScrollBlocked(), false, 'page scrolling is back');
  assert.deepEqual(moves, [], 'a card that left the document is not moved');

  const again = cardEl(view.container, 'c1');
  assert.ok(again !== lifted, 'a new element');
  assert.equal(again.dataset.lifted, undefined);
  await pointer(again, 'pointerdown', { clientX: 40, clientY: 40 });
  await settle(520);
  assert.equal(again.dataset.lifted, 'true', 'the press that was left behind does not block the next one');
  await pointer(again, 'pointercancel');
  assert.equal(again.dataset.lifted, undefined);
  assert.equal(touchScrollBlocked(), false);
});

test('board: a card that leaves the document before the long-press delay is never lifted, whether or not the finger has lifted', async () => {
  const moves = [];
  const board = placement => h(mobile.MobileStageBoard, { label: 'Board', columns: boardColumns(placement), activeColumnId: 'todo', onMove: (...args) => moves.push(args) });
  const view = await mount(board(before));

  // The finger lifts over the page while the card is gone, before the delay.
  const first = cardEl(view.container, 'c1');
  await pointer(first, 'pointerdown', { clientX: 40, clientY: 40 });
  await view.render(board(afterRefresh));
  assert.ok(!first.isConnected);
  await pointer(document.body, 'pointerup', { clientX: 200, clientY: 300 });
  await settle(520);
  assert.equal(touchScrollBlocked(), false, 'the timer did not lift the card that was gone');

  // The finger is still down when the delay ends.
  const second = cardEl(view.container, 'c1');
  await pointer(second, 'pointerdown', { clientX: 40, clientY: 40 });
  await view.render(board(before));
  assert.ok(!second.isConnected);
  await settle(520);
  assert.equal(touchScrollBlocked(), false, 'a detached card is not lifted when the timer fires');
  await pointer(document.body, 'pointerup', { clientX: 200, clientY: 300 });

  // Nothing was left behind: the next long-press works, and nothing was moved.
  const third = cardEl(view.container, 'c1');
  await pointer(third, 'pointerdown', { clientX: 40, clientY: 40 });
  await settle(520);
  assert.equal(third.dataset.lifted, 'true');
  await pointer(third, 'pointercancel');
  assert.equal(touchScrollBlocked(), false);
  assert.deepEqual(moves, []);
});

test('board: a release on the card itself still ends the press once, and a short press never lifts', async () => {
  const board = h(mobile.MobileStageBoard, { label: 'Board', columns: boardColumns(before), activeColumnId: 'todo', onMove() {} });
  const view = await mount(board);
  const el = cardEl(view.container, 'c1');
  await pointer(el, 'pointerdown', { clientX: 40, clientY: 40 });
  await settle(520);
  assert.equal(el.dataset.lifted, 'true');
  await pointer(el, 'pointerup');
  assert.equal(el.dataset.lifted, undefined);
  assert.equal(touchScrollBlocked(), false);
  // Released before the long-press delay: no lift, and the stray timer does not lift later.
  await pointer(el, 'pointerdown', { clientX: 40, clientY: 40 });
  await pointer(el, 'pointerup');
  await settle(520);
  assert.equal(el.dataset.lifted, undefined);
});

// `refresh` is only a prop to change: it re-renders the harness, and with it builds a new `columns` array.
function MoveHarness({ onActiveColumnChange }) {
  const [placement, setPlacement] = React.useState(before);
  const onMove = (cardId, to) => setPlacement(current => {
    const next = Object.fromEntries(Object.entries(current).map(([column, ids]) => [column, ids.filter(id => id !== cardId)]));
    next[to] = [...next[to], cardId];
    return next;
  });
  return h(mobile.MobileStageBoard, { label: 'Board', columns: boardColumns(placement), activeColumnId: 'todo', onMove, onActiveColumnChange });
}

test('board: after a move made in the sheet, focus lands on the moved card\'s Move button in its new column', async () => {
  const view = await mount(h(MoveHarness));
  const opener = view.container.querySelector('button[data-card-id="c1"]');
  opener.focus();
  await click(opener);
  const option = await waitFor(() => [...document.querySelectorAll('.curv-mobile-board-move-option')].find(button => /Move to In production/.test(button.textContent)));
  await click(option);
  assert.ok(!opener.isConnected, 'the card moved, so its old button is gone');
  const landed = await waitFor(() => document.activeElement?.dataset?.cardId === 'c1' && document.activeElement);
  assert.equal(landed.closest('.curv-mobile-board-column').querySelector('.curv-mobile-board-column-head span').textContent, 'In production');
  assert.ok(landed.isConnected);
});

test('board: once focus has landed on the moved card, a later refresh does not pull it back', async () => {
  const view = await mount(h(MoveHarness, { refresh: 0 }));
  const opener = view.container.querySelector('button[data-card-id="c1"]');
  opener.focus();
  await click(opener);
  await click(await waitFor(() => [...document.querySelectorAll('.curv-mobile-board-move-option')].find(button => /Move to In production/.test(button.textContent))));
  const landed = await waitFor(() => document.activeElement?.dataset?.cardId === 'c1' && document.activeElement);

  // The person goes elsewhere (here: nowhere, focus on the page). The retry chain is long over by the time data refreshes.
  landed.blur();
  assert.ok(document.activeElement === document.body);
  await settle(2000);
  await view.render(h(MoveHarness, { refresh: 1 }));
  await settle(300);
  assert.ok(document.activeElement === document.body, 'a refresh within the window does not steal focus');
});

test('board: chips follow a tap or a swipe even when the app does not feed the column back', async () => {
  const view = await mount(h(mobile.MobileStageBoard, { label: 'Board', columns: boardColumns(before), activeColumnId: 'todo' }));
  const pressed = () => [...view.container.querySelectorAll('.curv-mobile-board-chip[aria-pressed="true"]')].map(chip => chip.textContent);
  assert.deepEqual(pressed(), ['To do2']);
  await click(view.container.querySelector('.curv-mobile-board-chip[aria-label^="In production"]'));
  assert.deepEqual(pressed(), ['Making1']);
  assert.equal(view.container.querySelector('.curv-mobile-board-column[data-active="true"] h3 span').textContent, 'In production');
  await click(view.container.querySelector('.curv-mobile-board-chip'));
  assert.deepEqual(pressed(), ['To do2']);
});

test('board: the app hears about the column a swipe settles on, not the ones it passes, and a new activeColumnId moves the chips', async () => {
  const heard = [];
  const props = { label: 'Board', columns: boardColumns(before), onActiveColumnChange: id => heard.push(id) };
  const view = await mount(h(mobile.MobileStageBoard, { ...props, activeColumnId: 'todo' }));
  const scroller = view.container.querySelector('.curv-mobile-board-columns');
  // There is no layout here, so give the columns the offsets a 300px-wide board would have.
  view.container.querySelectorAll('.curv-mobile-board-column').forEach((column, index) => Object.defineProperty(column, 'offsetLeft', { configurable: true, get: () => index * 300 }));
  const swipeTo = async left => { scroller.scrollLeft = left; await dispatch(scroller, new Event('scroll')); };
  await swipeTo(300);
  await settle(40);
  await swipeTo(600);       // a fast swipe: it passed 'doing' on the way to 'done'
  await settle(300);
  assert.deepEqual(heard, ['done']);
  assert.equal(view.container.querySelector('.curv-mobile-board-chip[aria-pressed="true"]').textContent, 'Done0');
  await view.render(h(mobile.MobileStageBoard, { ...props, activeColumnId: 'doing' }));
  assert.equal(view.container.querySelector('.curv-mobile-board-chip[aria-pressed="true"]').textContent, 'Making1');
});

// ── Tab bar ─────────────────────────────────────────────────────────────────

const tabs = Array.from({ length: 4 }, (_, id) => ({ id: `tab-${id}`, label: `Page ${id}`, href: `/${id}`, icon: icon(id), active: id === 0 }));

function SearchHarness({ initial = 'tabs' }) {
  const [mode, setMode] = React.useState(initial);
  const [value, setValue] = React.useState('');
  return h(mobile.MobileTabBar, {
    items: tabs, mode, onSearch: () => setMode('search'), onMenu() {},
    search: { value, onChange: setValue, label: 'Search Product OS', onClose: () => setMode('tabs') },
  });
}
const searchCircle = container => container.querySelector('.curv-mobile-tabbar-circle[aria-label="Search"]');

test('tab bar: closing search with Escape puts focus on the search circle, not on the page', async () => {
  const view = await mount(h(SearchHarness));
  await click(searchCircle(view.container));
  const field = view.container.querySelector('input[type="search"]');
  is(document.activeElement, field, 'opening search focuses the field');
  await key(field, 'Escape');
  assert.ok(view.container.querySelector('input[type="search"]') === null);
  is(document.activeElement, searchCircle(view.container), 'focus is on the search circle');
});

test('tab bar: closing search with the close circle puts focus on the search circle', async () => {
  const view = await mount(h(SearchHarness));
  await click(searchCircle(view.container));
  await click(view.container.querySelector('.curv-mobile-tabbar-circle[aria-label="Close search"]'));
  is(document.activeElement, searchCircle(view.container), 'focus is on the search circle');
});

test('tab bar: closing search leaves focus alone when it is already somewhere on purpose', async () => {
  const elsewhere = document.createElement('button');
  document.body.append(elsewhere);
  const view = await mount(h(SearchHarness, { initial: 'search' }));
  elsewhere.focus();
  await click(view.container.querySelector('.curv-mobile-tabbar-circle[aria-label="Close search"]'));
  is(document.activeElement, elsewhere, 'focus stays where it was');
});

test('tab bar: items beyond the cap are named in a development warning and not in production', async () => {
  const many = Array.from({ length: 8 }, (_, id) => ({ id: `t${id}`, label: `Page ${id}`, href: `/${id}`, icon: icon(id) }));
  const warnings = spyOnConsole('warn');
  const mode = process.env.NODE_ENV;
  try {
    const view = await mount(h(mobile.MobileTabBar, { items: many, onMenu() {} }));
    assert.equal(warnings.calls.length, 1);
    assert.match(warnings.calls[0], /Dropped: "Page 4", "Page 5", "Page 6", "Page 7"/);
    await view.render(h(mobile.MobileTabBar, { items: many, onMenu() {}, className: 'again' }));
    assert.equal(warnings.calls.length, 1, 'the same dropped items warn once, not on every render');
    process.env.NODE_ENV = 'production';
    await mount(h(mobile.MobileTabBar, { items: many.slice().reverse(), onMenu() {} }));
    assert.equal(warnings.calls.length, 1, 'silent in production');
  } finally { warnings.restore(); process.env.NODE_ENV = mode; if (mode === undefined) delete process.env.NODE_ENV; }
});

// ── Top bar ─────────────────────────────────────────────────────────────────

const pages = [{ id: 'home', label: 'Home', href: '/development', active: true }, { id: 'board', label: 'Board', href: '/development/board' }];

test('top bar: the page switcher closes on Escape (focus back on the title) and on a tap outside, not on a tap inside', async () => {
  const view = await mount(h(mobile.MobileTopBar, { title: 'Development', switcher: pages }));
  const trigger = view.container.querySelector('.curv-mobile-topbar-switch');
  const list = view.container.querySelector('.curv-mobile-topbar-pages');
  const isOpen = () => trigger.getAttribute('aria-expanded') === 'true' && !list.hidden;

  assert.equal(isOpen(), false);
  await click(trigger);
  assert.equal(isOpen(), true);

  await key(document.body, 'Escape');
  assert.equal(isOpen(), false);
  is(document.activeElement, trigger, 'focus is back on the title');

  await click(trigger);
  assert.equal(isOpen(), true);
  await pointer(list.querySelector('a'), 'pointerdown');
  assert.equal(isOpen(), true, 'a tap inside the list keeps it open');
  await pointer(document.body, 'pointerdown');
  assert.equal(isOpen(), false, 'a tap outside closes it');

  await click(trigger);
  await click(trigger);
  assert.equal(isOpen(), false, 'the title toggles it');
});

// ── Swipe row ───────────────────────────────────────────────────────────────

test('swipe row: the click that ends a swipe does not follow the link, the next tap closes the row, the one after follows it', async () => {
  const followed = [];
  const row = h(mobile.MobileSwipeRow, { actionsLabel: 'Row actions', actions: [{ id: 'reply', label: 'Reply', tone: 'primary', onAction() {} }, { id: 'done', label: 'Done', tone: 'positive', onAction() {} }] },
    h('a', { href: '#record', onClick: event => { event.preventDefault(); followed.push('record'); } }, 'Project update'));
  const view = await mount(row);
  const link = view.container.querySelector('a');
  const surface = view.container.querySelector('.curv-mobile-swipe-surface');
  const swipe = view.container.querySelector('.curv-mobile-swipe');

  await pointer(link, 'pointerdown', { clientX: 300, clientY: 20 });
  await pointer(link, 'pointermove', { clientX: 270, clientY: 21 });      // past the slop, clearly horizontal: it is a swipe
  await pointer(link, 'pointermove', { clientX: 180, clientY: 22 });
  await pointer(link, 'pointerup', { clientX: 180, clientY: 22 });
  assert.equal(swipe.dataset.open, 'true');

  const afterSwipe = await click(link, { detail: 1 });
  assert.deepEqual(followed, [], 'the release of a swipe is not a tap on the record');
  assert.equal(afterSwipe.defaultPrevented, true);
  assert.equal(swipe.dataset.open, 'true');

  await click(link, { detail: 1 });
  assert.deepEqual(followed, [], 'a tap on an open row closes it instead of opening the record');
  assert.equal(swipe.dataset.open, 'false');

  await click(link, { detail: 1 });
  assert.deepEqual(followed, ['record']);
  assert.ok(surface);
});

test('swipe row: a vertical gesture is a scroll, not a swipe, and its click goes through', async () => {
  const followed = [];
  const view = await mount(h(mobile.MobileSwipeRow, { actionsLabel: 'Row actions', actions: [{ id: 'done', label: 'Done', tone: 'positive', onAction() {} }] },
    h('a', { href: '#record', onClick: event => { event.preventDefault(); followed.push('record'); } }, 'Project update')));
  const link = view.container.querySelector('a');
  await pointer(link, 'pointerdown', { clientX: 300, clientY: 20 });
  await pointer(link, 'pointermove', { clientX: 296, clientY: 80 });
  await pointer(link, 'pointerup', { clientX: 296, clientY: 80 });
  await click(link, { detail: 1 });
  assert.deepEqual(followed, ['record']);
  assert.equal(view.container.querySelector('.curv-mobile-swipe').dataset.open, 'false');
});
