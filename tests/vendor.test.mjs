// scripts/vendor.sh: the one script that vendors the whole package into an app (0.5.0).
// The full run needs a committed tree and a build, so it is read here; --check runs for real on a scratch vendor dir.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = path => readFileSync(join(root, path), 'utf8');
const script = read('scripts/vendor.sh');

test('npm run vendor is the whole package; the mobile-only script stays as vendor:mobile', () => {
  const { scripts } = JSON.parse(read('package.json'));
  assert.equal(scripts.vendor, 'bash scripts/vendor.sh');
  assert.equal(scripts['vendor:mobile'], 'bash scripts/vendor-payload.sh');
});

test('vendor.sh ships everything package.json "files" lists, a trimmed package.json and source.json, and verifies it', () => {
  assert.match(script, /require\('\.\/package\.json'\)\.files/, 'the payload is package.json "files", not a hand-kept list');
  assert.match(script, /const \{ scripts, devDependencies, publishConfig, \.\.\.vendored \} = pkg/, 'no prepare script runs in the app');
  assert.match(script, /source\.json/);
  for (const field of ['name:', 'version:', 'sourceCommit:', 'entrypoints:', 'sha256']) assert.ok(script.includes(field), field);
  assert.match(script, /git diff --quiet HEAD/, 'refuses a dirty tree: source.json names HEAD');
  assert.match(script, /git ls-files --others --exclude-standard/, 'and untracked sources');
  assert.match(script, /! -name node_modules ! -name \.gitignore/, "the app's install and ignore file stay");
  assert.match(script, /npm run build/);
  assert.match(script, /verify "\$V"/, 're-hashes what landed');
  assert.doesNotMatch(script, /^\s*(mapfile|readarray|declare -A)\b/m, 'runs on the bash 3.2 macOS ships');
  const files = JSON.parse(read('package.json')).files;
  for (const entry of ['dist', 'theme.css', 'eslint', 'skills', 'agents', 'docs', 'mobile.css', 'home.css', 'morph.css']) assert.ok(files.includes(entry), entry);
});

test('vendor.sh --check passes an untouched copy and names every drifted file', () => {
  const app = mkdtempSync(join(tmpdir(), 'curv-vendor-'));
  try {
    const dir = join(app, 'vendor', 'curv-design-system');
    mkdirSync(join(dir, 'dist'), { recursive: true });
    mkdirSync(join(dir, 'node_modules', 'x'), { recursive: true });
    const files = { 'dist/index.js': 'export {};\n', 'theme.css': ':root{}\n', 'package.json': '{}\n' };
    for (const [path, body] of Object.entries(files)) writeFileSync(join(dir, path), body);
    writeFileSync(join(dir, 'node_modules', 'x', 'index.js'), 'ignored');
    writeFileSync(join(dir, '.gitignore'), '/node_modules/\n');
    const sha256 = Object.fromEntries(Object.entries(files).map(([path, body]) => [path, createHash('sha256').update(body).digest('hex')]));
    writeFileSync(join(dir, 'source.json'), JSON.stringify({ name: '@curvgroup/design-system', version: '0.5.0', sourceCommit: 'a'.repeat(40), sha256 }));
    const check = () => spawnSync('bash', [join(root, 'scripts/vendor.sh'), '--check', app], { encoding: 'utf8' });

    let run = check();
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /0\.5\.0 \(aaaaaaaaaaaa\): 3 files match source\.json/);

    writeFileSync(join(dir, 'theme.css'), ':root{--background:red}\n');
    writeFileSync(join(dir, 'dist', 'extra.js'), '');
    rmSync(join(dir, 'dist', 'index.js'));
    run = check();
    assert.equal(run.status, 1);
    assert.match(run.stderr, /changed {2}theme\.css/);
    assert.match(run.stderr, /extra {4}dist\/extra\.js/);
    assert.match(run.stderr, /missing {2}dist\/index\.js/);
  } finally {
    rmSync(app, { recursive: true, force: true });
  }
});
