// StatCard's breakdown card in a real (happy-dom) DOM, built from dist/: hover
// opens it after a short rest, and keyboard focus opens it too (Escape and
// moving focus away close it), so the breakdown is not mouse-only.
import './dom-setup.mjs';
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { createRoot } from 'react-dom/client';
import * as ds from '../dist/index.js';

const h = React.createElement;
const { act } = React;

const mounted = [];
async function mount(node) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => { root.render(node); });
  mounted.push(root);
  return container;
}
afterEach(async () => {
  for (const root of mounted.splice(0)) await act(async () => { root.unmount(); });
  document.body.innerHTML = '';
});

const wait = (ms) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));
const breakdownShown = () => document.body.textContent.includes('Brand A');
const focus = async (el) => { await act(async () => { el.focus(); }); await wait(0); };
const blur = async (el) => { await act(async () => { el.blur(); }); await wait(0); };
const key = async (el, name) => {
  await act(async () => { el.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true })); });
  await wait(0);
};
const fire = async (el, type) => { await act(async () => { el.dispatchEvent(new MouseEvent(type, { bubbles: true })); }); };

const breakdown = h(ds.BreakdownRow, { label: 'Brand A', value: '$1.2M' });
const card = (props = {}) => h(ds.StatCard, { label: 'Revenue', value: '$2.4M', breakdown, ...props });

test('without a link, the stat itself is a named tab stop; focus opens the breakdown, blur closes it', async () => {
  const container = await mount(card());
  const stat = container.firstElementChild;
  assert.equal(stat.getAttribute('tabindex'), '0');
  assert.equal(stat.getAttribute('role'), 'group');
  assert.equal(stat.getAttribute('aria-label'), 'Revenue');
  assert.match(stat.className, /focus-visible:ring-ring/);
  assert.equal(breakdownShown(), false);
  await focus(stat);
  assert.equal(breakdownShown(), true, 'opens at once on focus');
  assert.ok(stat.contains(document.activeElement), 'focus stays on the stat, not pulled into the card');
  await blur(stat);
  await wait(250);
  assert.equal(breakdownShown(), false, 'closes when focus leaves');
});

test('Escape closes the breakdown and leaves focus where it was', async () => {
  const container = await mount(card());
  const stat = container.firstElementChild;
  await focus(stat);
  assert.equal(breakdownShown(), true);
  await key(stat, 'Escape');
  await wait(250);
  assert.equal(breakdownShown(), false);
  assert.equal(document.activeElement, stat);
  await fire(stat, 'mouseout');
  await wait(250);
  assert.equal(breakdownShown(), false, 'the pointer leaving does not reopen it while focus stays');
});

test('with a link, focusing the link opens the breakdown; the stat adds no tab stop of its own', async () => {
  const container = await mount(card({ href: '/reports/revenue' }));
  const stat = container.firstElementChild;
  assert.equal(stat.getAttribute('tabindex'), null);
  const link = stat.querySelector('a');
  assert.match(link.className, /focus-visible:ring-ring/);
  await focus(link);
  assert.equal(breakdownShown(), true);
  await blur(link);
  await wait(250);
  assert.equal(breakdownShown(), false);
});

test('hover still opens it after a short rest, and focus keeps it open after the pointer leaves', async () => {
  const container = await mount(card());
  const stat = container.firstElementChild;
  await fire(stat, 'mouseover');
  await wait(50);
  assert.equal(breakdownShown(), false, 'not before the rest');
  await wait(200);
  assert.equal(breakdownShown(), true);
  await focus(stat);
  await fire(stat, 'mouseout');
  await wait(250);
  assert.equal(breakdownShown(), true, 'still focused');
  await blur(stat);
  await wait(250);
  assert.equal(breakdownShown(), false);
});

test('a stat without a breakdown is not a tab stop', async () => {
  const container = await mount(h(ds.StatCard, { label: 'Revenue', value: '$2.4M' }));
  const stat = container.firstElementChild;
  assert.equal(stat.getAttribute('tabindex'), null);
  assert.equal(stat.getAttribute('role'), null);
});
