// scripts/lint-changed.mjs — `npm run lint:changed`
//
// Lints only the files this branch changed (committed, staged, unstaged and
// new untracked files, compared with where it left origin/main), for quick
// checks while iterating. The full `npm run lint` is still the ship check.
// Extra args pass through to eslint, e.g. `npm run lint:changed -- --fix`.

import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LINTABLE = /\.(c|m)?[jt]sx?$/;

function git(...args) {
  return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" }).trim();
}

function mergeBase() {
  for (const ref of ["origin/main", "main"]) {
    try {
      return git("merge-base", "HEAD", ref);
    } catch {
      // ref missing: try the next one
    }
  }
  return "HEAD";
}

const base = mergeBase();
const changed = [
  ...git("diff", "--name-only", "--diff-filter=d", base).split("\n"),
  ...git("ls-files", "--others", "--exclude-standard").split("\n"),
];
const files = [...new Set(changed)].filter(
  (f) => f && LINTABLE.test(f) && existsSync(join(REPO_ROOT, f)),
);

if (files.length === 0) {
  console.log("lint:changed: no changed JS/TS files to lint.");
  process.exit(0);
}

console.log(`lint:changed: linting ${files.length} changed file(s).`);

const eslintBin = join(REPO_ROOT, "node_modules/eslint/bin/eslint.js");
const child = spawn(
  process.execPath,
  [
    eslintBin,
    "--cache",
    "--cache-location",
    ".eslintcache",
    "--cache-strategy",
    "content",
    "--no-warn-ignored",
    ...process.argv.slice(2),
    "--",
    ...files,
  ],
  { cwd: REPO_ROOT, stdio: "inherit" },
);
child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 1)));
