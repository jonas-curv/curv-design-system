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
  assert.match(view.container.querySelector('input[type="range"]').getAttribute('aria-valuetext'), /D4/);
  await view.render(chart(short));
  assert.match(view.container.querySelector('input[type="range"]').getAttribute('aria-valuetext'), /D1/);
  assert.equal(view.container.querySelector('.curv-mobile-chart-period'), null, 'the period that was being read is gone with its series');
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

// ── Images that degrade ─────────────────────────────────────────────────────

// A real, loadable image. happy-dom does not fetch file URLs, so a plain path stays "complete with no pixels": exactly
// what a browser reports for a photo that failed before React hydrated, which the last tests below rely on.
const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const BROKEN = '/photos/blocked.jpg';

test('list row: a thumbnail that fails to load becomes the neutral box, the row stays one link, and the photo sends no referrer', async () => {
  const view = await mount(h(mobile.MobileListRow, { title: 'Ocean Mist throw', thumbnail: PIXEL, thumbnailAlt: 'Ocean Mist throw', href: '/p/1', status: { label: 'Healthy', tone: 'positive' } }));
  const image = view.container.querySelector('.curv-mobile-flat-thumb img');
  assert.ok(image, 'the photo is drawn while it has not failed');
  assert.equal(image.getAttribute('referrerpolicy'), 'no-referrer');
  assert.equal(view.container.querySelector('.curv-mobile-flat-thumb').dataset.empty, undefined);

  await dispatch(image, new Event('error'));
  const thumb = view.container.querySelector('.curv-mobile-flat-thumb');
  assert.ok(view.container.querySelector('img') === null, 'the broken image is gone');
  assert.equal(thumb.dataset.empty, 'true');
  assert.ok(thumb.querySelector('svg'), 'the same box a null thumbnail draws');
  assert.equal(view.container.querySelectorAll('a').length, 1);
  assert.equal(view.container.querySelector('.curv-mobile-flat-pill').textContent, 'Healthy');
});

test('list row: a failed photo is not retried on every render, but a row given another photo tries it', async () => {
  const row = thumbnail => h(mobile.MobileListRow, { title: 'Row', thumbnail });
  const view = await mount(row(PIXEL));
  await dispatch(view.container.querySelector('img'), new Event('error'));
  assert.ok(view.container.querySelector('img') === null);
  await view.render(row(PIXEL));
  assert.ok(view.container.querySelector('img') === null, 'still the placeholder after a re-render');
  await view.render(row(`${PIXEL}#second`));
  assert.ok(view.container.querySelector('img'), 'a different address is tried');
});

test('list row: a photo that had already failed before the row hydrated shows the placeholder, and a loaded one does not', async () => {
  const broken = await mount(h(mobile.MobileListRow, { title: 'Blocked', thumbnail: BROKEN }));
  assert.ok(broken.container.querySelector('img') === null, 'complete with no pixels is a failed load');
  assert.equal(broken.container.querySelector('.curv-mobile-flat-thumb').dataset.empty, 'true');
  const fine = await mount(h(mobile.MobileListRow, { title: 'Fine', thumbnail: PIXEL }));
  assert.ok(fine.container.querySelector('img'), 'a loaded photo stays');
});

test('gallery: a photo that fails keeps its slide as a neutral placeholder, and the rest still swipe', async () => {
  const images = [{ src: PIXEL, alt: 'Front' }, { src: `${PIXEL}#side`, alt: 'Side' }, { src: `${PIXEL}#detail`, alt: 'Detail' }];
  const view = await mount(h(mobile.MobileGallery, { images, label: 'Product photos' }));
  const slides = () => [...view.container.querySelectorAll('.curv-mobile-gallery-slide')];
  assert.equal(slides().length, 3);
  assert.equal(view.container.querySelectorAll('.curv-mobile-gallery-slide img').length, 3);
  assert.equal(view.container.querySelector('.curv-mobile-gallery-slide img').getAttribute('referrerpolicy'), 'no-referrer');
  assert.equal(view.container.querySelector('.curv-mobile-gallery-thumb img').getAttribute('referrerpolicy'), 'no-referrer');

  await dispatch(slides()[1].querySelector('img'), new Event('error'));
  assert.equal(slides().length, 3, 'the slide is still there');
  const placeholder = slides()[1].querySelector('.curv-mobile-gallery-placeholder');
  assert.ok(placeholder && placeholder.querySelector('svg'));
  assert.equal(placeholder.getAttribute('role'), 'img');
  assert.equal(placeholder.getAttribute('aria-label'), 'Side');
  assert.ok(slides()[0].querySelector('img') && slides()[2].querySelector('img'), 'the others are untouched');
  const thumbs = [...view.container.querySelectorAll('.curv-mobile-gallery-thumb')];
  assert.equal(thumbs.length, 3, 'the thumbnail button stays, so every photo can still be jumped to');
  assert.ok(thumbs[1].querySelector('.curv-mobile-gallery-placeholder') && thumbs[1].querySelector('img') === null);
  assert.equal(thumbs[1].getAttribute('aria-label'), 'Photo 2: Side');
  assert.ok(thumbs[0].querySelector('img'));
});

test('gallery: a thumbnail that fails marks its photo as failed everywhere, and a photo that failed before hydration is found on mount', async () => {
  const images = [{ src: PIXEL, alt: 'Front' }, { src: `${PIXEL}#side`, alt: 'Side' }];
  const view = await mount(h(mobile.MobileGallery, { images, label: 'Photos' }));
  await dispatch(view.container.querySelectorAll('.curv-mobile-gallery-thumb img')[0], new Event('error'));
  assert.ok(view.container.querySelector('.curv-mobile-gallery-slide .curv-mobile-gallery-placeholder'), 'the big slide follows its thumbnail');
  const blocked = await mount(h(mobile.MobileGallery, { images: [{ src: BROKEN, alt: 'Blocked' }, images[0]], label: 'Photos' }));
  assert.equal(blocked.container.querySelectorAll('.curv-mobile-gallery-slide').length, 2);
  assert.ok(blocked.container.querySelectorAll('.curv-mobile-gallery-slide')[0].querySelector('.curv-mobile-gallery-placeholder'));
  assert.ok(blocked.container.querySelectorAll('.curv-mobile-gallery-slide')[1].querySelector('img'));
});

// ── Move sheet ──────────────────────────────────────────────────────────────

const moveOptions = [
  { id: 'todo', label: 'Move to To do', count: 2, current: true },
  { id: 'doing', label: 'Move to In production', count: 1284 },
  { id: 'review', label: 'Move to Review', count: 3, disabled: true },
  { id: 'done', label: 'Move to Done' },
];
function SheetHarness({ log, cancelLabel }) {
  const [open, setOpen] = React.useState(true);
  return h(React.Fragment, null,
    h('button', { type: 'button', id: 'opener', onClick: () => setOpen(true) }, 'Open'),
    h(mobile.MobileMoveSheet, {
      open, title: 'Move to…', options: moveOptions, cancelLabel,
      onOpenChange: next => { log.push(['open', next]); setOpen(next); },
      onChoose: id => log.push(['choose', id]),
    }));
}
const sheetRows = () => [...document.querySelectorAll('.curv-mobile-board-move-option')];
const sheetRow = text => sheetRows().find(row => row.textContent.includes(text));

test('move sheet: tapping a row chooses it once and closes the sheet', async () => {
  const log = [];
  await mount(h(SheetHarness, { log }));
  await waitFor(() => sheetRows().length);
  assert.equal(document.querySelector('[role="dialog"]').textContent.includes('Move to…'), true);
  assert.match(sheetRow('In production').textContent, /1,284/, 'the count is formatted');
  assert.ok(sheetRow('Move to Done').querySelector('.curv-mobile-board-chip-count') === null, 'no count, none drawn');
  await click(sheetRow('In production'));
  assert.deepEqual(log, [['choose', 'doing'], ['open', false]]);
  await waitFor(() => sheetRows().length === 0);
});

test('move sheet: the current row and a disabled row are shown but cannot be chosen', async () => {
  const log = [];
  await mount(h(SheetHarness, { log }));
  await waitFor(() => sheetRows().length);
  const current = sheetRow('To do');
  assert.equal(current.disabled, true);
  assert.equal(current.getAttribute('aria-current'), 'true');
  assert.ok(current.querySelector('.curv-mobile-board-move-check svg'), 'a check instead of a count');
  assert.equal(sheetRow('Review').disabled, true);
  assert.equal(sheetRow('Review').getAttribute('aria-current'), null);
  await click(current);
  await click(sheetRow('Review'));
  assert.deepEqual(log, [], 'nothing was chosen and the sheet stayed open');
  assert.equal(sheetRows().length, 4);
});

test('move sheet: Escape and the close control dismiss without choosing, and the close control takes its name from cancelLabel', async () => {
  const log = [];
  await mount(h(SheetHarness, { log, cancelLabel: 'Avbryt' }));
  await waitFor(() => sheetRows().length);
  assert.ok(document.querySelector('[role="dialog"] button[aria-label="Avbryt"]'));
  assert.ok(document.querySelector('[role="dialog"] button[aria-label="Close"]') === null);
  await key(document.activeElement && document.activeElement !== document.body ? document.activeElement : document.querySelector('[role="dialog"]'), 'Escape');
  await waitFor(() => sheetRows().length === 0);
  assert.deepEqual(log, [['open', false]]);

  log.length = 0;
  await click(document.querySelector('#opener'));
  await waitFor(() => sheetRows().length);
  await click(document.querySelector('[role="dialog"] button[aria-label="Avbryt"]'));
  await waitFor(() => sheetRows().length === 0);
  assert.deepEqual(log, [['open', false]], 'closed without a choice');

  const plain = [];
  await mount(h(SheetHarness, { log: plain }));
  await waitFor(() => document.querySelector('[role="dialog"] button[aria-label="Close"]'));
});

// ── Refinement round 1 (0.3.2) ──────────────────────────────────────────────

test('hero: onKpiChange only fires for selectable chips; informational ones are text, not focusable and never boxed', async () => {
  const picked = [];
  const kpis = [
    { id: 'orders', label: 'Orders', value: '24' },
    { id: 'revenue', label: 'Revenue', value: '$48K' },
    { id: 'perday', label: 'Per day', value: '$1,606', selectable: false },
    { id: 'pace', label: 'On pace for', value: '$50K', selectable: false },
  ];
  const panel = active => h(mobile.MobileHeroPanel, { kpis, activeKpiId: active, onKpiChange: id => picked.push(id), chart: null });
  const view = await mount(panel('orders'));
  const chips = [...view.container.querySelectorAll('.curv-mobile-hero-kpi')];
  assert.equal(chips.length, 4);
  assert.deepEqual(chips.map(chip => chip.tagName), ['BUTTON', 'BUTTON', 'DIV', 'DIV']);
  assert.deepEqual(chips.map(chip => chip.getAttribute('tabindex')), [null, null, null, null], 'nothing sets a tab stop on the text chips');
  assert.equal(view.container.querySelectorAll('button.curv-mobile-hero-kpi').length, 2, 'only the two selectable chips can take focus');
  await click(chips[2]);
  await click(chips[3]);
  assert.deepEqual(picked, [], 'tapping an informational chip selects nothing');
  await click(chips[1]);
  assert.deepEqual(picked, ['revenue']);
  await view.render(panel('revenue'));
  assert.equal(view.container.querySelector('.curv-mobile-hero-kpi[aria-pressed="true"]').textContent, 'Revenue$48K');
  await view.render(panel('perday'));
  assert.equal(view.container.querySelectorAll('[aria-pressed="true"], [data-active="true"]').length, 0, 'an informational chip is never the boxed one');
});

test('button: a pending MobileButton is busy, keeps its label, ignores taps and does not submit its form, but stays focusable', async () => {
  const log = [];
  const ref = React.createRef();
  const form = pending => h('form', { onSubmit: event => { event.preventDefault(); log.push('submit'); } },
    h(mobile.MobileButton, { ref, type: 'submit', pending, onClick: () => log.push('click'), 'data-test': 'go' }, 'Submit request'));
  const view = await mount(form(false));
  const button = view.container.querySelector('button');
  assert.ok(ref.current === button, 'the ref reaches the button');
  assert.equal(button.getAttribute('type'), 'submit');
  assert.equal(button.getAttribute('data-test'), 'go', 'button props are forwarded');
  await click(button);
  assert.deepEqual(log, ['click', 'submit']);
  log.length = 0;
  const status = view.container.querySelector('[role="status"]');
  assert.equal(status.textContent, '', 'the live region is there from the start, empty');
  await view.render(form(true));
  assert.equal(status.textContent, 'Working…', 'pending is announced');
  assert.equal(button.getAttribute('aria-busy'), 'true');
  assert.equal(button.disabled, false, 'a disabled button would drop the person\'s focus');
  assert.equal(button.textContent, 'Submit request', 'the label is still there, so the width does not change');
  const tap = await click(button);
  assert.deepEqual(log, [], 'neither the app\'s handler nor the form hear a second tap');
  assert.equal(tap.defaultPrevented, true);
  await view.render(form(false));
  assert.equal(status.textContent, '');
  assert.equal(button.hasAttribute('aria-busy'), false);
  await click(button);
  assert.deepEqual(log, ['click', 'submit']);
});

test('button: a disabled MobileButton does nothing when tapped', async () => {
  const log = [];
  const view = await mount(h(mobile.MobileButton, { disabled: true, onClick: () => log.push('click') }, 'Show 0'));
  await click(view.container.querySelector('button'));
  assert.deepEqual(log, []);
});

function FilterHarness({ log }) {
  const [brand, setBrand] = React.useState('nordic');
  const [status, setStatus] = React.useState(['risk']);
  const toggle = id => setStatus(current => { const next = current.includes(id) ? current.filter(item => item !== id) : [...current, id]; log.push(['status', next.join(',')]); return next; });
  return h(React.Fragment, null,
    h(mobile.MobileOptionList, { label: 'Brand', heading: 'Brand' },
      ['floatie', 'nordic', 'third'].map((id, index) => h(mobile.MobileOptionRow, { key: id, id: `brand-${id}`, selected: brand === id, count: [1182, 14, 3][index], onClick: () => { log.push(['brand', id]); setBrand(id); } }, id))),
    h(mobile.MobileOptionList, { label: 'Status', mode: 'multiple' },
      ['risk', 'late', 'ok'].map(id => h(mobile.MobileOptionRow, { key: id, selected: status.includes(id), onClick: () => toggle(id) }, id))));
}

test('option list: a single list is one tab stop, arrows move and choose, and the chosen row is the stop', async () => {
  const log = [];
  const view = await mount(h(FilterHarness, { log }));
  const radios = () => [...view.container.querySelectorAll('[role="radio"]')];
  assert.deepEqual(radios().map(radio => radio.getAttribute('tabindex')), ['-1', '0', '-1'], 'the chosen row is the one tab stop');
  radios()[1].focus();
  await key(radios()[1], 'ArrowDown');
  assert.deepEqual(log, [['brand', 'third']], 'the arrow chooses as it moves');
  is(document.activeElement, radios()[2], 'focus followed');
  assert.deepEqual(radios().map(radio => radio.getAttribute('aria-checked')), ['false', 'false', 'true']);
  assert.deepEqual(radios().map(radio => radio.getAttribute('tabindex')), ['-1', '-1', '0'], 'the tab stop moved with the choice');
  await key(radios()[2], 'ArrowDown');
  assert.deepEqual(log.at(-1), ['brand', 'floatie'], 'it wraps');
  await key(radios()[0], 'ArrowUp');
  assert.deepEqual(log.at(-1), ['brand', 'third'], 'and wraps the other way');
  const before = log.length;
  await key(radios()[2], 'Tab');
  assert.equal(log.length, before, 'other keys are left alone');
});

test('option list: a multiple list toggles each row on its own, and its rows keep their tab stops', async () => {
  const log = [];
  const view = await mount(h(FilterHarness, { log }));
  const toggles = () => [...view.container.querySelectorAll('[aria-pressed]')];
  assert.deepEqual(toggles().map(button => button.getAttribute('aria-pressed')), ['true', 'false', 'false']);
  assert.ok(toggles().every(button => button.getAttribute('tabindex') === null), 'every toggle is tabbable');
  await click(toggles()[1]);
  await click(toggles()[0]);
  assert.deepEqual(log, [['status', 'risk,late'], ['status', 'late']]);
  assert.deepEqual(toggles().map(button => button.getAttribute('aria-pressed')), ['false', 'true', 'false']);
  await key(toggles()[1], 'ArrowDown');
  assert.equal(log.length, 2, 'arrows only mean something in a radio group');
});

test('option list: a disabled row is skipped by the arrows and cannot be chosen', async () => {
  const log = [];
  const view = await mount(h(mobile.MobileOptionList, { label: 'Brand' },
    h(mobile.MobileOptionRow, { selected: true, onClick: () => log.push('a') }, 'A'),
    h(mobile.MobileOptionRow, { disabled: true, onClick: () => log.push('b') }, 'B'),
    h(mobile.MobileOptionRow, { onClick: () => log.push('c') }, 'C')));
  const radios = [...view.container.querySelectorAll('[role="radio"]')];
  await click(radios[1]);
  assert.deepEqual(log, []);
  await key(radios[0], 'ArrowDown');
  assert.deepEqual(log, ['c'], 'B is passed over');
});

test('tab bar: scrolled down, the compact item keeps its badge in the icon\'s box, apart from the label', async () => {
  const items = [
    { id: 'home', label: 'Home', href: '/', icon: icon('home') },
    { id: 'inbox', label: 'Inbox', href: '/inbox', icon: icon('inbox'), badge: 794, active: true },
  ];
  const view = await mount(h(mobile.MobileTabBar, { items, onSearch() {}, onMenu() {} }));
  assert.equal(view.container.querySelector('.curv-mobile-tabbar-label'), null, 'icons only while the bar is full');
  let scrollY = 0;
  const original = Object.getOwnPropertyDescriptor(window, 'scrollY');
  Object.defineProperty(window, 'scrollY', { configurable: true, get: () => scrollY });
  try {
    for (const y of [60, 140, 260]) {
      scrollY = y;
      await dispatch(window, new Event('scroll'));
      await settle(40);
    }
  } finally { if (original) Object.defineProperty(window, 'scrollY', original); else delete window.scrollY; }
  const compact = await waitFor(() => view.container.querySelector('.curv-mobile-tabbar-item[data-compact]'));
  assert.equal(compact.querySelector('.curv-mobile-tabbar-label').textContent, 'Inbox');
  const badge = compact.querySelector('.curv-mobile-tabbar-badge');
  assert.equal(badge.textContent, '99+');
  assert.equal(badge.parentElement.className, 'curv-mobile-tabbar-icon', 'in the icon\'s box, so it sits on the icon\'s corner');
  assert.equal(compact.querySelector('.curv-mobile-tabbar-label').querySelector('.curv-mobile-tabbar-badge'), null);
  assert.ok(compact.querySelector('.curv-mobile-nav-sr').textContent.includes('794'), 'the real count is still spoken');
});

test('chart: the selected bar\'s label shows, clear of the bars around it, and the peak and latest labels that would touch it give way', async () => {
  const weeks = [90, 120, 100, 150, 140, 160, 190, 80, 90, 110, 100, 130].map((value, index) => ({ label: `W${index + 1}`, value: value * 1000, display: `$${value}K` }));
  const view = await mount(h(mobile.MobileChart, { points: weeks, variant: 'bars', scrub: true, label: 'Revenue by week' }));
  const labels = () => [...view.container.querySelectorAll('.curv-mobile-chart-label')].map(label => label.textContent);
  assert.deepEqual(labels().sort(), ['$130K', '$190K'], 'resting: the peak and the latest');
  const input = view.container.querySelector('input[type="range"]');
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  await act(async () => { setValue.call(input, '5'); input.dispatchEvent(new Event('input', { bubbles: true })); });
  assert.ok(labels().includes('$160K'), 'the selected bar says its value in the plot');
  assert.ok(!labels().includes('$190K'), 'the peak is next to it, so it gives way rather than overprint');
  assert.ok(labels().includes('$130K'), 'the latest is far away and stays');
  const rects = [...view.container.querySelectorAll('rect')];
  const texts = [...view.container.querySelectorAll('.curv-mobile-chart-label')];
  const selected = texts.find(text => text.textContent === '$160K');
  const baseline = Number(selected.getAttribute('y'));
  const left = Number(selected.getAttribute('x')) - 5 * 0.58 * 11 / 2;
  for (const rect of rects.filter(rect => Number(rect.getAttribute('x')) + Number(rect.getAttribute('width')) > left && Number(rect.getAttribute('x')) < left + 5 * 0.58 * 11)) assert.ok(baseline < Number(rect.getAttribute('y')), 'above every bar under it');
});

test('chart: the selected bar\'s guide starts under its own label, and a lifted label that is not selected has a leader', async () => {
  // Thirty days of currency: wide labels, so the selected and the latest ones are lifted over taller neighbours.
  const days = Array.from({ length: 30 }, (_, index) => ({ label: `Oct ${index + 1}`, value: [41200, 38500, 52100, 47800, 45100, 39900, 44300, 49800, 51300, 46200][index % 10], display: `$${[41200, 38500, 52100, 47800, 45100, 39900, 44300, 49800, 51300, 46200][index % 10].toLocaleString('en-US')}` }));
  days[10] = { label: 'Oct 11', value: 68722, display: '$68,722' };
  days[28] = { label: 'Oct 29', value: 60000, display: '$60,000' };
  days[29] = { label: 'Oct 30', value: 30113, display: '$30,113' };
  const view = await mount(h(mobile.MobileChart, { points: days, variant: 'bars', scrub: true, label: 'Revenue by day' }));
  const guide = () => view.container.querySelector('svg > line[stroke-opacity="0.3"]:not(.curv-mobile-chart-leader)');
  const labelOf = text => [...view.container.querySelectorAll('.curv-mobile-chart-label')].find(node => node.textContent === text);
  const leaders = () => [...view.container.querySelectorAll('.curv-mobile-chart-leader')];
  assert.equal(guide(), null, 'no guide until a bar is selected');
  assert.equal(leaders().length, 1, 'the latest label is lifted over the 60,000 day, so it has its leader');
  const input = view.container.querySelector('input[type="range"]');
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  // Select the day before the latest: its label is lifted too (it is as wide as any other).
  await act(async () => { setValue.call(input, '27'); input.dispatchEvent(new Event('input', { bubbles: true })); });
  const selected = labelOf('$49,800');
  assert.ok(selected, 'the selected bar is labelled');
  const baseline = Number(selected.getAttribute('y'));
  const line = guide();
  assert.ok(line, 'the guide is drawn');
  assert.ok(Math.abs(Number(line.getAttribute('y1')) - (baseline + 3)) < 0.01, 'it starts under the label, not at the top of the plot where it would run through the text');
  assert.ok(Number(line.getAttribute('y1')) > baseline, 'below the text baseline');
  const selectedX = Number(line.getAttribute('x1'));
  assert.ok(leaders().every(leader => Math.abs(Number(leader.getAttribute('x1')) - selectedX) > 0.5), 'the selected bar has the guide, not a second leader');
});

// ── 0.3.3 ───────────────────────────────────────────────────────────────────

const setNativeValue = async (control, value) => {
  const prototype = control instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(control, value);
  await dispatch(control, new Event('input', { bubbles: true }));
};

// ── Filter sheet ────────────────────────────────────────────────────────────

function FilterSheetHarness({ log, startOn = false, withReset = true, showDisabled, showPending, closeLabel, keepOn = false }) {
  const [open, setOpen] = React.useState(true);
  const [brand, setBrand] = React.useState(startOn ? 'nordic' : null);
  return h(mobile.MobileFilterSheet, {
    open, title: 'Filter projects', closeLabel, showDisabled, showPending,
    onOpenChange: next => { log.push(['open', next]); setOpen(next); },
    onReset: withReset ? () => { log.push(['reset']); if (!keepOn) setBrand(null); } : undefined,
    resetVisible: brand !== null,
    showLabel: `Show ${brand ? 12 : 40} projects`,
    onShow: () => log.push(['show']),
  }, h(mobile.MobileOptionList, { label: 'Brand', heading: 'Brand' },
    ['floatie', 'nordic'].map(id => h(mobile.MobileOptionRow, { key: id, selected: brand === id, onClick: () => setBrand(id) }, id))));
}
const dialog = () => document.querySelector('[role="dialog"]');
const sheetFooterButton = () => document.querySelector('.curv-mobile-sheet-footer button');
const resetRow = () => document.querySelector('.curv-mobile-filter-reset');
const resetButton = () => document.querySelector('.curv-mobile-filter-reset button');

test('filter sheet: a titled sheet with the option lists, Reset at the top of the body and one primary button in the footer', async () => {
  await mount(h(FilterSheetHarness, { log: [], startOn: true }));
  await waitFor(dialog);
  assert.match(dialog().querySelector('.curv-mobile-sheet-heading').textContent, /Filter projects/);
  const body = dialog().querySelector('.curv-mobile-sheet-body');
  is(body.firstElementChild, resetRow(), 'Reset is the first thing in the body');
  assert.equal(resetButton().textContent, 'Reset');
  assert.ok(resetButton().classList.contains('curv-mobile-button-plain'), 'a plain MobileButton');
  assert.ok(body.querySelector('[role="radiogroup"][aria-label="Brand"]'), 'the option lists are the children');
  const footer = dialog().querySelector('.curv-mobile-sheet-footer');
  assert.equal(footer.querySelectorAll('button').length, 1, 'one footer button');
  assert.equal(sheetFooterButton().textContent, 'Show 12 projects');
  assert.ok(sheetFooterButton().classList.contains('curv-mobile-button-primary'));
  assert.ok(sheetFooterButton().classList.contains('curv-mobile-button-block'));
});

test('filter sheet: Reset\'s row is held while Reset is hidden, so the lists do not move when it appears or goes', async () => {
  await mount(h(FilterSheetHarness, { log: [] }));
  await waitFor(dialog);
  const row = resetRow();
  const body = dialog().querySelector('.curv-mobile-sheet-body');
  assert.ok(row, 'the row is there with no filter on');
  assert.equal(resetButton(), null, 'a hidden Reset is not drawn at all, so it is neither tabbable nor read');
  assert.equal(sheetFooterButton().textContent, 'Show 40 projects');
  const rows = [...body.querySelectorAll('.curv-mobile-option')];
  await click(rows[1]);
  assert.equal(sheetFooterButton().textContent, 'Show 12 projects', 'choices apply as tapped and the footer follows');
  assert.ok(resetButton(), 'Reset appears');
  is(resetRow(), row, 'in the row that was already there');
  is(body.firstElementChild, row);
  assert.deepEqual([...body.querySelectorAll('.curv-mobile-option')].map(option => option.textContent), rows.map(option => option.textContent));
  const none = [];
  await mount(h(FilterSheetHarness, { log: none, withReset: false }));
  await waitFor(() => document.querySelectorAll('[role="dialog"]').length === 2);
  assert.equal(document.querySelectorAll('.curv-mobile-filter-reset').length, 1, 'a sheet with no onReset has no row (only the first sheet\'s)');
});

test('filter sheet: Reset calls the app, the sheet stays open, and focus goes to the footer button when Reset hides itself', async () => {
  const log = [];
  await mount(h(FilterSheetHarness, { log, startOn: true }));
  await waitFor(dialog);
  resetButton().focus();
  is(document.activeElement, resetButton());
  await click(resetButton());
  assert.deepEqual(log, [['reset']], 'the app was told once and the sheet did not close');
  assert.ok(dialog(), 'still open');
  assert.equal(resetButton(), null);
  assert.equal(sheetFooterButton().textContent, 'Show 40 projects');
  is(document.activeElement, sheetFooterButton(), 'a keyboard user is not dropped to the page');
});

test('filter sheet: Reset does not move focus when it did not have it', async () => {
  const log = [];
  await mount(h(FilterSheetHarness, { log, startOn: true }));
  await waitFor(dialog);
  const option = document.querySelector('.curv-mobile-option');
  option.focus();
  await click(resetButton());
  assert.equal(log.length, 1);
  assert.ok(document.activeElement !== sheetFooterButton(), 'focus was not stolen');
});

test('filter sheet: the footer button tells the app, then closes the sheet; Escape closes without telling it', async () => {
  const log = [];
  await mount(h(FilterSheetHarness, { log, startOn: true, closeLabel: 'Lukk' }));
  await waitFor(dialog);
  assert.ok(dialog().querySelector('button[aria-label="Lukk"]'), 'the close control takes its name from closeLabel');
  await click(sheetFooterButton());
  assert.deepEqual(log, [['show'], ['open', false]]);
  await waitFor(() => !dialog());

  log.length = 0;
  await mount(h(FilterSheetHarness, { log }));
  await waitFor(dialog);
  await key(document.activeElement && document.activeElement !== document.body ? document.activeElement : dialog(), 'Escape');
  await waitFor(() => !dialog());
  assert.deepEqual(log, [['open', false]], 'dismissed, not shown');
});

test('filter sheet: showDisabled dims the footer button and it does nothing', async () => {
  const log = [];
  await mount(h(FilterSheetHarness, { log, showDisabled: true }));
  await waitFor(dialog);
  assert.equal(sheetFooterButton().disabled, true);
  await click(sheetFooterButton());
  assert.deepEqual(log, []);
  assert.ok(dialog());
});

test('filter sheet: when the footer button is disabled, Reset hands focus to the sheet\'s close control, after the commit that hides it', async () => {
  const log = [];
  await mount(h(FilterSheetHarness, { log, startOn: true, showDisabled: true }));
  await waitFor(dialog);
  assert.equal(sheetFooterButton().disabled, true);
  // The dialog moves focus into itself shortly after it opens (to its first control, the close button): let that finish, or it
  // would be what puts focus on the close button here, not the handoff.
  await settle(200);
  resetButton().focus();
  is(document.activeElement, resetButton());
  await click(resetButton());
  assert.deepEqual(log, [['reset']]);
  assert.equal(resetButton(), null, 'Reset is gone');
  assert.ok(document.activeElement !== document.body, 'focus did not fall to the page');
  is(document.activeElement, dialog().querySelector('.curv-mobile-sheet-heading button[aria-label="Close"]'));
});

test('filter sheet: focus stays on Reset when the app leaves it visible, and a later hide does not steal focus', async () => {
  const log = [];
  await mount(h(FilterSheetHarness, { log, startOn: true, keepOn: true }));
  await waitFor(dialog);
  resetButton().focus();
  await click(resetButton());
  assert.deepEqual(log, [['reset']]);
  is(document.activeElement, resetButton(), 'Reset is still there, so it keeps focus');
  // The flag was spent by that tap: a later change made elsewhere (a row, by pointer or keyboard) is not followed by a focus move.
  const rows = [...dialog().querySelectorAll('.curv-mobile-option')];
  rows[0].focus();
  await click(rows[0]);
  is(document.activeElement, rows[0]);
});

test('filter sheet: showPending makes the footer button busy and it ignores taps', async () => {
  const log = [];
  await mount(h(FilterSheetHarness, { log, showPending: true }));
  await waitFor(dialog);
  assert.equal(sheetFooterButton().getAttribute('aria-busy'), 'true');
  assert.equal(sheetFooterButton().textContent, 'Show 40 projects', 'the label stays');
  assert.equal(document.querySelector('.curv-mobile-sheet-footer [role="status"]').textContent, 'Working…');
  await click(sheetFooterButton());
  assert.deepEqual(log, []);
  assert.ok(dialog(), 'still open');
});

// ── Switch row ──────────────────────────────────────────────────────────────

function SwitchHarness({ log, disabled, onClick }) {
  const [on, setOn] = React.useState(false);
  return h(mobile.MobileSwitchRow, { label: 'Notify me', sub: 'When a milestone is late', checked: on, disabled, onClick, onCheckedChange: next => { log.push(next); setOn(next); } });
}

test('switch row: a tap anywhere on the row toggles it, and the state is the app\'s', async () => {
  const log = [];
  const view = await mount(h(SwitchHarness, { log }));
  const row = view.container.querySelector('[role="switch"]');
  assert.equal(row.getAttribute('aria-checked'), 'false');
  await click(row);
  assert.deepEqual(log, [true]);
  assert.equal(row.getAttribute('aria-checked'), 'true');
  await click(row.querySelector('.curv-mobile-switch'));
  await click(row.querySelector('.curv-mobile-switch-sub'));
  assert.deepEqual(log, [true, false, true], 'the switch itself, the sub-line and the row are one target');
  assert.equal(row.tagName, 'BUTTON', 'a real button, so Space and Enter work');
  assert.equal(row.getAttribute('type'), 'button');
});

test('switch row: a controlled row that the app does not update stays where it was', async () => {
  const log = [];
  const view = await mount(h(mobile.MobileSwitchRow, { label: 'Locked', checked: true, onCheckedChange: next => log.push(next) }));
  const row = view.container.querySelector('[role="switch"]');
  await click(row);
  assert.deepEqual(log, [false], 'it asks');
  assert.equal(row.getAttribute('aria-checked'), 'true', 'and does not decide');
});

test('switch row: disabled does nothing, and an onClick that prevents the default keeps the row from toggling', async () => {
  const log = [];
  const disabled = await mount(h(SwitchHarness, { log, disabled: true }));
  await click(disabled.container.querySelector('[role="switch"]'));
  assert.deepEqual(log, []);
  const clicks = [];
  const held = await mount(h(SwitchHarness, { log, onClick: event => { clicks.push('click'); event.preventDefault(); } }));
  await click(held.container.querySelector('[role="switch"]'));
  assert.deepEqual(clicks, ['click']);
  assert.deepEqual(log, [], 'the app\'s own handler saw it first and said no');
});

test('switch row: the label names the switch and the sub-line describes it', async () => {
  const view = await mount(h(SwitchHarness, { log: [] }));
  const row = view.container.querySelector('[role="switch"]');
  const named = id => document.getElementById(row.getAttribute(id)).textContent;
  assert.equal(named('aria-labelledby'), 'Notify me');
  assert.equal(named('aria-describedby'), 'When a milestone is late');
  assert.equal(row.querySelector('.curv-mobile-switch').getAttribute('aria-hidden'), 'true');
});

// ── Fields ──────────────────────────────────────────────────────────────────

test('text field: the ref and change events reach the input, and the label is its accessible label', async () => {
  const ref = React.createRef();
  const seen = [];
  const view = await mount(h(mobile.MobileTextField, { ref, label: 'Project name', hint: 'Shown in lists', onChange: event => seen.push(event.target.value) }));
  const input = view.container.querySelector('input');
  is(ref.current, input);
  assert.equal(view.container.querySelector('label').getAttribute('for'), input.id);
  await setNativeValue(input, 'Spring catalog');
  assert.deepEqual(seen, ['Spring catalog']);
  await view.render(h(mobile.MobileTextField, { ref, label: 'Project name', hint: 'Shown in lists', error: 'Enter a name', onChange() {} }));
  assert.equal(input.getAttribute('aria-invalid'), 'true');
  assert.equal(input.getAttribute('aria-describedby'), `${input.id}-hint ${input.id}-error`);
  assert.equal(view.container.querySelector('[role="alert"]').textContent, 'Enter a name');
  await view.render(h(mobile.MobileTextField, { ref, label: 'Project name', hint: 'Shown in lists', onChange() {} }));
  assert.equal(input.hasAttribute('aria-invalid'), false, 'fixed, so no longer invalid');
  assert.equal(input.getAttribute('aria-describedby'), `${input.id}-hint`);
});

test('text area: the ref and change events reach the textarea', async () => {
  const ref = React.createRef();
  const seen = [];
  const view = await mount(h(mobile.MobileTextArea, { ref, label: 'Note', onChange: event => seen.push(event.target.value) }));
  const area = view.container.querySelector('textarea');
  is(ref.current, area);
  await setNativeValue(area, 'Call the factory');
  assert.deepEqual(seen, ['Call the factory']);
});

function DateHarness({ log, controlled, inputRef }) {
  const [value, setValue] = React.useState('2026-10-22');
  const own = controlled ? { value, onChange: event => setValue(event.target.value) } : { defaultValue: '2026-10-22' };
  return h(mobile.MobileDateField, { ref: inputRef, label: 'Due date', ...own, onClear: () => { log.push('clear'); if (controlled) setValue(''); } });
}
const clearButton = container => container.querySelector('.curv-mobile-field-clear');

for (const controlled of [true, false]) {
  test(`date field (${controlled ? 'controlled' : 'uncontrolled'}): Clear shows while there is a value, empties it and tells the app; focus returns to the field only if the button had it`, async () => {
    const log = [];
    const ref = React.createRef();
    const view = await mount(h(DateHarness, { log, controlled, inputRef: ref }));
    const input = view.container.querySelector('input');
    is(ref.current, input, 'the ref reaches the input');
    assert.equal(input.type, 'date');
    assert.equal(input.value, '2026-10-22');
    const head = view.container.querySelector('.curv-mobile-field-head');
    assert.ok(clearButton(view.container), 'a value, so Clear');
    assert.equal(clearButton(view.container).getAttribute('aria-label'), 'Clear Due date');
    // A tap: iOS does not focus a tapped button, and focusing the date input afterwards would open the picker.
    await click(clearButton(view.container));
    assert.deepEqual(log, ['clear']);
    assert.equal(input.value, '');
    assert.equal(clearButton(view.container), null, 'no value, no Clear');
    is(view.container.querySelector('.curv-mobile-field-head'), head, 'the label row stays');
    assert.ok(document.activeElement !== input, 'a tap on Clear does not focus the input');
    await setNativeValue(input, '2026-11-01');
    assert.ok(clearButton(view.container), 'typing a date brings it back');
    // Keyboard or screen reader: the button had focus and is about to go, so focus goes to the field.
    clearButton(view.container).focus();
    is(document.activeElement, clearButton(view.container));
    await click(clearButton(view.container));
    assert.equal(input.value, '');
    is(document.activeElement, input, 'focus is where the button was, not on the page');
    await setNativeValue(input, '2026-11-02');
    await setNativeValue(input, '');
    assert.equal(clearButton(view.container), null, 'emptying it by hand takes it away');
  });
}

function FormHarness({ inputRef, defaultValue }) {
  return h('form', { id: 'f' }, h(mobile.MobileDateField, { ref: inputRef, label: 'Due date', defaultValue, onClear() {} }));
}

test('date field (uncontrolled): Clear follows the input\'s real value through a form reset', async () => {
  const view = await mount(h(FormHarness, { defaultValue: '2026-10-22' }));
  const input = view.container.querySelector('input');
  const form = view.container.querySelector('form');
  assert.ok(clearButton(view.container));
  await click(clearButton(view.container));
  assert.equal(input.value, '');
  assert.equal(clearButton(view.container), null);
  await act(async () => { form.reset(); await sleep(20); });
  assert.equal(input.value, '2026-10-22', 'the form put its value back');
  assert.ok(clearButton(view.container), 'so Clear is back');

  const typed = await mount(h(FormHarness, { defaultValue: '' }));
  const field = typed.container.querySelector('input');
  assert.equal(clearButton(typed.container), null);
  await setNativeValue(field, '2026-12-01');
  assert.ok(clearButton(typed.container));
  await act(async () => { typed.container.querySelector('form').reset(); await sleep(20); });
  assert.equal(field.value, '');
  assert.equal(clearButton(typed.container), null, 'a reset that empties the field takes Clear away');
});

test('date field (uncontrolled): a value written through the ref, as a form library does, shows Clear after the next render and at mount', async () => {
  const ref = React.createRef();
  const field = hint => h(mobile.MobileDateField, { ref, label: 'Due date', hint, onClear() {} });
  const view = await mount(field('a'));
  assert.equal(clearButton(view.container), null);
  ref.current.value = '2026-12-01';
  await view.render(field('b'));
  assert.ok(clearButton(view.container), 'seen on the next render');
  ref.current.value = '';
  await view.render(field('c'));
  assert.equal(clearButton(view.container), null);

  // A library's callback ref that fills the field when it registers it: seen at mount, and called once, not on every render.
  const seen = [];
  const register = element => { if (element) { seen.push(element); if (!element.value) element.value = '2026-01-15'; } };
  const registered = h(mobile.MobileDateField, { ref: register, label: 'Start', onClear() {}, hint: 'x' });
  const second = await mount(registered);
  assert.ok(clearButton(second.container), 'a value written at registration shows Clear with no event');
  await second.render(h(mobile.MobileDateField, { ref: register, label: 'Start', onClear() {}, hint: 'y' }));
  await second.render(h(mobile.MobileDateField, { ref: register, label: 'Start', onClear() {}, hint: 'z' }));
  assert.equal(seen.length, 1, 'one ref callback for the life of the field');
});

test('date field: without onClear there is no button even with a value', async () => {
  const view = await mount(h(mobile.MobileDateField, { label: 'Due date', defaultValue: '2026-10-22' }));
  assert.equal(clearButton(view.container), null);
  assert.equal(view.container.querySelector('.curv-mobile-field-head').hasAttribute('data-action'), false);
});

// ── Chip row slot, toolbar button, top bar action, counts ───────────────────

test('view chips: the trailing control is its own target and never selects a chip', async () => {
  const log = [];
  const view = await mount(h(mobile.MobileViewChips, {
    label: 'Views', items: [{ id: 'all', label: 'All', active: true }, { id: 'late', label: 'Late', count: '12+' }], onSelect: id => log.push(['select', id]),
    trailing: h(mobile.MobileToolbarButton, { label: 'Filter projects', count: 2, onClick: () => log.push(['filter']) }),
  }));
  const group = view.container.querySelector('[role="group"]');
  const button = view.container.querySelector('.curv-mobile-chips-trailing button');
  assert.ok(button && !group.contains(button), 'outside the scroller');
  await click(button);
  assert.deepEqual(log, [['filter']]);
  await click(group.querySelectorAll('button')[1]);
  assert.deepEqual(log, [['filter'], ['select', 'late']]);
  assert.match(group.textContent, /Late12\+/);
});

test('toolbar button: a click reaches the app, the ref reaches the button', async () => {
  const log = [];
  const ref = React.createRef();
  const view = await mount(h(mobile.MobileToolbarButton, { ref, label: 'Filter', count: 1, onClick: () => log.push('filter') }));
  const button = view.container.querySelector('button');
  is(ref.current, button);
  await click(button);
  assert.deepEqual(log, ['filter']);
});

test('top bar text action: a click reaches the app, the ref reaches the button', async () => {
  const log = [];
  const ref = React.createRef();
  const view = await mount(h(mobile.MobileTopBar, { title: 'Inbox', trailing: h(mobile.MobileTopBarTextAction, { ref, onClick: () => log.push('read') }, 'Mark all read') }));
  const button = view.container.querySelector('.curv-mobile-topbar-trailing button');
  is(ref.current, button);
  assert.equal(button.textContent, 'Mark all read');
  await click(button);
  assert.deepEqual(log, ['read']);
});

test('move sheet: a count can be a number with separators or a floor shown as given', async () => {
  await mount(h(mobile.MobileMoveSheet, {
    open: true, onOpenChange() {}, title: 'Move to…', onChoose() {},
    options: [{ id: 'a', label: 'Move to A', count: 1284 }, { id: 'b', label: 'Move to B', count: '12+' }, { id: 'c', label: 'Move to C', count: '' }],
  }));
  await waitFor(() => sheetRows().length);
  assert.match(sheetRow('Move to A').textContent, /1,284/);
  assert.match(sheetRow('Move to B').textContent, /12\+/);
  assert.ok(sheetRow('Move to C').querySelector('.curv-mobile-board-chip-count') === null, 'an empty string draws nothing');
});

// ── 0.3.4: scrubbing on the plot ────────────────────────────────────────────

const scrubPoints = Array.from({ length: 7 }, (_, i) => ({ label: `D${i + 1}`, value: [10, 14, 9, 20, 17, 12, 15][i] }));
/** happy-dom has no layout: give the plot a 260px-wide box, so one pixel is one unit of the chart's viewBox. */
const plotOf = container => {
  const svg = container.querySelector('svg[role="img"]');
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, right: 260, bottom: 108, width: 260, height: 108, x: 0, y: 0 });
  return svg;
};
const lineAt = index => 6 + index * (248 / 6);                        // seven points, drawn 6 in from each side
const barAt = (index, count) => 6 + (248 / count) * (index + 0.5);   // a bar sits in the middle of its band
const period = container => container.querySelector('.curv-mobile-chart-period')?.textContent ?? null;
const labelsOf = container => [...container.querySelectorAll('.curv-mobile-chart-label')].map(label => label.textContent);
const guideOf = container => container.querySelector('svg > line[stroke-opacity="0.3"]:not(.curv-mobile-chart-leader)');
const rangeOf = container => container.querySelector('input[type="range"]');

test('chart: a finger that moves sideways on the plot scrubs it, snapping to the period under it, and the pick stays when the finger lifts', async () => {
  const view = await mount(h(mobile.MobileChart, { points: scrubPoints, variant: 'line', label: 'Orders' }));
  const svg = plotOf(view.container);
  assert.equal(period(view.container), null);
  await pointer(svg, 'pointerdown', { clientX: lineAt(1), clientY: 50 });
  assert.equal(period(view.container), null, 'a finger that has not moved picks nothing: it may be about to scroll');
  await pointer(svg, 'pointermove', { clientX: lineAt(1) + 3, clientY: 51 });
  assert.equal(period(view.container), null, 'and a wobble inside the slop is still not a drag');
  await pointer(svg, 'pointermove', { clientX: lineAt(2) + 5, clientY: 52 });
  assert.equal(period(view.container), 'D3');
  await pointer(svg, 'pointermove', { clientX: lineAt(4) - 5, clientY: 52 });
  assert.equal(period(view.container), 'D5');
  assert.equal(labelsOf(view.container).filter(text => text === '17').length, 1, 'its value is drawn in the plot, once');
  await pointer(svg, 'pointerup', { clientX: lineAt(4) - 5, clientY: 52 });
  assert.equal(period(view.container), 'D5', 'lifting the finger leaves it picked, so it can be read');
  assert.ok(guideOf(view.container), 'with its guide');
});

test('chart: dragging snaps exactly as the hidden range input does, to the nearest period, and clamps at both ends', async () => {
  for (const variant of ['line', 'bars']) {
    const view = await mount(h(mobile.MobileChart, { points: scrubPoints, variant, scrub: true, label: 'Orders' }));
    const svg = plotOf(view.container);
    const where = index => (variant === 'line' ? lineAt(index) : barAt(index, 7));
    const gap = variant === 'line' ? 248 / 6 : 248 / 7;
    await pointer(svg, 'pointerdown', { clientX: where(0), clientY: 50, pointerType: 'mouse', button: 0 });
    for (let index = 0; index < 7; index += 1) {
      for (const [offset, expected] of [[-0.49, index], [0.49, index], [0.51, Math.min(6, index + 1)], [-0.51, Math.max(0, index - 1)]]) {
        await pointer(svg, 'pointermove', { clientX: where(index) + offset * gap, clientY: 50, pointerType: 'mouse' });
        assert.equal(period(view.container), `D${expected + 1}`, `${variant}: ${offset} of a step from ${index}`);
        // The same period through the range input.
        const input = rangeOf(view.container);
        assert.equal(input.getAttribute('aria-valuetext').split(':')[0], `D${expected + 1}`);
        assert.equal(input.value, String(expected));
      }
    }
    await pointer(svg, 'pointermove', { clientX: -80, clientY: 50, pointerType: 'mouse' });
    assert.equal(period(view.container), 'D1', `${variant}: past the left edge is the first period`);
    await pointer(svg, 'pointermove', { clientX: 900, clientY: 50, pointerType: 'mouse' });
    assert.equal(period(view.container), 'D7', `${variant}: past the right edge is the last period`);
    await pointer(svg, 'pointerup', { clientX: 900, clientY: 50, pointerType: 'mouse' });
  }
});

test('chart: a touch that moves up or down is the page scrolling and picks nothing; a tap picks, and a tap on the pick clears it', async () => {
  const view = await mount(h(mobile.MobileChart, { points: scrubPoints, variant: 'line', label: 'Orders' }));
  const svg = plotOf(view.container);
  // Mostly vertical: the browser scrolls and cancels the pointer. Nothing was picked on the way.
  await pointer(svg, 'pointerdown', { clientX: lineAt(3), clientY: 60 });
  await pointer(svg, 'pointermove', { clientX: lineAt(3) + 2, clientY: 85 });
  await pointer(svg, 'pointermove', { clientX: lineAt(5), clientY: 110 });
  await pointer(svg, 'pointercancel', { clientX: lineAt(5), clientY: 110 });
  assert.equal(period(view.container), null);
  // A tap picks the period under it.
  await pointer(svg, 'pointerdown', { clientX: lineAt(2) + 4, clientY: 60 });
  await pointer(svg, 'pointerup', { clientX: lineAt(2) + 4, clientY: 60 });
  assert.equal(period(view.container), 'D3');
  // Another one moves it; one on the pick puts the chart back to rest.
  await pointer(svg, 'pointerdown', { clientX: lineAt(5), clientY: 60 });
  await pointer(svg, 'pointerup', { clientX: lineAt(5), clientY: 60 });
  assert.equal(period(view.container), 'D6');
  await pointer(svg, 'pointerdown', { clientX: lineAt(5) - 4, clientY: 60 });
  await pointer(svg, 'pointerup', { clientX: lineAt(5) - 4, clientY: 60 });
  assert.equal(period(view.container), null);
  assert.equal(guideOf(view.container), null);
  // A drag that the browser cancels keeps what it had picked by then.
  await pointer(svg, 'pointerdown', { clientX: lineAt(1), clientY: 60 });
  await pointer(svg, 'pointermove', { clientX: lineAt(3), clientY: 61 });
  await pointer(svg, 'pointercancel', { clientX: lineAt(3), clientY: 61 });
  assert.equal(period(view.container), 'D4');
});

test('chart: a mouse picks on press and follows while it is down; hover and the right button do nothing', async () => {
  const view = await mount(h(mobile.MobileChart, { points: scrubPoints, variant: 'line', label: 'Orders' }));
  const svg = plotOf(view.container);
  const mouse = (type, clientX, init = {}) => pointer(svg, type, { clientX, clientY: 50, pointerType: 'mouse', ...init });
  await mouse('pointermove', lineAt(3));
  assert.equal(period(view.container), null, 'hover is not scrubbing');
  await mouse('pointerdown', lineAt(2), { button: 2 });
  assert.equal(period(view.container), null, 'neither is the right button');
  await mouse('pointerdown', lineAt(2), { button: 0 });
  assert.equal(period(view.container), 'D3', 'a press picks at once');
  await mouse('pointermove', lineAt(5));
  assert.equal(period(view.container), 'D6');
  await mouse('pointerup', lineAt(5));
  await mouse('pointermove', lineAt(0));
  assert.equal(period(view.container), 'D6', 'released: moving the mouse changes nothing');
  await mouse('pointerdown', lineAt(5), { button: 0 });
  await mouse('pointerup', lineAt(5));
  assert.equal(period(view.container), null, 'a click on the pick clears it');
});

test('chart: a pointer that is not the primary one, or arrives after the first has gone, is ignored', async () => {
  const view = await mount(h(mobile.MobileChart, { points: scrubPoints, variant: 'line', label: 'Orders' }));
  const svg = plotOf(view.container);
  await pointer(svg, 'pointerdown', { clientX: lineAt(2), clientY: 50, pointerType: 'mouse', button: 0, isPrimary: false });
  assert.equal(period(view.container), null);
  await pointer(svg, 'pointerdown', { clientX: lineAt(2), clientY: 50, pointerType: 'mouse', button: 0, pointerId: 7 });
  await pointer(svg, 'pointermove', { clientX: lineAt(4), clientY: 50, pointerType: 'mouse', pointerId: 8 });
  assert.equal(period(view.container), 'D3', 'another pointer id does not drag it');
  await pointer(svg, 'pointerup', { clientX: lineAt(4), clientY: 50, pointerType: 'mouse', pointerId: 8 });
  await pointer(svg, 'pointermove', { clientX: lineAt(5), clientY: 50, pointerType: 'mouse', pointerId: 7 });
  assert.equal(period(view.container), 'D6', 'the first one is still being tracked');
});

test('chart: the period is written under the guide and the value in the plot, once, never in a row under it; a line says its value above its dot', async () => {
  const weeks = [90, 120, 100, 150, 140, 160, 190, 80, 90, 110, 100, 130].map((value, index) => ({ label: `W${index + 1}`, value: value * 1000, display: `$${value}K` }));
  const bars = await mount(h(mobile.MobileChart, { points: weeks, variant: 'bars', scrub: true, label: 'Revenue by week' }));
  await pointer(plotOf(bars.container), 'pointerdown', { clientX: barAt(5, 12), clientY: 50, pointerType: 'mouse', button: 0 });
  assert.equal(period(bars.container), 'W6');
  assert.equal(labelsOf(bars.container).filter(text => text === '$160K').length, 1, 'the bar says its value, in the plot');
  assert.equal(bars.container.textContent.split('$160K').length - 1, 1, 'and nowhere else on the page');
  assert.equal(bars.container.querySelector('.curv-mobile-chart-readout'), null);
  assert.equal(bars.container.querySelector('[aria-live]'), null);

  const line = await mount(h(mobile.MobileChart, { points: scrubPoints, variant: 'line', label: 'Orders' }));
  const svg = plotOf(line.container);
  assert.deepEqual(labelsOf(line.container), ['15'], 'at rest: the latest value, beside its dot');
  await pointer(svg, 'pointerdown', { clientX: lineAt(3), clientY: 50, pointerType: 'mouse', button: 0 });
  assert.equal(period(line.container), 'D4');
  assert.deepEqual(labelsOf(line.container).sort(), ['15', '20']);
  const value = [...line.container.querySelectorAll('.curv-mobile-chart-label')].find(label => label.textContent === '20');
  const dot = [...line.container.querySelectorAll('circle.curv-mobile-chart-dot')].find(circle => Math.abs(Number(circle.getAttribute('cx')) - lineAt(3)) < 0.1);
  assert.ok(Number(value.getAttribute('y')) + 3 <= Number(dot.getAttribute('cy')) - 4, 'above the dot');
  assert.ok(Number(guideOf(line.container).getAttribute('y1')) >= Number(value.getAttribute('y')) + 3 - 0.01, 'the guide starts under that text, not through it');
});

test('chart: the period being read takes the place of the axis label it would touch', async () => {
  const view = await mount(h(mobile.MobileChart, { points: scrubPoints, variant: 'line', label: 'Orders' }));
  const svg = plotOf(view.container);
  const axis = () => [...view.container.querySelectorAll('.curv-mobile-chart-axis')].map(text => text.textContent);
  assert.deepEqual(axis(), ['D1', 'D7']);
  await pointer(svg, 'pointerdown', { clientX: lineAt(3), clientY: 50, pointerType: 'mouse', button: 0 });
  assert.deepEqual(axis(), ['D1', 'D7'], 'in the middle both ends stay');
  await pointer(svg, 'pointermove', { clientX: lineAt(0), clientY: 50, pointerType: 'mouse' });
  assert.deepEqual(axis(), ['D7'], 'on the first period it is the first label');
  await pointer(svg, 'pointermove', { clientX: lineAt(6), clientY: 50, pointerType: 'mouse' });
  assert.deepEqual(axis(), ['D1'], 'on the last it is the last');
  assert.equal(period(view.container), 'D7');
  // A long period ("Oct 22 so far") reaches further than the label it replaces, and takes the other end's too when it touches it.
  const long = await mount(h(mobile.MobileChart, { points: scrubPoints.map((point, index) => ({ ...point, label: `Week of Oct ${index + 1}` })), variant: 'line', label: 'Orders' }));
  const wide = plotOf(long.container);
  await pointer(wide, 'pointerdown', { clientX: lineAt(1), clientY: 50, pointerType: 'mouse', button: 0 });
  const ends = [...long.container.querySelectorAll('.curv-mobile-chart-axis')].map(text => text.textContent);
  assert.ok(!ends.includes('Week of Oct 1'), 'the first label is under the period that was picked next to it');
  assert.ok(ends.includes('Week of Oct 7'), 'the other end is clear of it');
});

test('chart: values drawn in the plot never overprint each other while a period is picked: the latest steps aside for the pick', async () => {
  // Wide values, so neighbours near the end would collide.
  const wide = scrubPoints.map(point => ({ ...point, display: `$${point.value * 1000 + 345}` }));
  const view = await mount(h(mobile.MobileChart, { points: wide, variant: 'line', label: 'Orders' }));
  const svg = plotOf(view.container);
  const boxes = () => [...view.container.querySelectorAll('.curv-mobile-chart-label')].map(text => {
    const width = text.textContent.length * 11 * 0.58;
    const x = Number(text.getAttribute('x'));
    const anchor = text.getAttribute('text-anchor');
    const y = Number(text.getAttribute('y'));
    return { text: text.textContent, left: anchor === 'start' ? x : anchor === 'end' ? x - width : x - width / 2, width, top: y - 9, bottom: y + 3 };
  });
  let stepped = 0;
  await pointer(svg, 'pointerdown', { clientX: lineAt(0), clientY: 50, pointerType: 'mouse', button: 0 });
  for (let index = 0; index < 7; index += 1) {
    await pointer(svg, 'pointermove', { clientX: lineAt(index), clientY: 50, pointerType: 'mouse' });
    const all = boxes();
    for (let a = 0; a < all.length; a += 1) for (let b = a + 1; b < all.length; b += 1) {
      const apart = all[a].left + all[a].width <= all[b].left || all[b].left + all[b].width <= all[a].left || all[a].bottom <= all[b].top || all[b].bottom <= all[a].top;
      assert.ok(apart, `picking D${index + 1}: ${all[a].text} and ${all[b].text} do not touch`);
    }
    if (index !== 6) assert.ok(all.some(box => box.text === wide[index].display), `picking D${index + 1}: its value is drawn`);
    if (index !== 6 && !all.some(box => box.text === wide[6].display)) stepped += 1;
  }
  assert.ok(stepped > 0, 'next to the latest point its value gives way to the one being read');
});

test('chart: the hidden range input is the keyboard\'s: it takes focus, arrows pick, Escape clears it first and only then goes on to close what the chart is in', async () => {
  const closed = [];
  const onKey = event => { if (event.key === 'Escape') closed.push('escape'); };
  document.addEventListener('keydown', onKey);
  try {
    const view = await mount(h(mobile.MobileChart, { points: scrubPoints, variant: 'line', label: 'Orders' }));
    const input = rangeOf(view.container);
    assert.equal(input.hidden, false);
    assert.notEqual(input.getAttribute('tabindex'), '-1', 'in the tab order');
    await act(async () => { input.focus(); });
    is(document.activeElement, input);
    await setNativeValue(input, '2');
    assert.equal(period(view.container), 'D3');
    assert.equal(input.getAttribute('aria-valuetext'), 'D3: 9');
    await key(input, 'Escape');
    assert.equal(period(view.container), null, 'cleared');
    assert.equal(input.getAttribute('aria-valuetext'), 'D7: 15', 'back to the latest');
    assert.deepEqual(closed, [], 'that Escape was the chart\'s');
    await key(input, 'Escape');
    assert.deepEqual(closed, ['escape'], 'with nothing picked, Escape goes on to whatever is around the chart');
  } finally { document.removeEventListener('keydown', onKey); }
});

test('chart: only a chart that scrubs listens to the plot', async () => {
  const still = await mount(h(mobile.MobileChart, { points: scrubPoints, variant: 'bars', label: 'Orders' }));
  const svg = plotOf(still.container);
  assert.equal(svg.getAttribute('data-scrub'), null);
  await pointer(svg, 'pointerdown', { clientX: barAt(2, 7), clientY: 50, pointerType: 'mouse', button: 0 });
  assert.equal(period(still.container), null);
  const future = await mount(h(mobile.MobileChart, { points: scrubPoints, variant: 'line', futureSlots: 20, scrub: true, label: 'Orders' }));
  const plot = plotOf(future.container);
  await pointer(plot, 'pointerdown', { clientX: 250, clientY: 50, pointerType: 'mouse', button: 0 });
  assert.equal(period(future.container), 'D7', 'the empty slots after the last period pick the last period, not a period that is not there');
});

// ── 0.3.4: the title switcher closes on the tap ─────────────────────────────

test('top bar: the page list closes on the tap and the tapped page is current at once, even when the app\'s link swallows onClick and the route is slow', async () => {
  const taps = [];
  // What a client-side route that has not landed looks like: the app's link handles the click itself and never calls ours.
  const renderLink = (item, props) => h('a', { href: props.href, className: props.className, 'aria-current': props['aria-current'], onClick: event => { event.preventDefault(); taps.push(item.id); } }, props.children);
  const three = [{ id: 'home', label: 'Home', href: '/development', active: true }, { id: 'board', label: 'Board', href: '/development/board' }, { id: 'sku', label: 'SKUs', href: '/development/skus' }];
  const bar = switcher => h(mobile.MobileTopBar, { title: 'Development', switcher, renderLink });
  const view = await mount(bar(three));
  const trigger = view.container.querySelector('.curv-mobile-topbar-switch');
  const list = view.container.querySelector('.curv-mobile-topbar-pages');
  const isOpen = () => trigger.getAttribute('aria-expanded') === 'true' && !list.hidden;
  const rows = () => [...list.querySelectorAll('li')];
  const current = () => rows().filter(row => row.querySelector('a').getAttribute('aria-current') === 'page').map(row => row.dataset.page);
  const checked = () => rows().filter(row => row.querySelector('svg')).map(row => row.dataset.page);
  const pending = () => rows().filter(row => row.dataset.pending === 'true').map(row => row.dataset.page);

  assert.deepEqual(current(), ['home']);
  await click(trigger);
  assert.equal(isOpen(), true);
  await click(list.querySelector('a[href="/development/board"]'));
  assert.deepEqual(taps, ['board'], 'the app\'s own handler still ran');
  assert.equal(isOpen(), false, 'closed on the tap');
  assert.deepEqual(current(), ['board'], 'the tapped page is current, and the old one is not');
  assert.deepEqual(checked(), ['board']);
  assert.deepEqual(pending(), ['board']);

  // Opened again before the route lands, it still shows where the person is going.
  await click(trigger);
  assert.equal(isOpen(), true);
  assert.deepEqual(current(), ['board']);

  // The route catches up: the app's own active page takes over, nothing is pending.
  await view.render(bar(three.map(page => ({ ...page, active: page.id === 'board' }))));
  assert.deepEqual(current(), ['board']);
  assert.deepEqual(pending(), []);

  // A click that opens somewhere else (command, control, shift, alt, or not the main button) closes the list but moves nothing.
  for (const init of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
    if (!isOpen()) await click(trigger);
    await click(list.querySelector('a[href="/development/skus"]'), init);
    assert.equal(isOpen(), false, `closed on ${JSON.stringify(init)}`);
    assert.deepEqual(current(), ['board'], `still on the page it is on after ${JSON.stringify(init)}`);
    assert.deepEqual(pending(), []);
  }

  // The page it is already on: closes, marks nothing.
  await click(trigger);
  await click(list.querySelector('a[href="/development/board"]'));
  assert.equal(isOpen(), false);
  assert.deepEqual(pending(), []);
  assert.deepEqual(current(), ['board']);
});

test('top bar: a link that forwards our onClick closes the list once, and a title without pages has no list to close', async () => {
  const view = await mount(h(mobile.MobileTopBar, { title: 'Development', switcher: pages }));
  const trigger = view.container.querySelector('.curv-mobile-topbar-switch');
  await click(trigger);
  await click(view.container.querySelector('.curv-mobile-topbar-pages a[href="/development/board"]'));
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  const plain = await mount(h(mobile.MobileTopBar, { title: 'Inbox' }));
  assert.equal(plain.container.querySelector('.curv-mobile-topbar-pages'), null);
});

// ── 0.3.4: the board's stage chip is placed instantly the first time ────────

test('board: the active stage chip is placed instantly when the board first appears, and slides smoothly on later changes', async () => {
  const calls = [];
  const original = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTo');
  Element.prototype.scrollTo = function scrollTo(options) { calls.push({ el: this, options }); };
  try {
    const view = await mount(h(mobile.MobileStageBoard, { label: 'Board', columns: boardColumns(before), activeColumnId: 'doing' }));
    const chipRow = () => view.container.querySelector('.curv-mobile-board-chips');
    const chipScrolls = () => calls.filter(call => call.el === chipRow()).map(call => call.options.behavior);
    assert.deepEqual(chipScrolls(), ['auto'], 'the first placement is instant: a chip that slides in after the page loads reads as a jump');
    await click(view.container.querySelector('.curv-mobile-board-chip[aria-label^="In production"]'));   // already active: nothing to move
    await click(view.container.querySelectorAll('.curv-mobile-board-chip')[2]);
    assert.equal(chipScrolls().at(-1), 'smooth', 'a later change slides');
    assert.ok(chipScrolls().slice(1).every(behavior => behavior === 'smooth'));
    // Remounting is a first appearance again.
    await view.render(null);
    calls.length = 0;
    const again = await mount(h(mobile.MobileStageBoard, { label: 'Board', columns: boardColumns(before), activeColumnId: 'done' }));
    assert.deepEqual(calls.filter(call => call.el === again.container.querySelector('.curv-mobile-board-chips')).map(call => call.options.behavior), ['auto']);
  } finally {
    if (original) Object.defineProperty(Element.prototype, 'scrollTo', original); else delete Element.prototype.scrollTo;
  }
});

// ── 0.3.4 audit: a period with no value, the comparison label, the period label ─

const gapPoints = [{ label: 'Wk 1', value: 40 }, { label: 'Wk 2', value: 55 }, { label: 'Wk 3', value: null }, { label: 'Wk 4', value: 30 }, { label: 'Wk 5', value: null, display: 'Not priced' }, { label: 'Wk 6', value: 60 }];
const pickByKeyboard = async (container, index) => setNativeValue(rangeOf(container), String(index));
const dotsOf = container => [...container.querySelectorAll('circle.curv-mobile-chart-dot')];

test('chart: picking a period with no value says so in the plot, with the app\'s words or a dash, on bars and on lines, from the plot or the keyboard', async () => {
  for (const variant of ['bars', 'line']) {
    const view = await mount(h(mobile.MobileChart, { points: gapPoints, variant, scrub: true, label: 'Spend' }));
    const svg = plotOf(view.container);
    const where = index => (variant === 'line' ? 6 + index * (248 / 5) : barAt(index, 6));
    const dotsAtRest = dotsOf(view.container).length;
    await pointer(svg, 'pointerdown', { clientX: where(2), clientY: 50, pointerType: 'mouse', button: 0 });
    assert.equal(period(view.container), 'Wk 3', variant);
    assert.ok(labelsOf(view.container).includes('—'), `${variant}: a dash for a period nothing is known for, not nothing`);
    assert.ok(guideOf(view.container), `${variant}: with its guide, so the period can be seen`);
    assert.equal(dotsOf(view.container).length, dotsAtRest, `${variant}: no dot for a value that is not there`);
    // The app's own words for it, from the keyboard this time.
    await pickByKeyboard(view.container, 4);
    assert.equal(period(view.container), 'Wk 5');
    assert.ok(labelsOf(view.container).includes('Not priced'), `${variant}: the display the app gave`);
    assert.equal(rangeOf(view.container).getAttribute('aria-valuetext'), 'Wk 5: Not priced');
    // Nothing is said twice.
    assert.equal(view.container.textContent.split('Not priced').length - 1, 1, `${variant}: once`);
  }
});

test('chart: a bar chart dims the other bars for the bar being read, and for a period with no bar it dims nothing', async () => {
  const view = await mount(h(mobile.MobileChart, { points: gapPoints, variant: 'bars', scrub: true, label: 'Spend' }));
  const fades = () => [...view.container.querySelectorAll('rect')].map(rect => rect.getAttribute('fill-opacity'));
  assert.deepEqual([...new Set(fades())], ['1'], 'at rest every bar is full');
  await pickByKeyboard(view.container, 1);
  assert.deepEqual(fades(), ['0.35', '1', '0.35', '0.35'], 'the bar being read stands out from the others');
  await pickByKeyboard(view.container, 2);
  assert.deepEqual([...new Set(fades())], ['1'], 'a period with no bar is not a bar to stand out from the rest: nothing is dimmed into a broken look');
  await pickByKeyboard(view.container, 3);
  assert.deepEqual(fades(), ['0.35', '0.35', '1', '0.35']);
});

test('chart: the dash or the words for a period with no value sit clear of every bar and every other label', async () => {
  const wide = [{ label: 'W1', value: 90 }, { label: 'W2', value: 120 }, { label: 'W3', value: null, display: 'Not priced yet' }, { label: 'W4', value: 150 }, { label: 'W5', value: 100 }];
  const view = await mount(h(mobile.MobileChart, { points: wide, variant: 'bars', scrub: true, label: 'Spend' }));
  await pickByKeyboard(view.container, 2);
  const text = [...view.container.querySelectorAll('.curv-mobile-chart-label')].find(label => label.textContent === 'Not priced yet');
  assert.ok(text, 'drawn');
  const width = text.textContent.length * 11 * 0.58;
  const left = Number(text.getAttribute('x')) - (text.getAttribute('text-anchor') === 'middle' ? width / 2 : 0);
  const baseline = Number(text.getAttribute('y'));
  for (const rect of view.container.querySelectorAll('rect')) {
    const x = Number(rect.getAttribute('x'));
    if (x + Number(rect.getAttribute('width')) > left && x < left + width) assert.ok(baseline < Number(rect.getAttribute('y')), 'above every bar it spans, never across one');
  }
  assert.ok(baseline <= 88 - 6 + 0.01, 'and above the baseline');
});

test('chart: a line puts the words for a period with no value in the middle of the plot, where its dot would be, clear of the line around it', async () => {
  const view = await mount(h(mobile.MobileChart, { points: gapPoints, variant: 'line', scrub: true, label: 'Spend' }));
  await pickByKeyboard(view.container, 4);
  const text = [...view.container.querySelectorAll('.curv-mobile-chart-label')].find(label => label.textContent === 'Not priced');
  const baseline = Number(text.getAttribute('y'));
  assert.ok(baseline > 20 && baseline < 88, `inside the plot: ${baseline}`);
  assert.ok(Math.abs(baseline - (20 + 34)) <= 10, `about the middle of it: ${baseline}`);
  assert.ok(Number(guideOf(view.container).getAttribute('y1')) >= baseline + 3 - 0.01, 'the guide starts under the words');
});

test('chart: a value that would have to step over the comparison line\'s label takes its place for as long as the period is read, and nothing overprints', async () => {
  // The comparison line is at the top of the plot, its label on the left; the values next to it are near the top too.
  const points = [100, 99, 98, 60, 40, 97].map((value, index) => ({ label: `D${index + 1}`, value }));
  const view = await mount(h(mobile.MobileChart, { points, variant: 'line', scrub: true, label: 'Orders', referenceLine: { value: 100, label: 'Last month avg' } }));
  const refLabel = () => view.container.querySelector('.curv-mobile-chart-ref-label');
  assert.ok(refLabel(), 'at rest the comparison is named');
  const refBox = () => { const text = refLabel(); const width = text.textContent.length * 10 * 0.58; const x = Number(text.getAttribute('x')); const y = Number(text.getAttribute('y')); return { left: x, right: x + width, top: y - 9, bottom: y + 3 }; };
  let hidden = 0;
  for (let index = 0; index < points.length; index += 1) {
    await pickByKeyboard(view.container, index);
    if (!refLabel()) hidden += 1;
    assert.ok(view.container.querySelector('line.curv-mobile-chart-ref'), 'the line itself stays');
    for (const label of view.container.querySelectorAll('.curv-mobile-chart-label')) {
      const width = label.textContent.length * 11 * 0.58;
      const x = Number(label.getAttribute('x'));
      const anchor = label.getAttribute('text-anchor');
      const box = { left: anchor === 'start' ? x : anchor === 'end' ? x - width : x - width / 2 };
      box.right = box.left + width; box.top = Number(label.getAttribute('y')) - 9; box.bottom = Number(label.getAttribute('y')) + 3;
      assert.ok(box.top >= 0, `D${index + 1}: the value stays in the plot (${box.top})`);
      if (refLabel()) {
        const ref = refBox();
        assert.ok(box.right <= ref.left || ref.right <= box.left || box.bottom <= ref.top || ref.bottom <= box.top, `D${index + 1}: ${label.textContent} does not print over ${refLabel().textContent}`);
      }
    }
  }
  assert.ok(hidden > 0, 'next to the line, the label stepped aside');
  assert.ok(hidden < points.length, 'but only where it had to');
  await pickByKeyboard(view.container, 4);
  assert.ok(refLabel(), 'a period that is nowhere near it leaves it');
});

test('chart: the period being read stays inside the plot, starts or ends where the axis label it replaces does, and keeps clear of the other one', async () => {
  const points = Array.from({ length: 7 }, (_, index) => ({ label: `Week of Oct ${index + 1}`, value: 10 + index, partial: index === 6 }));
  const view = await mount(h(mobile.MobileChart, { points, variant: 'line', label: 'Orders' }));
  const wide = (text, bold) => text.length * 10 * (bold ? 0.65 : 0.58);
  const anchoredAt = [];
  for (let index = 0; index < 7; index += 1) {
    await pickByKeyboard(view.container, index);
    const element = view.container.querySelector('.curv-mobile-chart-period');
    const text = element.textContent;
    const x = Number(element.getAttribute('x'));
    const anchor = element.getAttribute('text-anchor');
    const left = anchor === 'start' ? x : anchor === 'end' ? x - wide(text, true) : x - wide(text, true) / 2;
    const right = left + wide(text, true);
    assert.ok(left >= 6 - 0.01 && right <= 254 + 0.01, `${text}: ${left.toFixed(1)} to ${right.toFixed(1)} is inside the plot, 6 from each edge as the axis labels are`);
    for (const axis of view.container.querySelectorAll('.curv-mobile-chart-axis')) {
      const ax = Number(axis.getAttribute('x'));
      const from = axis.getAttribute('text-anchor') === 'end' ? ax - wide(axis.textContent) : ax;
      assert.ok(right <= from - 6 || left >= from + wide(axis.textContent) + 6, `${text} keeps 6px from ${axis.textContent}`);
    }
    anchoredAt.push([anchor, x]);
  }
  assert.deepEqual(anchoredAt[0], ['start', 6], 'on the first period it starts where the first axis label does');
  assert.deepEqual(anchoredAt[6], ['end', 254], 'on the last it ends where the last one does');
});

test('top bar: when the tap changes nothing (the page it is on, or a click that opens somewhere else) focus goes back to the title, not to the document', async () => {
  const renderLink = (item, props) => h('a', { href: props.href, className: props.className, 'aria-current': props['aria-current'], onClick: event => event.preventDefault() }, props.children);
  const view = await mount(h(mobile.MobileTopBar, { title: 'Development', switcher: pages, renderLink }));
  const trigger = view.container.querySelector('.curv-mobile-topbar-switch');
  const list = view.container.querySelector('.curv-mobile-topbar-pages');
  const tap = async (href, init) => {
    await click(trigger);
    const link = list.querySelector(`a[href="${href}"]`);
    await act(async () => { link.focus(); });
    is(document.activeElement, link);
    await click(link, init);
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  };
  await tap('/development');                                   // the page it is on
  is(document.activeElement, trigger, 'the current page');
  await tap('/development/board', { metaKey: true });          // opens in a new tab
  is(document.activeElement, trigger, 'a modified click');
  await tap('/development/board', { button: 1 });
  is(document.activeElement, trigger, 'the middle button');
  // A tap that goes somewhere leaves focus to the page that replaces this one.
  await tap('/development/board');
  assert.ok(document.activeElement !== trigger, 'a navigation is not given focus back');
});
