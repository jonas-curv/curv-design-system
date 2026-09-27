import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as home from '../dist/home.js';
const h = React.createElement;
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const css = read('home.css');
const imports = source => [...source.matchAll(/^(?:import|export)[^;]*?from\s+["']([^"']+)["']/gm)].map(m => m[1]);
const money = n => '$' + Math.round(n).toLocaleString('en-US');

test('home entry stands alone: React and its own client half, nothing else', () => {
 assert.deepEqual([...new Set(imports(read('dist/home.js')))].sort(), ['./home-client.js', 'react/jsx-runtime']);
 assert.deepEqual([...new Set(imports(read('dist/home-client.js')))].sort(), ['react', 'react/jsx-runtime']);
 assert.match(read('dist/home-client.js'), /^"use client";/);        // CountText and MonthClock render from a server page
 assert.doesNotMatch(read('dist/home.js'), /^"use client"/);          // row classes stay real strings on the server
 assert.doesNotMatch(read('dist/index.js'), /home-panel|home-day/);   // the desktop entry is untouched
});

test('package exports resolve to built files', async () => {
 const pkg = JSON.parse(read('package.json'));
 assert.equal(pkg.exports['./home'].import, './dist/home.js');
 assert.equal(pkg.exports['./home'].types, './dist/home.d.ts');
 assert.equal(pkg.exports['./home.css'], './home.css');
 assert.ok(pkg.files.includes('home.css'));
 for (const name of ['CountText', 'MonthClock', 'HomePanel', 'PanelLink', 'HomePanelNote']) assert.equal(typeof home[name], 'function', name);
 for (const name of ['HOME_ROW', 'HOME_FEED_ROW', 'HOME_ROW_HOVER', 'HOME_CHIP', 'HOME_ROW_ICON']) assert.equal(typeof home[name], 'string', name);
});

test('count text server-renders the final value, never the start of the count', () => {
 const html = renderToStaticMarkup(h(home.CountText, { value: 48213, format: money, delay: 0.08, className: 'home-score', style: { color: 'red' } }));
 assert.equal(html, '<span class="home-score" style="color:red">$48,213</span>');
 assert.doesNotMatch(html, /\$0/);
});

test('month clock names the day and draws one segment per day', () => {
 const html = renderToStaticMarkup(h(home.MonthClock, { day: 27, days: 30, month: 'September' }));
 assert.match(html, /<span class="home-month-name">September<\/span><span>Day 27 of 30<\/span>/);
 assert.match(html, /role="img" aria-label="Day 27 of 30"/);
 assert.equal((html.match(/class="home-day[ "]/g) || []).length, 30);
 assert.equal((html.match(/data-day="past"/g) || []).length, 26);
 assert.equal((html.match(/data-day="future"/g) || []).length, 3);
 assert.match(html, /class="home-day home-breathe" data-day="today"/);  // only today breathes
 assert.equal((html.match(/home-breathe/g) || []).length, 1);
 assert.doesNotMatch(html, /data-hot|home-day-tip/);                    // nothing is hot until the pointer arrives
});

test('panel: heading, count chip (zero included), meta, right slot, entrance stagger', () => {
 const right = h(home.PanelLink, { href: '/pto' }, 'All requests');
 const html = renderToStaticMarkup(h(home.HomePanel, { title: 'Requests', count: 0, meta: 'this year', right, delayMs: 240 }, h('a', { href: '/pto/1', className: `${home.HOME_FEED_ROW} ${home.HOME_ROW_HOVER}` }, 'Vacation')));
 assert.match(html, /^<section class="home-panel home-enter-up" style="animation-delay:240ms">/);
 assert.match(html, /<h2 class="home-panel-title"><span class="home-panel-title-text">Requests<\/span><span class="home-panel-count">0<\/span><span class="home-panel-meta">this year<\/span><\/h2>/);
 assert.match(html, /<div class="home-panel-right"><a href="\/pto" class="home-panel-link">All requests<svg[^>]*aria-hidden="true"/);
 assert.match(html, /<div class="home-panel-body"><a href="\/pto\/1" class="home-feed-row home-row-hover">Vacation<\/a><\/div>/);
});

test('panel: no count chip for null, feed hairline and entrance can be switched', () => {
 const html = renderToStaticMarkup(h(home.HomePanel, { title: h('span', null, 'Inbox'), count: null, feed: true, entrance: false, label: 'Inbox' }, 'rows'));
 assert.match(html, /^<section aria-label="Inbox" class="home-panel" data-feed="">/);
 assert.doesNotMatch(html, /home-panel-count|home-enter-up|animation-delay|home-panel-right/);
});

test('panel link takes the app router link and passes its props through', () => {
 const RouterLink = ({ href, children, ...rest }) => h('a', { href, 'data-router': '', ...rest }, children);
 const html = renderToStaticMarkup(h(home.PanelLink, { href: '/flow/rocks', as: RouterLink, 'aria-label': 'Check in on Rocks' }, 'Check in'));
 assert.match(html, /^<a href="\/flow\/rocks" data-router="" class="home-panel-link" aria-label="Check in on Rocks">Check in<svg/);
});

test('panel note: quiet by default, ruled with an action when asked', () => {
 assert.equal(renderToStaticMarkup(h(home.HomePanelNote, null, 'Nothing requested this year.')), '<div class="home-panel-note"><p>Nothing requested this year.</p></div>');
 const ruled = renderToStaticMarkup(h(home.HomePanelNote, { ruled: true, action: h('a', { href: '/login' }, 'Sign in') }, 'Signed out of Flow.'));
 assert.match(ruled, /^<div class="home-panel-note" data-ruled=""><p>Signed out of Flow\.<\/p><a href="\/login">Sign in<\/a><\/div>$/);
});

test('every class the kit emits is styled in home.css', () => {
 const emitted = new Set(['home-pulse-surface', 'home-score', 'home-score-gradient', 'home-bar-gain', 'home-bar-booked', 'home-ghost-col', 'home-needed-line', 'home-progress-fill', 'home-tile', 'home-enter-up', 'home-enter-rise', 'home-enter-sweep', 'home-breathe']);
 for (const source of [read('dist/home.js'), read('dist/home-client.js')]) for (const m of source.matchAll(/"(home-[a-z-]+)/g)) emitted.add(m[1]);
 for (const name of ['HOME_ROW', 'HOME_FEED_ROW', 'HOME_ROW_HOVER', 'HOME_CHIP', 'HOME_ROW_ICON']) emitted.add(home[name]);
 emitted.delete('home-client');
 for (const name of emitted) assert.match(css, new RegExp(`\\.${name}[\\s,:{>\\[.]`), `.${name} is missing from home.css`);
});

test('home.css: private aliases are all defined, public tokens have values, motion stops when reduced', () => {
 const used = new Set([...css.matchAll(/var\((--_home-[a-z0-9-]+)/g)].map(m => m[1]));
 for (const name of used) assert.match(css, new RegExp(`${name}:`), `${name} is used but never defined`);
 for (const token of ['--home-signal', '--home-signal-soft', '--home-signal-ink', '--home-pulse-ink', '--home-pulse-line', '--home-pulse-track', '--home-pulse-tooltip']) assert.match(css, new RegExp(`${token}: `), token);
 assert.match(css, /:where\(:root\)/);                                   // zero specificity: any app :root wins
 const reduced = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
 for (const name of ['home-enter-up', 'home-enter-rise', 'home-enter-sweep', 'home-breathe', 'home-tile:hover', 'home-day']) assert.ok(reduced.includes(`.${name}`), name);
 assert.doesNotMatch(css, /@apply|@theme|@layer/);                       // no Tailwind dependency
});
