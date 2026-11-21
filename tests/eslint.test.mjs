// The shared lint guards (eslint/): the rules added in 0.5.0 and the three presets an app can pick.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from 'eslint';
import curv, { strict, migration, recommended } from '../eslint/index.js';

const lint = (code, config = strict) => new Linter({ configType: 'flat' }).verify(code, config, { filename: 'page.tsx' });
const rules = messages => messages.map(m => m.ruleId);
const jsx = className => `export const A = () => <div className={${JSON.stringify(className)}} />;`;

test('no-arbitrary-text-size: every px or rem size is reported with the token it folds to', () => {
  const cases = [
    ['text-[32px]', 'text-display'],
    ['text-[24px]', 'text-figure'],
    ['text-[26px]', 'text-figure'],
    ['text-[28px]', 'text-display'],
    ['text-[22px]', 'text-figure'],
    ['text-[20px]', 'text-title'],
    ['text-[18px]', 'text-title'],
    ['text-[17px]', 'text-section'],
    ['text-[16px]', 'text-section'],
    ['text-[15px]', 'text-section'],
    ['text-[14.5px]', 'text-section'],
    ['text-[0.9375rem]', 'text-section'],
    ['text-[14px]', 'text-body'],
    ['text-[13px]', 'text-body'],
    ['text-[12.5px]', 'text-body'],
    ['text-[12px]', 'text-caption'],
    ['text-[11.5px]', 'text-caption'],
    ['text-[11px]', 'text-micro'],
    ['text-[10px]', 'text-micro'],
    ['text-[9px]', 'text-micro'],
    ['text-[0.8125rem]', 'text-body'],
    ['sm:text-[13px]', 'text-body'],
    ['[&>span]:text-[12px]', 'text-caption'],
    ['text-[length:13px]', 'text-body'],
    ['!text-[13px]', 'text-body'],
  ];
  for (const [token, suggestion] of cases) {
    const messages = lint(jsx(`flex ${token}`));
    assert.deepEqual(rules(messages), ['curv/no-arbitrary-text-size'], token);
    assert.match(messages[0].message, new RegExp(`"${token.replace(/[[\]!&>.]/g, '\\$&')}": use ${suggestion}\\.`), token);
  }
});

test('no-arbitrary-text-size leaves the tokens, relative sizes and colours alone', () => {
  for (const ok of ['text-body', 'text-caption font-medium', 'text-[0.55em]', 'text-foreground', 'text-[var(--x)]', 'text-xl', 'text-white/60']) {
    assert.deepEqual(rules(lint(jsx(ok))), [], ok);
  }
});

test('no-wide-tracking: tracking-wide and positive arbitrary tracking; tight tracking is fine', () => {
  for (const bad of ['tracking-wide', 'md:tracking-wide', 'tracking-[0.06em]', 'tracking-[.05em]', 'tracking-[1px]']) {
    assert.deepEqual(rules(lint(jsx(bad))), ['curv/no-wide-tracking'], bad);
  }
  for (const ok of ['tracking-tight', 'tracking-[-0.02em]', 'tracking-normal', 'tracking-[0em]']) {
    assert.deepEqual(rules(lint(jsx(ok))), [], ok);
  }
});

test('the older guards still fire: uppercase, tracking-wider, raw hex, palette colours', () => {
  assert.deepEqual(rules(lint(jsx('uppercase'))), ['curv/no-uppercase-utility']);
  assert.deepEqual(rules(lint(jsx('tracking-wider'))), ['curv/no-uppercase-utility']);
  assert.deepEqual(rules(lint(jsx('bg-[#ff0000]'))), ['curv/no-raw-hex']);
  assert.deepEqual(rules(lint(jsx('bg-[#1b1b1b]'))), [], 'the top-bar chrome stays sanctioned');
  assert.deepEqual(rules(lint(jsx('bg-neutral-100'))), ['curv/no-palette-utility']);
  // Inside cn(), conditionals and template literals too.
  assert.deepEqual(
    rules(lint('const cn = (...a) => a.join(" "); export const A = ({ on }) => <div className={cn("p-2", on && "text-[13px]", `uppercase`)} />;')),
    ['curv/no-arbitrary-text-size', 'curv/no-uppercase-utility'],
  );
});

test('presets: default keeps the older rules as errors and starts the new ones as warnings; strict errors; migration warns', () => {
  assert.equal(curv, recommended, 'the default export is the recommended preset');
  const code = jsx('uppercase text-[13px] tracking-wide');
  const severity = config => Object.fromEntries(lint(code, config).map(m => [m.ruleId, m.severity]));
  assert.deepEqual(severity(curv), { 'curv/no-uppercase-utility': 2, 'curv/no-arbitrary-text-size': 1, 'curv/no-wide-tracking': 1 });
  assert.deepEqual(severity(strict), { 'curv/no-uppercase-utility': 2, 'curv/no-arbitrary-text-size': 2, 'curv/no-wide-tracking': 2 });
  assert.deepEqual(severity(migration), { 'curv/no-uppercase-utility': 1, 'curv/no-arbitrary-text-size': 1, 'curv/no-wide-tracking': 1 });
  for (const config of [curv, strict, migration]) {
    assert.deepEqual(Object.keys(config[0].rules).sort(), ['curv/no-arbitrary-text-size', 'curv/no-palette-utility', 'curv/no-raw-hex', 'curv/no-uppercase-utility', 'curv/no-wide-tracking']);
  }
});
