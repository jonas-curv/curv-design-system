// Readability floor for the theme tokens (WCAG AA): every ink used as body
// text clears 4.5:1 on the surfaces it is painted on, meaningful graphics and
// the focus border clear 3:1, in both themes. Guards the 2026-10-30 audit (first
// enforced in Customs OS) at the source, so a palette tweak cannot quietly drop
// below the floor again in any app.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../theme.css', import.meta.url), 'utf8');

function block(selector) {
  const start = css.indexOf(`\n${selector} {`);
  assert.ok(start >= 0, `${selector} block present`);
  const body = css.slice(start, css.indexOf('\n}', start));
  const vars = {};
  for (const m of body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  return vars;
}
function parse(value) {
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) return { rgb: [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)), alpha: 1 };
  const rgba = value.match(/^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)$/);
  assert.ok(rgba, `parsable colour: ${value}`);
  return { rgb: [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])], alpha: rgba[4] === undefined ? 1 : Number(rgba[4]) };
}
const over = (fg, alpha, bg) => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha));
const lin = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
function ratio(fg, bg) {
  const a = lum(fg);
  const b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const ROOT = block(':root');
for (const [theme, selector] of [['light', ':root'], ['dark', '.dark']]) {
  // The top bar is deliberately the same in both themes, so .dark omits it.
  const t = { ...ROOT, ...block(selector) };
  const solid = (name, on) => {
    assert.ok(t[name], `${theme}: --${name} defined`);
    const { rgb, alpha } = parse(t[name]);
    return alpha === 1 ? rgb : over(rgb, alpha, on ?? solid('card'));
  };
  const expect = (label, fg, bg, min) => {
    const r = ratio(fg, bg);
    assert.ok(r >= min, `${theme}: ${label} is ${r.toFixed(2)}:1, floor ${min}:1`);
  };

  test(`${theme}: text inks clear 4.5:1 on canvas, card and fills`, () => {
    for (const surface of ['background', 'card', 'popover', 'muted', 'sidebar', 'secondary']) {
      expect(`foreground on ${surface}`, solid('foreground'), solid(surface), 4.5);
      expect(`muted-foreground on ${surface}`, solid('muted-foreground'), solid(surface), 4.5);
      // --text-2 is the same secondary ink under its ink-system name.
      expect(`text-2 on ${surface}`, solid('text-2'), solid(surface), 4.5);
    }
    for (const surface of ['background', 'card']) {
      expect(`text-3 on ${surface}`, solid('text-3'), solid(surface), 4.5);
      expect(`verdict-green on ${surface}`, solid('verdict-green'), solid(surface), 4.5);
      expect(`verdict-amber on ${surface}`, solid('verdict-amber'), solid(surface), 4.5);
      expect(`verdict-red on ${surface}`, solid('verdict-red'), solid(surface), 4.5);
      expect(`destructive on ${surface}`, solid('destructive'), solid(surface), 4.5);
      expect(`chart on ${surface}`, solid('chart'), solid(surface), 4.5);
    }
    expect('verdict-green on its soft fill', solid('verdict-green'), solid('verdict-green-soft'), 4.5);
    expect('verdict-amber on its soft fill', solid('verdict-amber'), solid('verdict-amber-soft'), 4.5);
    expect('verdict-red on its soft fill', solid('verdict-red'), solid('verdict-red-soft'), 4.5);
    expect('primary-foreground on primary', solid('primary-foreground'), solid('primary'), 4.5);
    expect('topbar-foreground on topbar', solid('topbar-foreground'), solid('topbar'), 4.5);
  });

  test(`${theme}: graphics and the focus border clear 3:1 on a card`, () => {
    for (const name of ['verdict-green', 'verdict-amber', 'verdict-red', 'chart', 'muted-foreground']) {
      expect(`${name} dot on card`, solid(name), solid('card'), 3);
    }
    expect('focus border (ring) on card', solid('ring'), solid('card'), 3);
    expect('sidebar focus border on sidebar', solid('sidebar-ring', solid('sidebar')), solid('sidebar'), 3);
  });
}
